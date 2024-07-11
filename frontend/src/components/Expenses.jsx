import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const Expenses = () => {
  let ip = "http://localhost:3000";
  const [expenses, setExpenses] = useState([]);
  const [markedForDeletion, setMarkedForDeletion] = useState([]);
  const [editExpense, setEditExpense] = useState(null);
  const location = useLocation();
  const { project, action, isAuthenticated } = location.state || {};
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchExpenses() {
      try {
        if (!isAuthenticated) {
          navigate("/unauthorized");
          return;
        }
        const response = await axios.post(`${ip}/expenses`, {
          project_id: project.project_id,
          action: action,
        });

        if (response.status === 200) {
          console.log("Expenses data:", response.data);
          setExpenses(response.data);
        } else {
          console.error("Failed to fetch expenses");
        }
      } catch (error) {
        console.error("Error fetching expenses:", error);
      }
    }
    fetchExpenses();
  }, [project, action]);

  function handleAddExpense() {
    navigate("/addExpense", {
      state: {
        projectId: project.project_id,
        projectTitle: project.project_name,
        isAuthenticated: true,
      },
    });
  }

  function handleEditClick(expense) {
    setEditExpense({ ...expense });
    // Scroll to the edit project form
    setTimeout(() => {
      const element = document.getElementById("editExpense");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  }

  function handleDeleteClick(expense) {
    if (markedForDeletion.includes(expense.expense_id)) {
      setMarkedForDeletion(
        markedForDeletion.filter((id) => id !== expense.expense_id)
      );
    } else {
      setMarkedForDeletion([...markedForDeletion, expense.expense_id]);
    }
  }

  async function confirmDelete() {
    try {
      await axios.post(`${ip}/deleteMarkedExpenses`, {
        expenseIds: markedForDeletion,
      });
      setMarkedForDeletion([]);
      const response = await axios.post(`${ip}/expenses`, {
        project_id: project.project_id,
        action: action,
      });

      if (response.status === 200) {
        setExpenses(response.data);
      }
    } catch (error) {
      console.error("Error confirming delete:", error);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditExpense({
      ...editExpense,
      [name]: value === "" ? null : value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(`${ip}/editExpense`, {
        ...editExpense,
      });

      if (response.status === 200) {
        setExpenses(
          expenses.map((expense) =>
            expense.expense_id === editExpense.expense_id
              ? response.data
              : expense
          )
        );
        setEditExpense(null);
        window.location.href = "/expenses";
      } else {
        console.error("Failed to update expense");
      }
    } catch (error) {
      console.error("Error updating expense:", error);
    }
  };

  return (
    <div className="container mt-5" id="expenses">
      <h1>Expenses Report for {project?.project_name || ""}</h1>

      <div className="subheading">
        <button onClick={handleAddExpense}>Add Expense</button>
        <button onClick={confirmDelete}>Confirm Delete</button>
      </div>

      <table className="table mt-3">
        <thead>
          <tr>
            <th>Expense ID</th>
            <th>Project Name</th>
            <th>Expense Date</th>
            <th>Expense Type</th>
            <th>Expense Details</th>
            <th>Amount</th>
            <th>Daily Log ID</th>
            <th>Engineer Name</th>
            <th>Is Billable</th>
            <th>Status 1</th>
            <th>Status 2</th>
            <th>Status 3</th>
            <th>PDF</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <tr
                key={expense.expense_id}
                className={
                  markedForDeletion.includes(expense.expense_id)
                    ? "red-slash"
                    : ""
                }
              >
                <td>{expense.expense_id}</td>
                <td>{expense.project_name}</td>
                <td>{expense.expense_date}</td>
                <td>
                  {expense.expense_type === 0
                    ? "tools"
                    : expense.expense_type === 1
                    ? "transportation"
                    : expense.expense_type === 2
                    ? "meals"
                    : expense.expense_type === 3
                    ? "medical"
                    : expense.expense_type === 4
                    ? "accommodation"
                    : "misc"}
                </td>
                <td>{expense.expense_details}</td>
                <td>{expense.amount}</td>
                <td>{expense.daily_log_id}</td>
                <td>{expense.engineer_name}</td>
                <td>{expense.is_billable === "1" ? "Yes" : "No"}</td>
                <td>{expense.status1 === "1" ? "Yes" : "No"}</td>
                <td>{expense.status2 === "1" ? "Yes" : "No"}</td>
                <td>{expense.status3 === "1" ? "Yes" : "No"}</td>
                <td>
                  <a
                    href={expense.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                </td>
                <td>
                  <button onClick={() => handleEditClick(expense)}>Edit</button>
                  <button onClick={() => handleDeleteClick(expense)}>
                    {markedForDeletion.includes(expense.expense_id)
                      ? "Undo"
                      : "Delete"}
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="14" className="text-center">
                No expenses available
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editExpense && (
        <div id="editExpense" className="edit-form">
          <h2>Edit Expense {editExpense.expense_id}</h2>
          <form>
            <div className="form-group">
              <label>Expense Date</label>
              <input
                type="date"
                name="expense_date"
                value={editExpense.expense_date}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Expense Type</label>
              <select
                name="expense_type"
                value={editExpense.expense_type}
                onChange={handleChange}
                className="form-control"
              >
                <option value={0}>tools</option>
                <option value={1}>transportation</option>
                <option value={2}>meals</option>
                <option value={3}>medical</option>
                <option value={4}>accommodation</option>
                <option value={5}>misc</option>
              </select>
            </div>
            <div className="form-group">
              <label>Expense Details</label>
              <input
                type="text"
                name="expense_details"
                value={editExpense.expense_details}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input
                type="number"
                name="amount"
                value={editExpense.amount}
                onChange={handleChange}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label>Is Billable</label>
              <select
                name="is_billable"
                value={editExpense.is_billable}
                onChange={handleChange}
                className="form-control"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status 1</label>
              <select
                name="status1"
                value={editExpense.status1}
                onChange={handleChange}
                className="form-control"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status 2</label>
              <select
                name="status2"
                value={editExpense.status2}
                onChange={handleChange}
                className="form-control"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status 3</label>
              <select
                name="status3"
                value={editExpense.status3}
                onChange={handleChange}
                className="form-control"
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </div>
            <div className="form-group">
              <label>PDF URL</label>
              <input
                type="text"
                name="pdf_url"
                value={editExpense.pdf_url}
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
          </form>
        </div>
      )}
    </div>
  );
};

export default Expenses;
