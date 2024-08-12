import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_IP } from "../constants";

import { formatUrl } from "../utils";
import { getPermissionLevelText } from "../utils";

function ManageEngineers() {
  const [engineers, setEngineers] = useState([]);
  const [editingEngineer, setEditingEngineer] = useState(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permissionLevel, setPermissionLevel] = useState(0);
  const [uploadUrl, setUploadUrl] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
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
    setUsername(engineer.username);
    setPassword(""); // Reset password field when editing starts
    setPermissionLevel(engineer.permission_level);
    setUploadUrl(engineer.upload_url);
  };

  const handleDeleteEngineer = async (engineer_id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this engineer?"
    );
    if (!confirmDelete) {
      return;
    }
    try {
      await axios.delete(`${BACKEND_IP}/engineers/${engineer_id}`, {
        headers: { "access-token": token },
      });
      fetchEngineers();
      setMessage("");
    } catch (error) {
      setMessage(
        "Error deleting engineer: engineer might be part of a project"
      );
      console.error("Error deleting engineer:", error);
    }
  };

  const handleSaveEngineer = async (e) => {
    e.preventDefault();

    const payload = {
      name,
      title,
      username,
      permission_level: permissionLevel,
      upload_url: uploadUrl ? formatUrl(uploadUrl) : null,
    };

    if (password) {
      payload.password = password; // Include password only if it's set
    }

    try {
      await axios.put(`${BACKEND_IP}/engineers/${editingEngineer}`, payload, {
        headers: { "access-token": token },
      });
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
    navigate("/register");
  };

  const handleBack = () => {
    navigate(-1);
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
          Register
        </button>
      </div>
      {message ? <div className="alert alert-danger">{message}</div> : <br />}
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Username</th>
            <th>Permission Level</th>
            <th>Upload URL</th>
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
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="form-control"
                  />
                ) : (
                  engineer.username
                )}
              </td>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <select
                    value={permissionLevel}
                    onChange={(e) => setPermissionLevel(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value={null}>Select</option>
                    <option value={0}>View Only</option>
                    <option value={1}>Upload Only</option>
                    <option value={2}>Admin</option>
                  </select>
                ) : (
                  getPermissionLevelText(engineer.permission_level)
                )}
              </td>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    className="form-control"
                  />
                ) : (
                  engineer.upload_url && (
                    <a
                      href={engineer.upload_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View File
                    </a>
                  )
                )}
              </td>
              <td>
                {editingEngineer === engineer.engineer_id ? (
                  <>
                    <input
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-control mt-2"
                    />
                    <button
                      className="btn btn-success mt-2"
                      onClick={handleSaveEngineer}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary mt-2"
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
