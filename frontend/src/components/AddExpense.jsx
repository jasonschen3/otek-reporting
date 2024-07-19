import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";

function AddExpense() {
  let ip = "http://localhost:3000";
  const [message, setMessage] = useState("");
  const [newExpense, setNewExpense] = useState({
    expense_date: "",
    expense_type: "",
    expense_details: "",
    amount: "",
    daily_log_id: "",
    engineer_id: "",
    is_billable: false,
    status1: false,
    status2: false,
    status3: false,
    pdf_url: "",
  });
  const [engineers, setEngineers] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  const location = useLocation();
  const { projectId, projectTitle, isAuthenticated } = location.state || {};
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      nav("/Unauthorized");
      return;
    }
    const fetchEngineers = async () => {
      try {
        const res = await axios.get(`${ip}/engineers`, {
          headers: { "access-token": token },
        });
        setEngineers(res.data);
      } catch (error) {
        console.error("There was an error fetching the engineers data", error);
      }
    };

    fetchEngineers();
  }, [isAuthenticated, nav, ip]);

  useEffect(() => {
    if (selectedDate) {
      const fetchDailyLogs = async () => {
        try {
          const res = await axios.get(`${ip}/dailyLogs`, {
            params: { projectId, date: selectedDate },
            headers: { "access-token": token },
          });
          setDailyLogs(res.data);
        } catch (error) {
          console.error(
            "There was an error fetching the daily logs data",
            error
          );
        }
      };

      fetchDailyLogs();
    }
  }, [projectId, selectedDate, ip]);

  const handleNewExpenseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewExpense({
      ...newExpense,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    const expenseData = {
      ...newExpense,
      project_id: projectId,
      expense_type: newExpense.expense_type
        ? parseInt(newExpense.expense_type)
        : null,
      amount: newExpense.amount ? parseFloat(newExpense.amount) : null,
      engineer_id: newExpense.engineer_id
        ? parseInt(newExpense.engineer_id)
        : null,
      is_billable: newExpense.is_billable ? 1 : 0,
      status1: newExpense.status1 ? 1 : 0,
      status2: newExpense.status2 ? 1 : 0,
      status3: newExpense.status3 ? 1 : 0,
    };

    try {
      const response = await axios.post(`${ip}/addExpense`, expenseData, {
        headers: {
          "access-token": token,
        },
      });
      if (response.status === 200) {
        setNewExpense({
          expense_date: "",
          expense_type: "",
          expense_details: "",
          amount: "",
          daily_log_id: "",
          engineer_id: "",
          is_billable: false,
          status1: false,
          status2: false,
          status3: false,
          pdf_url: "",
        });
        nav(-1);
      } else {
        setMessage("Failed to add expense");
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Error adding expense");
      console.error("Error adding expense:", error);
    }
  };

  const handleCancel = () => {
    nav(-1);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, "MM-dd-yy");
  };

  return (
    <form onSubmit={handleAddExpense} className="container mt-5">
      <h2>Add Expense for {projectTitle}</h2>
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
        <label>Select Date for Daily Log</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Daily Log</label>
        <select
          name="daily_log_id"
          value={newExpense.daily_log_id}
          onChange={handleNewExpenseChange}
          className="form-control"
        >
          <option value="">Select Daily Log</option>
          {dailyLogs.map((log) => (
            <option key={log.daily_log_id} value={log.daily_log_id}>
              {formatDate(log.log_date)} - {log.engineer_name}
            </option>
          ))}
        </select>
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

export default AddExpense;
