import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";

function AddEngineers() {
  const ip = "http://localhost:3000";
  const [message, setMessage] = useState("");
  const [newEngineer, setNewEngineer] = useState({
    name: "",
    title: "",
  });
  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = location.state || {};

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!isAuthenticated || !token) {
      nav("/unauthorized");
    }
  }, [isAuthenticated, nav]);

  const handleNewEngineerChange = (e) => {
    const { name, value } = e.target;
    setNewEngineer({
      ...newEngineer,
      [name]: value,
    });
  };

  const handleAddEngineer = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      const response = await axios.post(`${ip}/addEngineer`, newEngineer, {
        headers: {
          "access-token": token,
        },
      });
      if (response.status === 200) {
        setNewEngineer({
          name: "",
          title: "",
        });
        nav(-1);
      } else {
        setMessage("Failed to add engineer");
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        alert("You do not have the required permission level");
      } else {
        setMessage("Error adding engineer");
        console.error("Error adding engineer:", error);
      }
    }
  };

  const handleCancel = () => {
    nav(-1);
  };

  return (
    isAuthenticated && (
      <form onSubmit={handleAddEngineer} className="container mt-5">
        <h2>Add Engineer</h2>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={newEngineer.name}
            onChange={handleNewEngineerChange}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={newEngineer.title}
            onChange={handleNewEngineerChange}
            className="form-control"
            required
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
        <div>{message}</div>
      </form>
    )
  );
}

export default AddEngineers;
