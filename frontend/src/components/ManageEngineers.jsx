import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_IP } from "../constants";

function ManageEngineers() {
  const [engineers, setEngineers] = useState([]);
  const [editingEngineer, setEditingEngineer] = useState(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchEngineers();
  }, []);

  const fetchEngineers = async () => {
    try {
      const response = await axios.get(`${BACKEND_IP}/allEngineers`, {
        headers: { "access-token": token },
      });
      setEngineers(response.data);
    } catch (error) {
      setMessage("Error fetching engineers");
      console.error("Error fetching engineers:", error);
    }
  };

  const handleEditEngineer = (engineer) => {
    setEditingEngineer(engineer.engineer_id);
    setName(engineer.name);
    setTitle(engineer.title);
  };

  const handleDeleteEngineer = async (engineer_id) => {
    try {
      await axios.delete(`${BACKEND_IP}/engineers/${engineer_id}`, {
        headers: { "access-token": token },
      });
      fetchEngineers();
    } catch (error) {
      setMessage("Error deleting engineer");
      console.error("Error deleting engineer:", error);
    }
  };

  const handleSaveEngineer = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${BACKEND_IP}/engineers/${editingEngineer}`,
        { name, title },
        {
          headers: { "access-token": token },
        }
      );
      setEditingEngineer(null);
      setMessage("");
      fetchEngineers();
    } catch (error) {
      setMessage("Error saving engineer");
      console.error("Error saving engineer:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingEngineer(null);
  };

  const navigateToAddEngineers = () => {
    nav("/addEngineers");
  };

  const handleBack = () => {
    nav(-1);
  };

  return (
    <div className="container mt-5">
      <h1>Manage Engineers</h1>
      <div className="subheading">
        <button onClick={handleBack} className="btn btn-secondary back">
          Back
        </button>

        <button
          onClick={navigateToAddEngineers}
          className="btn btn-primary add"
        >
          Add Engineers
        </button>
      </div>
      {message ? (
        <div className="alert alert-danger">{message}</div>
      ) : (
        <br></br>
      )}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {engineers.map((engineer) => (
            <tr key={engineer.engineer_id}>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                  />
                ) : (
                  engineer.name
                )}
              </td>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-control"
                  />
                ) : (
                  engineer.title
                )}
              </td>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveEngineer}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleEditEngineer(engineer)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteEngineer(engineer.engineer_id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageEngineers;
