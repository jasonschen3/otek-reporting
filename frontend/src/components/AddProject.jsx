import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_IP } from "../constants";

function AddProject() {
  const [message, setMessage] = useState("");
  const [newProject, setNewProject] = useState({
    project_name: null,
    project_status: 1,
    start_date: null,
    end_date: null,
    details: null,
    location: null,
    quotation_url: null,
    purchase_url: null,
    engineer_ids: [],
    company_name: null,
    amount: null,
    contract_id: null,
    otek_invoice: null,
  });
  const [engineers, setEngineers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      nav("/unauthorized");
      return;
    }

    const fetchCompanies = async () => {
      try {
        const res = await axios.get(`${BACKEND_IP}/allCompanies`, {
          headers: { "access-token": token },
        });
        setCompanies(res.data);
      } catch (error) {
        console.error("There was an error fetching the companies data", error);
      }
    };

    const fetchEngineers = async () => {
      try {
        const res = await axios.get(`${BACKEND_IP}/allEngineers`, {
          headers: { "access-token": token },
        });
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchCompanies();
    fetchEngineers();
  }, [token, nav]);

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
      const response = await axios.post(
        `${BACKEND_IP}/addProject`,
        {
          ...newProject,
        },
        {
          headers: {
            "access-token": token,
          },
        }
      );
      if (response.status === 200) {
        nav(-1);
      } else {
        setMessage("Failed to add project");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding project");
      console.error("Error adding project:", error);
    }
  };

  const handleCancel = () => {
    nav(-1);
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
        <label>Notes</label>
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
        <label>Quotation URL</label>
        <input
          type="text"
          name="quotation_url"
          value={newProject.quotation_url}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Purchase URL</label>
        <input
          type="text"
          name="purchase_url"
          value={newProject.purchase_url}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          name="amount"
          value={newProject.amount}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Contract ID</label>
        <input
          type="text"
          name="contract_id"
          value={newProject.contract_id}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Otek Invoice</label>
        <input
          type="text"
          name="otek_invoice"
          value={newProject.otek_invoice}
          onChange={handleNewProjectChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Company</label>
        <select
          name="company_name"
          value={newProject.company_name}
          onChange={handleNewProjectChange}
          className="form-control"
        >
          <option value={null}>Select a company</option>
          {companies.map((company) => (
            <option key={company.company_id} value={company.company_name}>
              {company.company_name}
            </option>
          ))}
        </select>
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

export default AddProject;
