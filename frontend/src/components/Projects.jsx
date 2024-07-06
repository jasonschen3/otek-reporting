import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";

function Projects() {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the projects data from the server
    axios
      .get("http://localhost:3000/projects")
      .then((res) => {
        console.log("projects data: ", res.data);
        setProjects(res.data);
      })
      .catch((error) => {
        console.error("There was an error fetching the projects data!", error);
      });
  }, []);

  async function handleUpdateProjectDisplay(event) {
    event.preventDefault();
    const ongoing = document.getElementById("ongoingCheckbox").checked;
    const completed = document.getElementById("completedCheckbox").checked;

    console.log("Ongoing:", ongoing);
    console.log("Completed:", completed);

    try {
      const response = await axios.post(
        "http://localhost:3000/updateProjectDisplay",
        {
          ongoing: ongoing,
          completed: completed,
        }
      );

      if (response.status === 200) {
        window.location.href = "/projects";
      } else {
        console.error("Failed to update project display");
      }
    } catch (error) {
      console.error("Error updating project display:", error);
    }
  }

  function navigateToDailyLogs(projectId, action) {
    navigate(`/dailyLogs/${projectId}/${action}`);
  }

  function navigateToExpenses(project, action) {
    navigate("/expenses", { state: { project, action } });
  }

  // ADD ON CLICK FOR EXPENSES AND DAILY LOG
  return (
    <div className="container mt-5">
      <h1>Projects Report</h1>
      <form onSubmit={handleUpdateProjectDisplay}>
        <label>
          <input type="checkbox" name="ongoing" id="ongoingCheckbox" />
          Ongoing
        </label>
        <label>
          <input type="checkbox" name="completed" id="completedCheckbox" />
          Completed
        </label>
        <button type="submit">Display</button>
      </form>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Project ID</th>
            <th>Project Name</th>
            <th>Project Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Details</th>
            <th>Location</th>
            <th>Staff Names</th>
            <th>Daily Logs</th>
            <th>Expenses</th>
            <th>Notifications</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.project_id}>
              <td>{project.project_id}</td>
              <td>{project.project_name}</td>
              <td>{project.project_status === 1 ? "Ongoing" : "Complete"}</td>
              <td>{project.start_date}</td>
              <td>{project.end_date}</td>
              <td>{project.details}</td>
              <td>{project.location}</td>
              <td>
                {project.staff_names.split(", ").map((name, index) => (
                  <span key={index} className="staff-name">
                    {name}
                  </span>
                ))}
              </td>
              <td>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "Yesterday")
                  }
                >
                  Yesterday
                </button>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "Today")
                  }
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    navigateToDailyLogs(project.project_id, "View All")
                  }
                >
                  View All
                </button>
              </td>
              <td>
                <button
                  onClick={() => navigateToExpenses(project, "Yesterday")}
                >
                  Yesterday
                </button>
                <button onClick={() => navigateToExpenses(project, "Today")}>
                  Today
                </button>
                <button onClick={() => navigateToExpenses(project, "View All")}>
                  View All
                </button>
              </td>
              <td>{project.notifications}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Projects;
