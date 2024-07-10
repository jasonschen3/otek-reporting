import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

function AddDailyLog() {
  let ip = "http://localhost:3000";
  const [message, setMessage] = useState("");
  const [newDailyLog, setNewDailyLog] = useState({
    log_date: "",
    engineer_id: "",
    status_submitted: false,
    status_reimbursed: false,
    hours: "",
    pdf_url: "",
  });
  const [engineers, setEngineers] = useState([]);

  // Use passed in vari from state
  const location = useLocation();
  const { projectId, projectTitle } = location.state || {};

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await axios.get(`${ip}/engineers`);
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
      project_id: projectId,
      status_submitted: newDailyLog.status_submitted ? 1 : 0,
      status_reimbursed: newDailyLog.status_reimbursed ? 1 : 0,
      hours: newDailyLog.hours ? parseFloat(newDailyLog.hours) : null,
    };

    try {
      const response = await axios.post(`${ip}/addDailyLog`, dailyLogData);
      if (response.status === 200) {
        setNewDailyLog({
          log_date: "",
          engineer_id: "",
          status_submitted: false,
          status_reimbursed: false,
          hours: "",
          pdf_url: "",
        });
        setMessage("Added daily log");
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
      <h2>Add Daily Log for {projectTitle}</h2>
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
