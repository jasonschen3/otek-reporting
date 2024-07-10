import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function AddProject() {
  let ip = "http://localhost:3000";
  const [message, setMessage] = useState("");
  const [newProject, setNewProject] = useState({
    project_name: "",
    project_status: 1,
    start_date: "",
    end_date: "",
    details: "",
    location: "",
    notifications: "",
    engineer_ids: [],
  });
  const [engineers, setEngineers] = useState([]);

  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = location.state || {}; // NOT A FUNCTION

  useEffect(() => {
    if (!isAuthenticated) {
      nav("/unauthorized");
      return;
    }
    const fetchEngineers = async () => {
      try {
        const res = await axios.get(`${ip}/engineers`);
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchEngineers();
  }, []); // Empty dependency array ensures this runs only once

  const handleNewProjectChange = (e) => {
    const { name, value } = e.target;
    setNewProject({
      ...newProject,
      [name]: value,
    });
  };

  const handleNewProjectEngineerChange = (e) => {
    const { value, checked } = e.target;
    setNewProject((prevState) => {
      const engineer_ids = checked
        ? [...prevState.engineer_ids, parseInt(value)]
        : prevState.engineer_ids.filter((id) => id !== parseInt(value));
      return { ...prevState, engineer_ids };
    });
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${ip}/addProject`, {
        ...newProject,
      });
      // console.log(response.status);
      if (response.status === 200) {
        setNewProject({
          project_name: "",
          project_status: 1,
          start_date: "",
          end_date: "",
          details: "",
          location: "",
          notifications: "",
          engineer_ids: [],
        });
        setMessage("Added project");
      } else {
        setMessage("Failed to add project");
      }
    } catch (error) {
      setMessage(error.response.data.message);
      console.error("Error adding project:", error);
    }
  };

  return (
    <form onSubmit={handleAddProject} className="container mt-5">
      <h2>Add Project</h2>
      <div className="form-group">
        <label>Project Name</label>
        <input
          type="text"
          name="project_name"
          value={newProject.project_name}
          onChange={handleNewProjectChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Project Status</label>
        <select
          name="project_status"
          value={newProject.project_status}
          onChange={handleNewProjectChange}
          className="form-control"
          required
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
          value={newProject.start_date}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>End Date</label>
        <input
          type="date"
          name="end_date"
          value={newProject.end_date}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Details</label>
        <input
          type="text"
          name="details"
          value={newProject.details}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Location</label>
        <input
          type="text"
          name="location"
          value={newProject.location}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Notifications</label>
        <input
          type="text"
          name="notifications"
          value={newProject.notifications}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Engineers</label>
        {engineers.map((engineer) => (
          <label key={engineer.engineer_id} style={{ display: "block" }}>
            <input
              type="checkbox"
              value={engineer.engineer_id}
              checked={newProject.engineer_ids.includes(engineer.engineer_id)}
              onChange={handleNewProjectEngineerChange}
            />
            {engineer.name}
          </label>
        ))}
      </div>
      <button type="submit" className="btn btn-primary">
        Add
      </button>

      <div>{message}</div>
    </form>
  );
}

export default AddProject;
