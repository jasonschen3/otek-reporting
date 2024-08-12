import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BACKEND_IP } from "../constants";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permissionLevel, setPermissionLevel] = useState();
  const [engineerName, setEngineerName] = useState("");
  const [engineerTitle, setEngineerTitle] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/unauthorized");
      return;
    }
  }, [token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(
        `${BACKEND_IP}/register`,
        {
          username: username,
          password: password,
          permission_level: permissionLevel,
          name: engineerName,
          title: engineerTitle,
          upload_url: uploadUrl,
        },
        { headers: { "access-token": token } }
      );

      if (response.status === 201) {
        setMessage("Registration successful! Redirecting to projects");
        setTimeout(() => {
          navigate("/projects");
        }, 2000);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Registration failed!");
      }
    }
  };

  function handleCancel() {
    navigate(-1);
  }

  return (
    <div className="container mt-5">
      <h1>Register</h1>
      <div className="center-container">
        <div className="col-sm-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="permissionLevel">Permission Level</label>
                  <select
                    className="form-control"
                    name="permissionLevel"
                    value={permissionLevel}
                    onChange={(e) => setPermissionLevel(Number(e.target.value))}
                    required
                  >
                    <option value={0}>View Only</option>
                    <option value={1}>Upload Only</option>
                    <option value={2}>Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="engineerName">Engineer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="engineerName"
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="engineerTitle">Engineer Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="engineerTitle"
                    value={engineerTitle}
                    onChange={(e) => setEngineerTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="uploadUrl">Upload URL</label>
                  <input
                    type="url"
                    className="form-control"
                    name="uploadUrl"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    required
                  />
                </div>
                <br />
                <button type="submit" className="btn btn-primary">
                  Register
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </form>
              {message && <p className="mt-3">{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
