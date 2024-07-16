import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function AddEngineers() {
  let ip = "http://localhost:3000";
  const [message, setMessage] = useState("");
  const [newEngineer, setNewEngineer] = useState({
    name: "",
    title: "",
  });

  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = location.state || {};

  useEffect(() => {
    if (!isAuthenticated) {
      nav("/unauthorized");
    }
  }, [location.state, nav]);

  const handleNewEngineerChange = (e) => {
    const { name, value } = e.target;
    setNewEngineer({
      ...newEngineer,
      [name]: value,
    });
  };

  const handleAddEngineer = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${ip}/addEngineer`, {
        ...newEngineer,
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
      setMessage("Error adding engineer");
      console.error("Error adding engineer:", error);
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
