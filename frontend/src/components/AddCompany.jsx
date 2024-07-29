import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_IP } from "../constants";

function AddCompany() {
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const handleCompanyNameChange = (e) => {
    setCompanyName(e.target.value);
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${BACKEND_IP}/addCompany`,
        {
          company_name: companyName,
        },
        {
          headers: {
            "access-token": token,
          },
        }
      );
      if (response.status === 200) {
        setCompanyName("");
        nav(-1);
      } else {
        setMessage("Failed to add company");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding company");
      console.error("Error adding company:", error);
    }
  };

  const handleCancel = () => {
    nav(-1);
  };

  return (
    <form onSubmit={handleAddCompany} className="container mt-5">
      <h2>Add Company</h2>
      <div className="form-group">
        <label>Company Name</label>
        <input
          type="text"
          value={companyName}
          onChange={handleCompanyNameChange}
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
  );
}

export default AddCompany;
