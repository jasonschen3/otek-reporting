import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Projects() {
  let ip = "http://localhost:3000";
  const [projects, setProjects] = useState([]);
  const [editProject, setEditProject] = useState(null);
  const [displayingMessage, setDisplayingMessage] = useState("Ongoing");
  const [entriesStatus, setEntriesStatus] = useState({});
  const [expensesStatus, setExpensesStatus] = useState({});
  const [missingLogs, setMissingLogs] = useState({}); // Added state for missing logs

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.isAuthenticated) {
      axios
        .post(`${ip}/updateProjectDisplay`, { ongoing: true, completed: false })
        .then((res) => axios.get(`${ip}/projects`))
        .then((res) => {
          setProjects(res.data);
          return axios.all([
            axios.get(`${ip}/projectEntriesStatus?checkExpenses=false`),
            axios.get(`${ip}/projectEntriesStatus?checkExpenses=true`),
          ]);
        })
        .then(
          axios.spread((entriesRes, expensesRes) => {
            const entriesStatusData = entriesRes.data.reduce((acc, status) => {
              acc[status.project_id] = {
                today: status.today,
                yesterday: status.yesterday,
              };
              return acc;
            }, {});
            setEntriesStatus(entriesStatusData);

            const expensesStatusData = expensesRes.data.reduce(
              (acc, status) => {
                acc[status.project_id] = {
                  today: status.today,
                  yesterday: status.yesterday,
                };
                return acc;
              },
              {}
            );
            setExpensesStatus(expensesStatusData);
          })
        )
        .catch((error) => {
          console.error(
            "There was an error fetching the projects data!",
            error
          );
        });
    } else {
      navigate("/");
    }
  }, [location.state, navigate]);

  const handleEditClick = (project) => {
    setEditProject({ ...project });
    // Scroll to the edit project form
    setTimeout(() => {
      const element = document.getElementById("editProject");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProject({
      ...editProject,
      [name]: value === "" ? null : value,
    });
  };

  const handleAddProject = async () => {
    navigate("/addProject", { state: { isAuthenticated: true } });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`${ip}/editProject`, {
        ...editProject,
      });

      if (response.status === 200) {
        setProjects(
          projects.map((project) =>
            project.project_id === editProject.project_id
              ? response.data
              : project
          )
        );
        setEditProject(null);
        window.location.href = "/projects";
      } else {
        console.error("Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditProject(null);
  };

  const handleUpdateProjectDisplay = async (event) => {
    event.preventDefault();
    const ongoing = document.getElementById("ongoingCheckbox").checked;
    const completed = document.getElementById("completedCheckbox").checked;

    try {
      const response = await axios.post(`${ip}/updateProjectDisplay`, {
        ongoing: ongoing,
        completed: completed,
      });

      if (response.status === 200) {
        if (ongoing && completed) {
          setDisplayingMessage("All");
        } else if (ongoing) {
          setDisplayingMessage("Ongoing");
        } else if (completed) {
          setDisplayingMessage("Completed");
        } else {
          setDisplayingMessage("Nothing");
        }
        await axios
          .get(`${ip}/projects`)
          .then((res) => {
            setProjects(res.data);
            return axios.all([
              axios.get(`${ip}/projectEntriesStatus?checkExpenses=false`),
              axios.get(`${ip}/projectEntriesStatus?checkExpenses=true`),
            ]);
          })
          .then(
            axios.spread((entriesRes, expensesRes) => {
              const entriesStatusData = entriesRes.data.reduce(
                (acc, status) => {
                  acc[status.project_id] = {
                    today: status.today,
                    yesterday: status.yesterday,
                  };
                  return acc;
                },
                {}
              );
              setEntriesStatus(entriesStatusData);

              const expensesStatusData = expensesRes.data.reduce(
                (acc, status) => {
                  acc[status.project_id] = {
                    today: status.today,
                    yesterday: status.yesterday,
                  };
                  return acc;
                },
                {}
              );
              setExpensesStatus(expensesStatusData);
            })
          );
      } else {
        console.error("Failed to update project display");
      }
    } catch (error) {
      console.error("Error updating project display:", error);
    }
  };

  const navigateToDailyLogs = (projectId, action) => {
    navigate("/dailyLogs", {
      state: {
        projectId,
        action,
        isAuthenticated: true,
      },
    });
  };

  const navigateToExpenses = (project, action) => {
    navigate("/expenses", {
      state: { project, action, isAuthenticated: true },
    });
  };

  const navigateToNotifications = (project) => {
    navigate("/notifications", { state: { project, isAuthenticated: true } });
  };

  const navigateToEditEngineers = (project) => {
    navigate("/editEngineers", {
      state: { project, isAuthenticated: true },
    });
  };

  const handleDeleteClick = async (projectId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (isConfirmed) {
      try {
        await axios.post(`${ip}/deleteMarkedProjects`, {
          projectIds: [projectId],
        });
        const response = await axios.get(`${ip}/projects`);
        if (response.status === 200) {
          setProjects(response.data);
        } else {
          console.error("Failed to fetch updated projects");
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Error confirming delete:", error.message);
          alert("Must delete all expenses and daily logs associated first.");
        } else {
          console.error("Unexpected error:", error);
        }
      }
    }
  };

  useEffect(() => {
    // Fetch missing logs for each project after projects have been loaded
    projects.forEach((project) => {
      renderMissingLogs(project.project_id);
    });
  }, [projects]);

  // Function to fetch missing logs for a project
  const renderMissingLogs = async (projectId) => {
    try {
      const response = await axios.get(`${ip}/missingLogs`, {
        params: { project_id: projectId },
      });
      setMissingLogs((prev) => ({
        ...prev,
        [projectId]: response.data.missingDailyLogs,
      }));
    } catch (error) {
      console.error("Error fetching missing logs:", error);
    }
  };

  return (
    <div className="container mt-5">
      <h1>Projects Report</h1>
      <div className="subheading">
        <form onSubmit={handleUpdateProjectDisplay}>
          <label>
            <input
              type="checkbox"
              name="ongoing"
              id="ongoingCheckbox"
              defaultChecked
            />
            Ongoing
          </label>
          <label>
            <input type="checkbox" name="completed" id="completedCheckbox" />
            Completed
          </label>
          <button type="submit" className="btn btn-primary">
            Display
          </button>
          <div>Currently Displaying: {displayingMessage}</div>
        </form>
        <div>
          <button
            onClick={handleAddProject}
            className="btn btn-primary"
            id="project-add"
          >
            Add Project
          </button>{" "}
        </div>
      </div>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Project ID</th>
            <th>Project Name</th>
            <th>Project Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Details</th>
            <th>Location</th>
            <th>Engineer Names</th>
            <th>Daily Logs</th>
            <th>Expenses</th>
            <th>Notifications</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.project_id}>
              <td>{project.project_id}</td>
              <td className="project-name">{project.project_name}</td>
              <td>{project.project_status === 1 ? "Ongoing" : "Complete"}</td>
              <td>{project.start_date}</td>
              <td>{project.end_date}</td>
              <td>{project.details}</td>
              <td>{project.location}</td>
              <td>
                {project.engineer_names.split(", ").map((name, index) => (
                  <span key={index} className="engineer-name">
                    <div style={{ display: "block" }}>
                      {index + 1}: {name}
                    </div>
                  </span>
                ))}
              </td>
              <td>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "Today")
                  }
                  className={
                    entriesStatus[project.project_id]?.today
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "Yesterday")
                  }
                  className={
                    entriesStatus[project.project_id]?.yesterday
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                >
                  Yesterday
                </button>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "View All")
                  }
                >
                  View All
                </button>
              </td>
              <td>
                <button
                  onClick={() => navigateToExpenses(project, "Today")}
                  className={
                    expensesStatus[project.project_id]?.today
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                >
                  Today
                </button>
                <button
                  onClick={() => navigateToExpenses(project, "Yesterday")}
                  className={
                    expensesStatus[project.project_id]?.yesterday
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                >
                  Yesterday
                </button>
                <button onClick={() => navigateToExpenses(project, "View All")}>
                  View All
                </button>
              </td>
              <td>
                <div>
                  {missingLogs[project.project_id] !== undefined
                    ? `${missingLogs[project.project_id]} missing logs`
                    : ""}
                </div>
                <button onClick={() => navigateToNotifications(project)}>
                  View Notifications
                </button>
              </td>
              <td>
                <button onClick={() => handleEditClick(project)}>
                  Edit Project
                </button>
                <button onClick={() => navigateToEditEngineers(project)}>
                  Edit Engineers
                </button>
                <button onClick={() => handleDeleteClick(project.project_id)}>
                  Delete Projects
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editProject && (
        <div id="editProject" className="edit-form">
          <h2>Edit Project {editProject.project_id}</h2>
          <form>
            <div className="form-group">
              <label>Project Name</label>
              <input
                type="text"
                name="project_name"
                value={editProject.project_name}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Project Status</label>
              <select
                name="project_status"
                value={editProject.project_status}
                onChange={handleChange}
                className="form-control"
              >
                <option value={1}>Ongoing</option>
                <option value={0}>Complete</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                name="start_date"
                value={editProject.start_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                name="end_date"
                value={editProject.end_date || ""}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Details</label>
              <input
                type="text"
                name="details"
                value={editProject.details}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={editProject.location}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Projects;
