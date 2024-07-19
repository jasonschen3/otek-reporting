import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function EditEngineers() {
  const ip = "http://localhost:3000";
  const [engineers, setEngineers] = useState([]);
  const [assignedEngineers, setAssignedEngineers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { project, isAuthenticated } = location.state || {};
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/unauthorized");
      return;
    }

    const fetchEngineers = async () => {
      try {
        const response = await axios.get(`${ip}/engineers`, {
          headers: { "access-token": token },
        });
        setEngineers(response.data);
      } catch (error) {
        console.error("Error fetching engineers data!", error);
      }
    };

    const fetchAssignedEngineers = async () => {
      try {
        const response = await axios.get(`${ip}/projects_assign_engineers`, {
          params: { project_id: project.project_id },
          headers: { "access-token": token },
        });
        setAssignedEngineers(
          response.data.map((engineer) => engineer.engineer_id.toString())
        );
      } catch (error) {
        console.error("Error fetching assigned engineers data!", error);
      }
    };

    fetchEngineers();
    fetchAssignedEngineers();
  }, [project.project_id, navigate, isAuthenticated, token]);

  const handleCancelEdit = () => {
    navigate(-1);
  };

  const handleEngineerChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setAssignedEngineers((prev) => [...prev, value]);
    } else {
      setAssignedEngineers((prev) => prev.filter((id) => id !== value));
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(
        `${ip}/updateProjectEngineers`,
        {
          project_id: project.project_id,
          engineer_ids: assignedEngineers,
        },
        {
          headers: { "access-token": token },
        }
      );
      navigate("/projects", { state: { isAuthenticated: true } });
    } catch (error) {
      console.error("Error updating engineers:", error);
    }
  };

  return (
    <div className="container mt-5">
      <h1>Edit Engineers for Project {project.project_name}</h1>
      <form>
        <div className="form-group">
          <label>Select Engineers</label>
          <div>
            {engineers.map((engineer) => (
              <div key={engineer.engineer_id} className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`engineer-${engineer.engineer_id}`}
                  value={engineer.engineer_id.toString()}
                  checked={assignedEngineers.includes(
                    engineer.engineer_id.toString()
                  )}
                  onChange={handleEngineerChange}
                />
                <label
                  className="form-check-label"
                  htmlFor={`engineer-${engineer.engineer_id}`}
                >
                  {engineer.name}
                </label>
              </div>
            ))}
          </div>
        </div>
        <button type="button" onClick={handleSave} className="btn btn-primary">
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
  );
}

export default EditEngineers;
