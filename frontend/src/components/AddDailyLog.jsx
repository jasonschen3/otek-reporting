import React, { useState, useEffect } from "react";
import axios from "axios";

function AddDailyLog({ onDailyLogAdded }) {
  const [message, setMessage] = useState("");
  const [newDailyLog, setNewDailyLog] = useState({
    daily_log_id: "",
    project_id: "",
    log_date: "",
    engineer_id: "",
    status_submitted: false,
    status_reimbursed: false,
    hours: "",
    pdf_url: "",
  });
  const [engineers, setEngineers] = useState([]);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await axios.get("http://localhost:3000/engineers");
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchEngineers();
  }, []);

  const handleNewDailyLogChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewDailyLog({
      ...newDailyLog,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddDailyLog = async (e) => {
    e.preventDefault();

    // Convert boolean fields to 1 or 0
    const dailyLogData = {
      ...newDailyLog,
      daily_log_id: newDailyLog.daily_log_id
        ? parseInt(newDailyLog.daily_log_id)
        : null,
      project_id: newDailyLog.project_id
        ? parseInt(newDailyLog.project_id)
        : null,
      engineer_id: newDailyLog.engineer_id
        ? parseInt(newDailyLog.engineer_id)
        : null,
      status_submitted: newDailyLog.status_submitted ? 1 : 0,
      status_reimbursed: newDailyLog.status_reimbursed ? 1 : 0,
      hours: newDailyLog.hours ? parseFloat(newDailyLog.hours) : null,
    };

    try {
      const response = await axios.post(
        "http://localhost:3000/addDailyLog",
        dailyLogData
      );
      if (response.status === 200) {
        setNewDailyLog({
          daily_log_id: "",
          project_id: "",
          log_date: "",
          engineer_id: "",
          status_submitted: false,
          status_reimbursed: false,
          hours: "",
          pdf_url: "",
        });
        setMessage("Added daily log");
        onDailyLogAdded(response.data);
      } else {
        setMessage("Failed to add daily log");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding daily log");
      console.error("Error adding daily log:", error);
    }
  };

  return (
    <form onSubmit={handleAddDailyLog} className="container mt-5">
      <h2>Add Daily Log</h2>
      <div className="form-group">
        <label>Daily Log ID</label>
        <input
          type="text"
          name="daily_log_id"
          value={newDailyLog.daily_log_id}
          onChange={handleNewDailyLogChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Project ID</label>
        <input
          type="text"
          name="project_id"
          value={newDailyLog.project_id}
          onChange={handleNewDailyLogChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Log Date</label>
        <input
          type="date"
          name="log_date"
          value={newDailyLog.log_date}
          onChange={handleNewDailyLogChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Engineer</label>
        <select
          name="engineer_id"
          value={newDailyLog.engineer_id}
          onChange={handleNewDailyLogChange}
          className="form-control"
          required
        >
          <option value="">Select Engineer</option>
          {engineers.map((engineer) => (
            <option key={engineer.engineer_id} value={engineer.engineer_id}>
              {engineer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Submitted</label>
        <input
          type="checkbox"
          name="status_submitted"
          checked={newDailyLog.status_submitted}
          onChange={handleNewDailyLogChange}
        />
      </div>
      <div className="form-group">
        <label>Reimbursed</label>
        <input
          type="checkbox"
          name="status_reimbursed"
          checked={newDailyLog.status_reimbursed}
          onChange={handleNewDailyLogChange}
        />
      </div>
      <div className="form-group">
        <label>Hours</label>
        <input
          type="number"
          name="hours"
          value={newDailyLog.hours}
          onChange={handleNewDailyLogChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>PDF URL</label>
        <input
          type="text"
          name="pdf_url"
          value={newDailyLog.pdf_url}
          onChange={handleNewDailyLogChange}
          className="form-control"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Add
      </button>
      <div>{message}</div>
    </form>
  );
}

export default AddDailyLog;
