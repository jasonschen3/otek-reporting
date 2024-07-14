import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function EditEngineers() {
  let ip = "http://localhost:3000";
  const [engineers, setEngineers] = useState([]);
  const [assignedEngineers, setAssignedEngineers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { project, isAuthenticated } = location.state || {};

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/unauthorized");
      return;
    }
    axios
      .get(`${ip}/engineers`)
      .then((res) => {
        setEngineers(res.data);
      })
      .catch((error) => {
        console.error("There was an error fetching the engineers data!", error);
      });

    axios
      .get(`${ip}/projects_assign_engineers`, {
        // params to pass
        params: { project_id: project.project_id },
      })
      .then((res) => {
        setAssignedEngineers(
          res.data.map((engineer) => engineer.engineer_id.toString())
        );
      })
      .catch((error) => {
        console.error(
          "There was an error fetching the assigned engineers data!",
          error
        );
      });
  }, [project.project_id, navigate, isAuthenticated]);

  const handleEngineerChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setAssignedEngineers([...assignedEngineers, value]);
    } else {
      setAssignedEngineers(assignedEngineers.filter((id) => id !== value));
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${ip}/updateProjectEngineers`, {
        project_id: project.project_id,
        engineer_ids: assignedEngineers,
      });
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
      </form>
    </div>
  );
}

export default EditEngineers;
