import React, { useState, useEffect } from "react";
import axios from "axios";

function AddExpense() {
  const [message, setMessage] = useState("");
  const [newExpense, setNewExpense] = useState({
    expense_date: "",
    expense_type: "",
    expense_details: "",
    amount: "",
    daily_log_id: "",
    project_id: "",
    engineer_id: "",
    is_billable: false,
    status1: false,
    status2: false,
    status3: false,
    pdf_url: "",
  });
  const [engineers, setEngineers] = useState([]);

  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await axios.get("http://localhost:3000/engineers");
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchEngineers();
  }, []);

  const handleNewExpenseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewExpense({
      ...newExpense,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    // Convert empty strings to null for integer fields
    const expenseData = {
      ...newExpense,
      expense_type: newExpense.expense_type
        ? parseInt(newExpense.expense_type)
        : null,
      amount: newExpense.amount ? parseFloat(newExpense.amount) : null,
      daily_log_id: newExpense.daily_log_id
        ? parseInt(newExpense.daily_log_id)
        : null,
      project_id: newExpense.project_id
        ? parseInt(newExpense.project_id)
        : null,
      engineer_id: newExpense.engineer_id
        ? parseInt(newExpense.engineer_id)
        : null,
      is_billable: newExpense.is_billable ? 1 : 0,
      status1: newExpense.status1 ? 1 : 0,
      status2: newExpense.status2 ? 1 : 0,
      status3: newExpense.status3 ? 1 : 0,
    };

    try {
      const response = await axios.post(
        "http://localhost:3000/addExpense",
        expenseData
      );
      if (response.status === 200) {
        setNewExpense({
          expense_date: "",
          expense_type: "",
          expense_details: "",
          amount: "",
          daily_log_id: "",
          project_id: "",
          engineer_id: "",
          is_billable: false,
          status1: false,
          status2: false,
          status3: false,
          pdf_url: "",
        });
        setMessage("Added expense");
      } else {
        setMessage("Failed to add expense");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding expense");
      console.error("Error adding expense:", error);
    }
  };

  return (
    <form onSubmit={handleAddExpense} className="container mt-5">
      <h2>Add Expense</h2>
      <div className="form-group">
        <label>Expense Date</label>
        <input
          type="date"
          name="expense_date"
          value={newExpense.expense_date}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Expense Type</label>
        <select
          name="expense_type"
          value={newExpense.expense_type}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        >
          <option value="">Select Type</option>
          <option value="0">Tools</option>
          <option value="1">Transportation</option>
          <option value="2">Meals</option>
          <option value="3">Medical</option>
          <option value="4">Accommodation</option>
          <option value="5">Misc</option>
        </select>
      </div>
      <div className="form-group">
        <label>Expense Details</label>
        <input
          type="text"
          name="expense_details"
          value={newExpense.expense_details}
          onChange={handleNewExpenseChange}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          name="amount"
          value={newExpense.amount}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Daily Log ID</label>
        <input
          type="text"
          name="daily_log_id"
          value={newExpense.daily_log_id}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Project ID</label>
        <input
          type="text"
          name="project_id"
          value={newExpense.project_id}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        />
      </div>
      <div className="form-group">
        <label>Engineer</label>
        <select
          name="engineer_id"
          value={newExpense.engineer_id}
          onChange={handleNewExpenseChange}
          className="form-control"
          required
        >
          <option value="">Select Engineer</option>
          {engineers.map((engineer) => (
            <option key={engineer.engineer_id} value={engineer.engineer_id}>
              {engineer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Is Billable</label>
        <input
          type="checkbox"
          name="is_billable"
          checked={newExpense.is_billable}
          onChange={handleNewExpenseChange}
        />
      </div>
      <div className="form-group">
        <label>Status 1 (Submitted to Other Company)</label>
        <input
          type="checkbox"
          name="status1"
          checked={newExpense.status1}
          onChange={handleNewExpenseChange}
        />
      </div>
      <div className="form-group">
        <label>Status 2 (Other Company Paid)</label>
        <input
          type="checkbox"
          name="status2"
          checked={newExpense.status2}
          onChange={handleNewExpenseChange}
        />
      </div>
      <div className="form-group">
        <label>Status 3 (Reimbursed to Engineer)</label>
        <input
          type="checkbox"
          name="status3"
          checked={newExpense.status3}
          onChange={handleNewExpenseChange}
        />
      </div>
      <div className="form-group">
        <label>PDF URL</label>
        <input
          type="text"
          name="pdf_url"
          value={newExpense.pdf_url}
          onChange={handleNewExpenseChange}
          className="form-control"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Add
      </button>
      <div>{message}</div>
    </form>
  );
}

export default AddExpense;
