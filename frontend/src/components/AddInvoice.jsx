import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BACKEND_IP } from "../constants";

function AddInvoice() {
  const [newInvoice, setNewInvoice] = useState({
    project_id: null,
    invoice_number: "",
    invoice_date: "",
    invoice_terms: "",
    amount: 0,
    hasPaid: false,
    invoice_url: "",
    quotation_url: "",
    purchase_url: "",
    engineering_url: "",
    include_logs: false,
    note: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const decoded = jwtDecode(token);
    const projectId = location.state?.projectId;
    if (projectId) {
      setNewInvoice((prev) => ({ ...prev, project_id: projectId }));
    }
  }, [navigate, location, token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewInvoice({
      ...newInvoice,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${BACKEND_IP}/addInvoice`,
        { ...newInvoice },
        {
          headers: {
            "access-token": token,
          },
        }
      );
      if (response.status === 200) {
        setMessage("Invoice added successfully!");
        navigate(-1);
      } else {
        setMessage("Failed to add invoice");
      }
    } catch (error) {
      setMessage("Error adding invoice: " + error.response.data.message);
      console.error("Error adding invoice:", error);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container mt-5">
      <h2>Add Invoice</h2>
      <form onSubmit={handleAddInvoice}>
        <div className="form-group">
          <label>Invoice Number</label>
          <input
            type="text"
            name="invoice_number"
            value={newInvoice.invoice_number}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Invoice Date</label>
          <input
            type="date"
            name="invoice_date"
            value={newInvoice.invoice_date}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Invoice Terms</label>
          <input
            type="text"
            name="invoice_terms"
            value={newInvoice.invoice_terms}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            name="amount"
            value={newInvoice.amount}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        <div className="form-group">
          <label>Has Paid</label>
          <select
            name="hasPaid"
            value={newInvoice.hasPaid}
            onChange={handleChange}
            className="form-control"
          >
            <option value={true}>Yes</option>
            <option value={false}>No</option>
          </select>
        </div>
        <div className="form-group">
          <label>Invoice URL</label>
          <input
            type="text"
            name="invoice_url"
            value={newInvoice.invoice_url}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Quotation URL</label>
          <input
            type="text"
            name="quotation_url"
            value={newInvoice.quotation_url}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Purchase URL</label>
          <input
            type="text"
            name="purchase_url"
            value={newInvoice.purchase_url}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Engineering URL</label>
          <input
            type="text"
            name="engineering_url"
            value={newInvoice.engineering_url}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Include Logs</label>
          <select
            name="include_logs"
            value={newInvoice.include_logs}
            onChange={handleChange}
            className="form-control"
          >
            <option value={true}>Yes</option>
            <option value={false}>No</option>
          </select>
        </div>
        <div className="form-group">
          <label>Note</label>
          <input
            type="text"
            name="note"
            value={newInvoice.note}
            onChange={handleChange}
            className="form-control"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add Invoice
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </form>
      {message && <div className="mt-3 alert alert-info">{message}</div>}
    </div>
  );
}

export default AddInvoice;
