import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const location = useLocation();
  const { project, action } = location.state;

  useEffect(() => {
    async function fetchExpenses() {
      try {
        const response = await axios.post("http://localhost:3000/expenses", {
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

  return (
    <div className="container mt-5" id="expenses">
      <nav className="navbar navbar-light bg-light">
        <a className="navbar-brand" href="#">
          <img
            src="/images/otek-transparent.png"
            width="30"
            height="30"
            className="d-inline-block align-top"
            alt=""
          />
        </a>
        <a className="btn btn-light btn-lg" href="/logout" role="button">
          Log Out
        </a>
      </nav>
      <h1>Expenses Report</h1>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Expense ID</th>
            <th>Project Name</th>
            <th>Expense Date</th>
            <th>Expense Type</th>
            <th>Amount</th>
            <th>Daily Log ID</th>
            <th>Staff Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.expense_id}>
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
              <td>{expense.amount}</td>
              <td>{expense.daily_log_id}</td>
              <td>{expense.staff_name}</td>
              <td>
                {expense.status === 0
                  ? "not-filled"
                  : expense.status === 1
                  ? "filled"
                  : "covered"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Expenses;
