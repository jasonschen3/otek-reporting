import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BACKEND_IP } from "../constants";

const formatUrl = (url) => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
};

const parseDate = (dateString) => {
  return new Date(dateString);
};

const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

function checkYesterdayTodayRender(project) {
  // 1) Render everything
  if (project.end_date === null) {
    return 1;
  }
  const startDate = parseDate(project.start_date);
  const endDate = parseDate(project.end_date);
  // 2) 1 day project so render only that day
  if (project.start_date !== null && isSameDay(startDate, endDate)) {
    return 2;
  }
  const today = new Date();
  // 3) If today is after end_date, then render only the last 2 days
  if (today > endDate) {
    return 3;
  }
  return 1;
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [editProject, setEditProject] = useState(null);
  const [displayingMessage, setDisplayingMessage] = useState("Ongoing");
  const [entriesStatus, setEntriesStatus] = useState({});
  const [expensesStatus, setExpensesStatus] = useState({});
  const [notificationsCount, setNotificationsCount] = useState({});
  const [latestInvoiceDates, setLatestInvoiceDates] = useState({});
  const [permissionLevel, setPermissionLevel] = useState(0);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const decoded = jwtDecode(token);
    setPermissionLevel(decoded.permission_level);
    axios
      .post(
        `${BACKEND_IP}/updateProjectDisplay`,
        { ongoing: true, completed: false },
        {
          headers: {
            "access-token": token,
          },
        }
      )
      .then((res) =>
        axios.get(`${BACKEND_IP}/projects`, {
          headers: {
            "access-token": token,
          },
        })
      )
      .then((res) => {
        setProjects(res.data);
        return axios.all([
          axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=false`, {
            headers: { "access-token": token },
          }),
          axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=true`, {
            headers: { "access-token": token },
          }),
          axios.get(`${BACKEND_IP}/latestInvoiceDate`, {
            headers: { "access-token": token },
          }),
        ]);
      })
      .then(
        axios.spread((entriesRes, expensesRes, invoiceRes) => {
          const entriesStatusData = entriesRes.data.reduce((acc, status) => {
            acc[status.project_id] = {
              today: status.today,
              yesterday: status.yesterday,
              end_date: status.end_date_status,
            };
            return acc;
          }, {});
          setEntriesStatus(entriesStatusData);

          const expensesStatusData = expensesRes.data.reduce((acc, status) => {
            acc[status.project_id] = {
              today: status.today,
              yesterday: status.yesterday,
            };
            return acc;
          }, {});
          setExpensesStatus(expensesStatusData);

          const latestInvoiceDatesData = invoiceRes.data.reduce(
            (acc, invoice) => {
              acc[invoice.project_id] = invoice.latest_invoice_date;
              return acc;
            },
            {}
          );
          setLatestInvoiceDates(latestInvoiceDatesData);
        })
      )
      .catch((err) => {
        console.error("Error fetching project data:", err);
        if (err.response && err.response.status === 401) {
          navigate("/login");
        }
      });
  }, [navigate]);

  const fetchNotificationsCount = async (projectId) => {
    try {
      const response = await axios.get(`${BACKEND_IP}/notifications`, {
        params: { project_id: projectId },
        headers: { "access-token": token },
      });
      const type1Count = response.data.filter(
        (noti) => noti.noti_type === 1
      ).length;
      const type2Count = response.data.filter(
        (noti) => noti.noti_type === 2
      ).length;
      setNotificationsCount((prev) => ({
        ...prev,
        [projectId]: { type1: type1Count, type2: type2Count },
      }));
    } catch (error) {
      console.error("Error fetching notifications count:", error);
    }
  };

  const handleEditClick = (project) => {
    setEditProject({ ...project });
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
    navigate("/addProject");
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_IP}/editProject`,
        { ...editProject },
        {
          headers: { "access-token": token },
        }
      );

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
      const response = await axios.post(
        `${BACKEND_IP}/updateProjectDisplay`,
        { ongoing: ongoing, completed: completed },
        {
          headers: { "access-token": token },
        }
      );

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

        const projectsResponse = await axios.get(`${BACKEND_IP}/projects`, {
          headers: { "access-token": token },
        });

        setProjects(projectsResponse.data);

        const [entriesRes, expensesRes] = await axios.all([
          axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=false`, {
            headers: { "access-token": token },
          }),
          axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=true`, {
            headers: { "access-token": token },
          }),
        ]);

        const entriesStatusData = entriesRes.data.reduce((acc, status) => {
          acc[status.project_id] = {
            today: status.today,
            yesterday: status.yesterday,
            end_date: status.end_date, // Include end_date here
          };
          return acc;
        }, {});
        setEntriesStatus(entriesStatusData);

        const expensesStatusData = expensesRes.data.reduce((acc, status) => {
          acc[status.project_id] = {
            today: status.today,
            yesterday: status.yesterday,
          };
          return acc;
        }, {});
        setExpensesStatus(expensesStatusData);
      } else {
        console.error("Failed to update project display");
      }
    } catch (error) {
      console.error("Error updating project display:", error);
    }
  };

  const navigateToDailyLogs = (projectId, action) => {
    navigate("/dailyLogs", {
      state: { projectId, action },
    });
  };

  const navigateToExpenses = (project, action) => {
    navigate("/expenses", {
      state: { project, action },
    });
  };

  const navigateToNotifications = (project) => {
    navigate("/notifications", { state: { project } });
  };

  const navigateToInvoices = (project, action) => {
    navigate("/invoices", {
      state: { project, action },
    });
  };

  const navigateToEditEngineers = (project) => {
    navigate("/editEngineers", {
      state: { project },
    });
  };

  const navigateToAddEngineers = () => {
    navigate("/addEngineers");
  };

  const navigateToRegister = () => {
    navigate("/register");
  };

  const handleDeleteClick = async (projectId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (isConfirmed) {
      try {
        await axios.post(
          `${BACKEND_IP}/deleteMarkedProjects`,
          { projectIds: [projectId] },
          {
            headers: { "access-token": token },
          }
        );
        const response = await axios.get(`${BACKEND_IP}/projects`, {
          headers: { "access-token": token },
        });
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
  const formatDateString = (date) => {
    const options = { year: "numeric", month: "2-digit", day: "2-digit" };
    return date.toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    projects.forEach((project) => {
      fetchNotificationsCount(project.project_id);
    });
  }, [projects]);

  return (
    <div className="project-container mt-5">
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
          {permissionLevel >= 2 && (
            <>
              <button
                onClick={navigateToRegister}
                className="btn btn-primary add"
              >
                Register
              </button>
              <button
                onClick={navigateToAddEngineers}
                className="btn btn-primary add"
              >
                Add Engineers
              </button>
              <button
                onClick={handleAddProject}
                className="btn btn-primary add"
              >
                Add Project
              </button>
            </>
          )}
        </div>
      </div>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Project Name</th>
            <th>Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Location</th>
            <th>Details</th>
            <th>Quote</th> {/* Add new column */}
            <th>Engineer Names</th>
            <th>Logs</th>
            <th>Expenses</th>
            <th>Invoices</th> {/* Add new column */}
            <th>Notifications</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.project_id}>
              <td className="project-name">{project.project_name}</td>
              <td>{project.project_status === 1 ? "Ongoing" : "Complete"}</td>
              <td>{project.start_date}</td>
              <td>{project.end_date}</td>
              <td>{project.location}</td>
              <td>{project.details}</td>
              <td>
                {project.quotation_url && (
                  <a
                    href={formatUrl(project.quotation_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                )}
              </td>
              <td className="wider-col">
                {project.engineer_names.split(", ").map((name, index) => (
                  <span key={index} className="engineer-name">
                    <div style={{ display: "block" }}>
                      {index + 1}: {name}
                    </div>
                  </span>
                ))}
              </td>
              <td>
                {checkYesterdayTodayRender(project) === 1 && (
                  <>
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
                  </>
                )}
                {checkYesterdayTodayRender(project) === 2 && (
                  <>
                    <button
                      onClick={() =>
                        navigateToDailyLogs(project.project_id, "End Date")
                      }
                      className={
                        entriesStatus[project.project_id]?.end_date
                          ? "btn btn-success"
                          : "btn btn-danger"
                      }
                    >
                      {project.end_date}
                    </button>
                    <button className="btn btn-secondary">Yesterday</button>
                  </>
                )}
                {checkYesterdayTodayRender(project) === 3 && (
                  <>
                    <button
                      onClick={() =>
                        navigateToDailyLogs(project.project_id, "End Date")
                      }
                      className={
                        entriesStatus[project.project_id]?.end_date
                          ? "btn btn-success"
                          : "btn btn-danger"
                      }
                    >
                      {project.end_date}
                    </button>
                    <button className="btn btn-secondary">Yesterday</button>
                  </>
                )}

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
                <button
                  onClick={() => navigateToInvoices(project, "Latest")}
                  className={
                    latestInvoiceDates[project.project_id]
                      ? "btn btn-success"
                      : "btn btn-danger"
                  }
                >
                  Latest
                </button>
                <button onClick={() => navigateToInvoices(project, "View All")}>
                  View All
                </button>
              </td>
              <td className="wider-col">
                <div>
                  {notificationsCount[project.project_id] !== undefined ? (
                    <>
                      <div>{`${
                        notificationsCount[project.project_id].type1
                      } missing logs`}</div>
                      <div>{`${
                        notificationsCount[project.project_id].type2
                      } missing expenses`}</div>
                    </>
                  ) : (
                    ""
                  )}
                </div>
                <button onClick={() => navigateToNotifications(project)}>
                  View Notifications
                </button>
              </td>
              <td>
                {permissionLevel >= 2 && (
                  <>
                    <button onClick={() => handleEditClick(project)}>
                      Edit Project
                    </button>
                    <button onClick={() => navigateToEditEngineers(project)}>
                      Edit Engineers
                    </button>
                    <button
                      onClick={() => handleDeleteClick(project.project_id)}
                    >
                      Delete Project
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editProject && (
        <div id="editProject" className="edit-form">
          <h2>Edit Project {editProject.project_name}</h2>
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
            <div className="form-group">
              <label>Quotation URL</label> {/* Add new field */}
              <input
                type="text"
                name="quotation_url"
                value={editProject.quotation_url}
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
