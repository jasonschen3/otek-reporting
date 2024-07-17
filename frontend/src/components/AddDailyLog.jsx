import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

const AddDailyLog = () => {
  let ip = "http://localhost:3000";
  const [newDailyLog, setNewDailyLog] = useState({
    project_id: "",
    log_date: "",
    engineer_id: "",
    status_submitted: "0",
    received_payment: "0",
    hours: "",
    pdf_url: "",
  });
  const [engineers, setEngineers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId, projectTitle, isAuthenticated } = location.state || {};

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/unauthorized");
      return;
    }
    setNewDailyLog((prevState) => ({
      ...prevState,
      project_id: projectId,
    }));
    const fetchEngineers = async () => {
      try {
        const res = await axios.get(`${ip}/engineers`);
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchEngineers();
  }, [isAuthenticated, projectId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewDailyLog({
      ...newDailyLog,
      [name]: value,
    });
  };

  const handleAddDailyLog = async (e) => {
    e.preventDefault();

    const formattedLog = {
      ...newDailyLog,
      engineer_id: newDailyLog.engineer_id || null,
      hours: newDailyLog.hours || 0,
    };

    try {
      const response = await axios.post(`${ip}/addDailyLog`, formattedLog);
      if (response.status === 200) {
        navigate(-1);
      } else {
        console.error("Failed to add daily log");
      }
    } catch (error) {
      console.error("Error adding daily log:", error);
    }
  };

  const handleCancel = () => {
    navigate(-1);
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
          onChange={handleChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Engineer</label>
        <select
          name="engineer_id"
          value={newDailyLog.engineer_id}
          onChange={handleChange}
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
        <select
          name="status_submitted"
          value={newDailyLog.status_submitted}
          onChange={handleChange}
          className="form-control"
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </div>
      <div className="form-group">
        <label>Received Payment</label>
        <select
          name="received_payment"
          value={newDailyLog.received_payment}
          onChange={handleChange}
          className="form-control"
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </div>
      <div className="form-group">
        <label>Hours</label>
        <input
          type="number"
          name="hours"
          value={newDailyLog.hours}
          onChange={handleChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>PDF URL</label>
        <input
          type="text"
          name="pdf_url"
          value={newDailyLog.pdf_url}
          onChange={handleChange}
          className="form-control"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Add
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleCancel}
      >
        Cancel
      </button>
    </form>
  );
};

export default AddDailyLog;
