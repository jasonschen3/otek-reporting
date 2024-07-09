import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const DailyLogs = () => {
  const [dailyLogs, setDailyLogs] = useState([]);
  const [projectTitle, setProjectTitle] = useState("");
  const { projectId, action } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDailyLogs() {
      try {
        const response = await axios.post("http://localhost:3000/dailyLogs", {
          project_id: projectId,
          action: action,
        });
        if (response.status === 200) {
          setDailyLogs(response.data);
        } else {
          console.error("Failed to fetch daily logs");
        }
      } catch (error) {
        console.error("Error fetching daily logs:", error);
      }
    }
    async function fetchProjectName() {
      try {
        const response = await axios.post("http://localhost:3000/title", {
          project_id: projectId,
        });
        if (response.status === 200) {
          setProjectTitle(response.data.project_name);
        } else {
          console.error("Failed to fetch project name");
        }
      } catch (error) {
        console.error("Error fetching project name:", error);
      }
    }
    fetchDailyLogs();
    fetchProjectName();
  }, [projectId, action]);

  function handleAddDailyLog() {
    navigate("/addDailyLog");
  }
  return (
    <div className="container mt-5" id="daily-logs">
      <h1>Daily Logs Report for {projectTitle}</h1>
      {/* <button onClick={handleAddDailyLog}>Add Daily Log</button> */}
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Daily Log ID</th>
            <th>Log Date</th>
            <th>Project Name</th>
            <th>Engineer</th>
            <th>Submitted</th>
            <th>Submitted Billing</th>
            <th>Hours</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {dailyLogs.length > 0 ? (
            dailyLogs.map((log) => (
              <tr key={log.daily_log_id}>
                <td>{log.daily_log_id}</td>
                <td>{log.log_date}</td>
                <td>{log.project_name}</td>
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
                <td>{log.status_reimbursed === "1" ? "Yes" : "No"}</td>
                <td>{log.hours}</td>
                <td>
                  <a
                    href={log.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="text-center">
                No logs available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DailyLogs;
