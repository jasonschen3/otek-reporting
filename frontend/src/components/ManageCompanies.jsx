import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_IP } from "../constants";

function ManageCompanies() {
  const [companies, setCompanies] = useState([]);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [message, setMessage] = useState("");
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get(`${BACKEND_IP}/allCompanies`, {
        headers: { "access-token": token },
      });
      setCompanies(response.data);
    } catch (error) {
      setMessage("Error fetching companies");
      console.error("Error fetching companies:", error);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company.company_id);
    setCompanyName(company.company_name);
  };

  const handleDeleteCompany = async (company_id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this company?"
    );
    if (!confirmDelete) {
      return;
    }
    try {
      await axios.delete(`${BACKEND_IP}/companies/${company_id}`, {
        headers: { "access-token": token },
      });
      fetchCompanies();
    } catch (error) {
      setMessage("Error deleting company");
      console.error("Error deleting company:", error);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `${BACKEND_IP}/companies/${editingCompany}`,
        { company_name: companyName },
        {
          headers: { "access-token": token },
        }
      );
      setEditingCompany(null);
      setCompanyName("");
      fetchCompanies();
    } catch (error) {
      setMessage("Error saving company");
      console.error("Error saving company:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingCompany(null);
    setCompanyName("");
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
          headers: { "access-token": token },
        }
      );
      if (response.status === 200) {
        setCompanyName("");
        fetchCompanies();
      } else {
        setMessage("Failed to add company");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding company");
      console.error("Error adding company:", error);
    }
  };

  const navigateToAddCompany = () => {
    nav("/addCompany");
  };

  const handleBack = () => {
    nav(-1);
  };

  return (
    <div className="container mt-5">
      <h1>Manage Companies</h1>
      <div className="subheading">
        <button onClick={handleBack} className="btn btn-secondary back">
          Back
        </button>

        <button onClick={navigateToAddCompany} className="btn btn-primary add">
          Add Company
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
            <th>Company Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.company_id}>
              <td>
                {editingCompany === company.company_id ? (
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="form-control"
                  />
                ) : (
                  company.company_name
                )}
              </td>
              <td>
                {editingCompany === company.company_id ? (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveCompany}
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
                      onClick={() => handleEditCompany(company)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeleteCompany(company.company_id)}
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

export default ManageCompanies;
