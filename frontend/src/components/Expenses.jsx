import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

const Expenses = () => {
  let ip = "http://localhost:3000";
  const [expenses, setExpenses] = useState([]);
  const location = useLocation();
  const { project, action } = location.state;
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchExpenses() {
      try {
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
    navigate("/addExpense");
  }

  return (
    <div className="container mt-5" id="expenses">
      <h1>Expenses Report for {project.project_name}</h1>
      {/* <button onClick={handleAddExpense}>Add Expense</button> */}
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
          </tr>
        </thead>
        <tbody>
          {expenses.length > 0 ? (
            expenses.map((expense) => (
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
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="13" className="text-center">
                No expenses available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Expenses;
