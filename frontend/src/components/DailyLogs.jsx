import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const DailyLogs = () => {
  const [dailyLogs, setDailyLogs] = useState([]);
  const { projectId, action } = useParams();

  useEffect(() => {
    async function fetchDailyLogs() {
      try {
        const response = await axios.post("http://localhost:3000/dailyLogs", {
          project_id: projectId,
          action: action,
        });
        if (response.status === 200) {
          console.log("Daily logs data:", response.data);
          setDailyLogs(response.data);
        } else {
          console.error("Failed to fetch daily logs");
        }
      } catch (error) {
        console.error("Error fetching daily logs:", error);
      }
    }
    fetchDailyLogs();
  }, [projectId, action]);

  return (
    <div className="container mt-5" id="daily-logs">
      <h1>Daily Logs Report</h1>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Daily Log ID</th>
            <th>Log Date</th>
            <th>Project Name</th>
            <th>Staff Names</th>
            <th>Status</th>
            <th>Reimbursed</th>
            <th>Hours</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {dailyLogs.map((log) => (
            <tr key={log.daily_log_id}>
              <td>{log.daily_log_id}</td>
              <td>{log.log_date}</td>
              <td>{log.project_name}</td>
              <td>
                {log.staff_names.split(", ").map((name, index) => (
                  <span key={index} className="staff-name">
                    {name}
                  </span>
                ))}
              </td>
              <td>
                {log.status === 0
                  ? "not-filled"
                  : log.status === 1
                  ? "filled"
                  : "to-contractor"}
              </td>
              <td>
                {log.reimbursed === 0
                  ? "not-reimbursed"
                  : log.reimbursed === 1
                  ? "received-money"
                  : "reimbursed"}
              </td>
              <td>{log.hours}</td>
              <td>
                <a href={log.pdf_url} target="_blank" rel="noopener noreferrer">
                  PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DailyLogs;
