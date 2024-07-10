import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Projects() {
  let ip = "http://localhost:3000";
  const [projects, setProjects] = useState([]);
  const [editProject, setEditProject] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.isAuthenticated) {
      axios
        .get(`${ip}/projects`)
        .then((res) => {
          setProjects(res.data);
        })
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProject({
      ...editProject,
      [name]: value === "" ? null : value,
    });
  };

  const handleAddProject = async () => {
    navigate("/addProject");
  };

  const handleAddExpense = async () => {
    navigate("/addExpense");
  };

  const handleAddDailyLog = async () => {
    navigate("/addDailyLog");
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`${ip}/updateProject`, {
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

  const handleUpdateProjectDisplay = async (event) => {
    event.preventDefault();
    const ongoing = document.getElementById("ongoingCheckbox").checked;
    const completed = document.getElementById("completedCheckbox").checked;

    try {
      const response = await axios.post(
        "http://localhost:3000/updateProjectDisplay",
        {
          ongoing: ongoing,
          completed: completed,
        }
      );

      if (response.status === 200) {
        window.location.href = "/projects";
      } else {
        console.error("Failed to update project display");
      }
    } catch (error) {
      console.error("Error updating project display:", error);
    }
  };

  const navigateToDailyLogs = (projectId, action) => {
    navigate(`/dailyLogs/${projectId}/${action}`);
  };

  const navigateToExpenses = (project, action) => {
    navigate("/expenses", { state: { project, action } });
  };

  return (
    <div className="container mt-5">
      <h1>Projects Report</h1>
      <form onSubmit={handleUpdateProjectDisplay}>
        <label>
          <input type="checkbox" name="ongoing" id="ongoingCheckbox" />
          Ongoing
        </label>
        <label>
          <input type="checkbox" name="completed" id="completedCheckbox" />
          Completed
        </label>
        <button type="submit">Display</button>
      </form>
      <br></br>
      <button onClick={handleAddProject}>Add Project</button>
      <button onClick={handleAddExpense}>Add Expense</button>
      <button onClick={handleAddDailyLog}>Add Daily Log</button>
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
              <td>{project.project_name}</td>
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
                    navigateToDailyLogs(project.project_id, "Yesterday")
                  }
                >
                  Yesterday
                </button>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "Today")
                  }
                >
                  Today
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
                  onClick={() => navigateToExpenses(project, "Yesterday")}
                >
                  Yesterday
                </button>
                <button onClick={() => navigateToExpenses(project, "Today")}>
                  Today
                </button>
                <button onClick={() => navigateToExpenses(project, "View All")}>
                  View All
                </button>
              </td>
              <td>{project.notifications}</td>
              <td>
                <button onClick={() => handleEditClick(project)}>Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editProject && (
        <div className="edit-form">
          <h2>Edit Project</h2>
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
                <option value={null}>None</option>
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
            <div className="form-group">
              <label>Notifications</label>
              <input
                type="text"
                name="notifications"
                value={editProject.notifications}
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
          </form>
        </div>
      )}
    </div>
  );
}

export default Projects;
