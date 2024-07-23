import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BACKEND_IP } from "../constants";

const formatUrl = (url) => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
};

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [editInvoice, setEditInvoice] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { project } = location.state || {};
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/unauthorized");
      return;
    }
    const decoded = jwtDecode(token);
    setPermissionLevel(decoded.permission_level);

    try {
      axios
        .get(`${BACKEND_IP}/invoices`, {
          params: { project_id: project.project_id },
          headers: {
            "access-token": token,
          },
        })
        .then((res) => {
          setInvoices(res.data);
        })
        .catch((err) => {
          console.error("Error fetching invoices data:", err);
        });
    } catch (err) {
      console.log("Error fetching invoices ", err);
    }
  }, [navigate, project, token]);

  const handleEditClick = (invoice) => {
    setEditInvoice({ ...invoice });
    setTimeout(() => {
      const element = document.getElementById("editInvoice");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  };

  const handleDeleteClick = async (invoiceId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this invoice?"
    );
    if (isConfirmed) {
      try {
        const response = await axios.post(
          `${BACKEND_IP}/deleteInvoice`,
          { internal_id: invoiceId },
          {
            headers: {
              "access-token": token,
            },
          }
        );
        if (response.status === 200) {
          setInvoices(
            invoices.filter((invoice) => invoice.internal_id !== invoiceId)
          );
        } else {
          console.error("Failed to delete invoice");
        }
      } catch (error) {
        console.error("Error deleting invoice:", error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditInvoice({
      ...editInvoice,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_IP}/editInvoice`,
        {
          ...editInvoice,
        },
        {
          headers: {
            "access-token": token,
          },
        }
      );

      if (response.status === 200) {
        setInvoices(
          invoices.map((invoice) =>
            invoice.internal_id === editInvoice.internal_id
              ? response.data
              : invoice
          )
        );
        setEditInvoice(null);
        window.location.href = "/invoices";
      } else {
        console.error("Failed to update invoice");
      }
    } catch (error) {
      console.error("Error updating invoice:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditInvoice(null);
  };

  const handleAddInvoice = () => {
    navigate("/addInvoice", {
      state: { project: project },
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container mt-5">
      <h1>Invoices for {project.project_name}</h1>
      <div className="subheading">
        <button onClick={handleBack} className="btn btn-secondary back">
          Back
        </button>
        {permissionLevel >= 1 && (
          <button onClick={handleAddInvoice} className="btn btn-primary add">
            Add Invoice
          </button>
        )}
      </div>
      {invoices.length === 0 ? (
        <div className="alert alert-info mt-3">No invoices to show</div>
      ) : (
        <table className="table mt-3">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Invoice Date</th>
              <th>Invoice Terms</th>
              <th>Amount</th>
              <th>Has Paid</th>
              <th>Invoice URL</th>
              <th>Quotation URL</th>
              <th>Purchase URL</th>
              <th>Engineering URL</th>
              <th>Include Logs</th>
              <th>Note</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.internal_id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.invoice_date}</td>
                <td>{invoice.invoice_terms}</td>
                <td>{invoice.amount}</td>
                <td>{invoice.has_paid ? "Yes" : "No"}</td>
                <td>
                  {invoice.invoice_url && (
                    <a
                      href={formatUrl(invoice.invoice_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>
                  {invoice.quotation_url && (
                    <a
                      href={formatUrl(invoice.quotation_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>
                  {invoice.purchase_url && (
                    <a
                      href={formatUrl(invoice.purchase_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>
                  {invoice.engineering_url && (
                    <a
                      href={formatUrl(invoice.engineering_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>{invoice.include_logs ? "Yes" : "No"}</td>
                <td>{invoice.note}</td>
                <td>
                  {permissionLevel >= 2 && (
                    <>
                      <button onClick={() => handleEditClick(invoice)}>
                        Edit Invoice
                      </button>
                      <button
                        onClick={() => handleDeleteClick(invoice.internal_id)}
                      >
                        Delete Invoice
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editInvoice && (
        <div id="editInvoice" className="edit-form">
          <h2>Edit Invoice {editInvoice.internal_id}</h2>
          <form>
            <div className="form-group">
              <label>Invoice Number</label>
              <input
                type="text"
                name="invoice_number"
                value={editInvoice.invoice_number}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Invoice Date</label>
              <input
                type="date"
                name="invoice_date"
                value={editInvoice.invoice_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Invoice Terms</label>
              <input
                type="text"
                name="invoice_terms"
                value={editInvoice.invoice_terms}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={editInvoice.amount}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Has Paid</label>
              <select
                name="has_paid"
                value={editInvoice.has_paid}
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
                value={editInvoice.invoice_url}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Quotation URL</label>
              <input
                type="text"
                name="quotation_url"
                value={editInvoice.quotation_url}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Purchase URL</label>
              <input
                type="text"
                name="purchase_url"
                value={editInvoice.purchase_url}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Engineering URL</label>
              <input
                type="text"
                name="engineering_url"
                value={editInvoice.engineering_url}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Include Logs</label>
              <select
                name="include_logs"
                value={editInvoice.include_logs}
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
                value={editInvoice.note}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Invoices;
