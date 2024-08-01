import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { BACKEND_IP } from "../constants";
import { formatUrl } from "../utils";

const DailyLogs = () => {
  const [dailyLogs, setDailyLogs] = useState([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [editDailyLog, setEditDailyLog] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState(0);
  const [engineers, setEngineers] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, action, highlightLogId } = location.state || {};
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/unauthorized");
      return;
    }

    const decoded = jwtDecode(token);
    setPermissionLevel(decoded.permission_level);

    const fetchDailyLogs = async () => {
      try {
        const response = await axios.post(
          `${BACKEND_IP}/dailyLogs`,
          {
            project_id: projectId,
            action: action,
          },
          {
            headers: { "access-token": token },
          }
        );
        if (response.status === 200) {
          setDailyLogs(response.data);
        } else {
          console.error("Failed to fetch daily logs");
        }
      } catch (error) {
        console.error("Error fetching daily logs:", error);
      }
    };

    const fetchProjectName = async () => {
      try {
        const response = await axios.post(
          `${BACKEND_IP}/title`,
          {
            project_id: projectId,
          },
          {
            headers: { "access-token": token },
          }
        );
        if (response.status === 200) {
          setProjectTitle(response.data.project_name);
        } else {
          console.error("Failed to fetch project name");
        }
      } catch (error) {
        console.error("Error fetching project name:", error);
      }
    };
    const fetchEngineers = async () => {
      try {
        const response = await axios.get(`${BACKEND_IP}/engineers`, {
          params: { project_id: projectId },
          headers: { "access-token": token },
        }); // Adjust the endpoint to your actual API
        setEngineers(response.data);
      } catch (error) {
        console.error("Error fetching engineers:", error);
      }
    };

    fetchDailyLogs();
    fetchProjectName();
    fetchEngineers();
  }, [projectId, action, navigate, token]);

  const handleCancelEdit = () => {
    setEditDailyLog(null);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddDailyLog = () => {
    if (permissionLevel >= 1) {
      navigate("/addDailyLog", {
        state: {
          projectId: projectId,
          projectTitle: projectTitle,
        },
      });
    } else {
      alert("You do not have permission to add daily logs.");
    }
  };

  const handleDeleteClick = async (logId) => {
    if (permissionLevel >= 2) {
      const isConfirmed = window.confirm(
        "Are you sure you want to delete this daily log?"
      );
      if (isConfirmed) {
        try {
          await axios.post(
            `${BACKEND_IP}/deleteMarkedDailyLogs`,
            {
              dailyLogIds: [logId],
            },
            {
              headers: { "access-token": token },
            }
          );
          const response = await axios.post(
            `${BACKEND_IP}/dailyLogs`,
            {
              project_id: projectId,
              action: action,
            },
            {
              headers: { "access-token": token },
            }
          );
          if (response.status === 200) {
            setDailyLogs(response.data);
          } else {
            console.error("Failed to fetch updated daily logs");
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            alert("Must delete associated expenses first");
            console.error("Error confirming delete:", error.message);
          } else {
            console.error("Unexpected error:", error);
          }
        }
      }
    } else {
      alert("You do not have permission to delete daily logs.");
    }
  };

  const handleEditClick = (log) => {
    if (permissionLevel >= 2) {
      setEditDailyLog({ ...log });
      setTimeout(() => {
        const element = document.getElementById("editLog");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 0);
    } else {
      alert("You do not have permission to edit daily logs.");
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setEditDailyLog({
      ...editDailyLog,
      [name]: value === "" ? null : value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_IP}/editDailyLog`,
        {
          ...editDailyLog,
        },
        {
          headers: { "access-token": token },
        }
      );

      if (response.status === 200) {
        setDailyLogs(
          dailyLogs.map((log) =>
            log.daily_log_id === editDailyLog.daily_log_id ? response.data : log
          )
        );
        setEditDailyLog(null);
        window.location.href = "/dailyLogs";
      } else {
        console.error("Failed to update daily log");
      }
    } catch (error) {
      console.error("Error updating daily log:", error);
    }
  };

  return (
    <div className="container mt-5" id="daily-logs">
      <h1>Daily Logs Report for {projectTitle}</h1>
      <div className="subheading">
        <button onClick={handleBack} className="btn btn-secondary back">
          Back
        </button>
        {permissionLevel >= 1 && (
          <button onClick={handleAddDailyLog} className="btn btn-primary add">
            Add Daily Log
          </button>
        )}
      </div>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Log Date</th>
            <th>Engineer</th>
            <th>Submitted</th>
            <th># of Engineers</th>
            <th>Hours</th>
            <th>PDF</th>
            <th>Note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dailyLogs.length > 0 ? (
            dailyLogs.map((log) => (
              <tr
                key={log.daily_log_id}
                className={
                  log.daily_log_id === highlightLogId ? "highlight" : ""
                }
              >
                <td>{log.log_date}</td>
                <td>
                  {log.engineer_names
                    ? log.engineer_names.split(", ").map((name, index) => (
                        <span key={index} className="engineer-name">
                          {name}
                        </span>
                      ))
                    : "[No engineers]"}
                </td>
                <td>{log.status_submitted === "1" ? "Yes" : "No"}</td>
                <td>{log.num_engineers}</td>
                <td>{log.hours}</td>
                <td>
                  {log.pdf_url && (
                    <a
                      href={formatUrl(log.pdf_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>

                <td>{log.note}</td>
                <td>
                  {permissionLevel >= 2 && (
                    <>
                      <button onClick={() => handleEditClick(log)}>Edit</button>
                      <button
                        onClick={() => handleDeleteClick(log.daily_log_id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10" className="text-center">
                No logs available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editDailyLog && (
        <div id="editLog" className="edit-form">
          <h2>Edit Daily Log {editDailyLog.daily_log_id}</h2>
          <form>
            <div className="form-group">
              <label>Log Date</label>
              <input
                type="date"
                name="log_date"
                value={editDailyLog.log_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Engineer</label>
              <select
                name="engineer_id"
                value={editDailyLog.engineer_id}
                onChange={handleChange}
                className="form-control"
              >
                {engineers.map((engineer) => (
                  <option
                    key={engineer.engineer_id}
                    value={engineer.engineer_id}
                  >
                    {engineer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Submitted</label>
              <select
                name="status_submitted"
                value={editDailyLog.status_submitted}
                onChange={handleChange}
                className="form-control"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="form-group">
              <label># of Engineers</label>
              <input
                type="number"
                name="num_engineers"
                value={editDailyLog.num_engineers}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Hours</label>
              <input
                type="number"
                name="hours"
                value={editDailyLog.hours}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>PDF URL</label>
              <input
                type="text"
                name="pdf_url"
                value={editDailyLog.pdf_url}
                onChange={handleChange}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Note</label>
              <input
                type="text"
                name="note"
                value={editDailyLog.note}
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
};

export default DailyLogs;
