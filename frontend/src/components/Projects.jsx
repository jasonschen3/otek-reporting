import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BACKEND_IP } from "../constants";
import {
  formatUrl,
  checkYesterdayTodayRender,
  getProjectStatus,
  formatMoney,
} from "../utils";

function Projects() {
  const [projects, setProjects] = useState([]);
  const [editProject, setEditProject] = useState(null);
  const [entriesStatus, setEntriesStatus] = useState({}); // Log status
  const [expensesStatus, setExpensesStatus] = useState({});
  const [notificationsCount, setNotificationsCount] = useState({});
  const [latestInvoiceDates, setLatestInvoiceDates] = useState({});
  const [permissionLevel, setPermissionLevel] = useState(0);
  const [companies, setCompanies] = useState([]);
  const [displayStatus, setDisplayStatus] = useState(5); // Default to All
  const [selectedCompany, setSelectedCompany] = useState("All"); // State for selected company
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalOverduePayments, setTotalOverduePayments] = useState(0);

  const bottomRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const decoded = jwtDecode(token);
    setPermissionLevel(decoded.permission_level);
    fetchProjects(displayStatus, selectedCompany);
    fetchCompanies();
  }, [navigate, token]);

  useEffect(() => {
    projects.forEach((project) => {
      fetchNotificationsCount(project.project_id);
    });
  }, [projects]);

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

  const fetchOverduePayments = async (projectID) => {
    try {
      const response = await axios.get(`${BACKEND_IP}/overduePayments`, {
        headers: {
          "access-token": token,
        },
        params: {
          projectID: projectID,
        },
      });
      console.log("Fetch overdue payments", response.data);
      return response.data;
    } catch (error) {
      console.error("Error fetching overdue payments:", error);
    }
  };

  const fetchProjects = async (status, selectedCompany) => {
    try {
      const projectsResponse = await axios.get(`${BACKEND_IP}/projects`, {
        headers: {
          "access-token": token,
        },
        params: {
          projectDisplayStatus: status,
          selectedCompanyName: selectedCompany,
        },
      });

      const projects = projectsResponse.data;
      setProjects(projects);
      calculateTotalAmount(projects);

      const overduePaymentsMap = {};

      // Fetch overdue payments for each project
      for (const project of projects) {
        const overduePayments = await fetchOverduePayments(project.project_id);
        if (overduePayments && overduePayments.length > 0) {
          overduePaymentsMap[project.project_id] =
            overduePayments[0].total_overdue || 0;
        }
      }

      // Sum up all overdue payments
      const totalOverduePayments = Object.values(overduePaymentsMap).reduce(
        (sum, overdue) => sum + Number(overdue),
        0
      );
      setTotalOverduePayments(totalOverduePayments);

      const [entriesRes, expensesRes] = await axios.all([
        axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=false`, {
          headers: { "access-token": token },
        }),
        axios.get(`${BACKEND_IP}/projectEntriesStatus?checkExpenses=true`, {
          headers: { "access-token": token },
        }),
      ]);

      const entriesStatusData = entriesRes.data.reduce((acc, status) => {
        acc[status.project_id] = {
          today: status.today,
          yesterday: status.yesterday,
          end_date: status.end_date_status,
        };
        return acc;
      }, {});
      setEntriesStatus(entriesStatusData);

      const expensesStatusData = expensesRes.data.reduce((acc, status) => {
        acc[status.project_id] = {
          today: status.today,
          yesterday: status.yesterday,
          end_date: status.end_date_status,
        };
        return acc;
      }, {});
      setExpensesStatus(expensesStatusData);

      const invoiceRes = await axios.get(`${BACKEND_IP}/latestInvoiceDate`, {
        headers: { "access-token": token },
      });
      const latestInvoiceDatesData = invoiceRes.data.reduce((acc, invoice) => {
        acc[invoice.project_id] = invoice.latest_invoice_date;
        return acc;
      }, {});
      setLatestInvoiceDates(latestInvoiceDatesData);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchNotificationsCount = async (projectId) => {
    try {
      const response = await axios.get(`${BACKEND_IP}/notifications`, {
        params: { project_id: projectId },
        headers: { "access-token": token },
      });

      const type1Count = response.data.filter(
        (noti) => noti.noti_type === 1
      ).length;
      const type2Count = response.data.filter(
        (noti) => noti.noti_type === 2
      ).length;
      const type3Count = response.data.filter(
        (noti) => noti.noti_type === 3
      ).length;

      // Get the total amount directly from the Type 4 notifications
      const type4Notification = response.data.find(
        (noti) => noti.noti_type === 4
      );

      let type4Amount = 0;
      if (type4Notification) {
        const amountMatch =
          type4Notification.noti_message.match(/\$\d+(\.\d{2})?/);
        type4Amount = amountMatch[0];
      }
      const type5Count = response.data.filter(
        (noti) => noti.noti_type === 5
      ).length;

      setNotificationsCount((prev) => ({
        ...prev,
        [projectId]: {
          type1: type1Count,
          type2: type2Count,
          type3: type3Count,
          type4: type4Amount, // Store the amount directly
          type5: type5Count,
        },
      }));
    } catch (error) {
      console.error("Error fetching notifications count:", error);
    }
  };

  const handleRefreshAll = async () => {
    try {
      await axios.post(`${BACKEND_IP}/refreshAllNotifications`, null, {
        headers: { "access-token": token },
      });
      console.log("Refreshed");
      window.location.reload();
    } catch (error) {
      console.log("Error refreshing all notifications ", error);
    }
  };

  const handleEditClick = (project) => {
    setEditProject({ ...project });
    setTimeout(() => {
      const element = document.getElementById("editProject");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditProject({
      ...editProject,
      [name]: value === "" ? null : value,
    });
  };

  const handleSave = async () => {
    try {
      const response = await axios.post(
        `${BACKEND_IP}/editProject`,
        { ...editProject },
        {
          headers: { "access-token": token },
        }
      );

      if (response.status === 200) {
        setProjects(
          projects.map((project) =>
            project.project_id === editProject.project_id
              ? response.data
              : project
          )
        );
        setEditProject(null);
        window.location.href = "/projects";
      } else {
        console.error("Failed to update project");
      }
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditProject(null);
  };

  const handleDeleteClick = async (projectId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (isConfirmed) {
      try {
        await axios.post(
          `${BACKEND_IP}/deleteMarkedProjects`,
          { projectIds: [projectId] },
          {
            headers: { "access-token": token },
          }
        );
        const response = await axios.get(`${BACKEND_IP}/projects`, {
          headers: { "access-token": token },
          params: {
            projectDisplayStatus: displayStatus,
            selectedCompanyName: selectedCompany,
          },
        });
        if (response.status === 200) {
          setProjects(response.data);
        } else {
          console.error("Failed to fetch updated projects");
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Error confirming delete:", error.message);
          alert("Must delete all expenses and daily logs associated first.");
        } else {
          console.error("Unexpected error:", error);
        }
      }
    }
  };

  const handleDisplayChange = async (e) => {
    const newStatus = parseInt(e.target.value);
    setDisplayStatus(newStatus);
    await fetchProjects(newStatus, selectedCompany);
  };

  const handleCompanyChange = async (e) => {
    const selectedCompanyName = e.target.value;
    setSelectedCompany(selectedCompanyName);
    await fetchProjects(displayStatus, selectedCompanyName);
    calculateTotalAmount(projects);
  };

  const calculateTotalAmount = (projects) => {
    const total = projects.reduce(
      (sum, project) => sum + Number(project.amount || 0),
      0
    );
    setTotalAmount(total);
  };

  const navigateTo = (path, state) => {
    navigate(path, { state });
  };

  const handleScrollToBottom = () => {
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="project-container mt-5">
      <h1>Projects Report</h1>
      <div className="subheading">
        <div className="status-container">
          <div>
            <form>
              <div className="form-group">
                <label htmlFor="projectStatusSelect">Project Status</label>
                <select
                  id="projectStatusSelect"
                  value={displayStatus}
                  /* PARSE INT FOR SELECTING INT */
                  onChange={handleDisplayChange}
                  className="form-control"
                >
                  <option value={5}>All</option>
                  <option value={1}>Ongoing</option>
                  <option value={2}>Completed</option>
                  <option value={3}>Bill Submitted</option>
                  <option value={4}>To Be Submitted</option>
                </select>
              </div>
            </form>
          </div>
          <div className="form-group">
            <form>
              <label htmlFor="companySelect">Company</label>
              <select
                id="companySelect"
                value={selectedCompany}
                onChange={handleCompanyChange}
                className="form-control"
              >
                <option value="All">All Companies</option>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_name}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </form>
          </div>
          <div>
            <br />
            <button className="btn btn-primary" onClick={handleScrollToBottom}>
              Scroll to Bottom
            </button>
          </div>
        </div>
        <div>
          {permissionLevel >= 2 && (
            <>
              <button
                onClick={() => navigateTo("/register")}
                className="btn btn-primary add"
              >
                Register User
              </button>
              <button
                onClick={() => navigateTo("/manageCompanies")}
                className="btn btn-primary add"
              >
                Manage Companies
              </button>
              <button
                onClick={() => navigateTo("/manageEngineers")}
                className="btn btn-primary add"
              >
                Manage Engineers
              </button>
              <button
                onClick={() => navigateTo("/addProject")}
                className="btn btn-primary add"
              >
                Add Project
              </button>
            </>
          )}
        </div>
      </div>
      {/*Start of projects table */}
      <div id="project-table">
        <table className="table mt-3">
          <thead>
            <tr>
              <th>Company</th>
              <th>Project #</th>
              <th>Name</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Location</th>
              <th>Notes</th>
              <th>Quote</th>
              <th>Purchase</th>
              <th>Contract ID</th>
              <th>Amount ($)</th>
              <th>Engineer Names</th>
              <th>Daily Logs</th>
              <th>Expenses</th>
              <th>Invoices</th>
              <th>Otek Invoice #</th>
              <th>
                Notifications{" "}
                <button onClick={handleRefreshAll} className="btn btn-primary">
                  Refresh All
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.project_id}>
                <td>{project.company_name}</td>
                <td>{project.project_number}</td>
                <td className="project-name">{project.project_name}</td>
                <td>{getProjectStatus(project.project_status)}</td>
                <td>{project.start_date}</td>
                <td>{project.end_date}</td>
                <td>{project.location}</td>
                <td className="wider-col">{project.details}</td>
                <td>
                  {project.quotation_url && (
                    <a
                      href={formatUrl(project.quotation_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>
                  {project.purchase_url && (
                    <a
                      href={formatUrl(project.purchase_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  )}
                </td>
                <td>{project.contract_id}</td>
                <td>{formatMoney(project.amount)}</td>
                <td className="wider-col">
                  {project.engineer_names.split(", ").map((name, index) => (
                    <span key={index} className="engineer-name">
                      <div style={{ display: "block" }}>
                        {index + 1}: {name}
                      </div>
                    </span>
                  ))}
                </td>
                <td>
                  {checkYesterdayTodayRender(project) === 1 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/dailyLogs", {
                            projectId: project.project_id,
                            action: "Today",
                          })
                        }
                        className={
                          entriesStatus[project.project_id]?.today
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        Today
                      </button>
                      <button
                        onClick={() =>
                          navigateTo("/dailyLogs", {
                            projectId: project.project_id,
                            action: "Yesterday",
                          })
                        }
                        className={
                          entriesStatus[project.project_id]?.yesterday
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        Yesterday
                      </button>
                    </>
                  )}
                  {checkYesterdayTodayRender(project) === 2 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/dailyLogs", {
                            projectId: project.project_id,
                            action: "End Date",
                          })
                        }
                        className={
                          entriesStatus[project.project_id]?.end_date
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        {project.end_date}
                      </button>
                    </>
                  )}
                  {checkYesterdayTodayRender(project) === 3 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/dailyLogs", {
                            projectId: project.project_id,
                            action: "End Date",
                          })
                        }
                        className={
                          entriesStatus[project.project_id]?.end_date
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        {project.end_date}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      navigateTo("/dailyLogs", {
                        projectId: project.project_id,
                        action: "View All",
                      })
                    }
                  >
                    View All
                  </button>
                </td>
                <td>
                  {checkYesterdayTodayRender(project) === 1 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/expenses", {
                            project: project,
                            action: "Today",
                          })
                        }
                        className={
                          expensesStatus[project.project_id]?.today
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        Today
                      </button>
                      <button
                        onClick={() =>
                          navigateTo("/expenses", {
                            project: project,
                            action: "Yesterday",
                          })
                        }
                        className={
                          expensesStatus[project.project_id]?.yesterday
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        Yesterday
                      </button>
                    </>
                  )}
                  {checkYesterdayTodayRender(project) === 2 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/expenses", {
                            project: project,
                            action: "End Date",
                          })
                        }
                        className={
                          expensesStatus[project.project_id]?.end_date
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        {project.end_date}
                      </button>
                    </>
                  )}
                  {checkYesterdayTodayRender(project) === 3 && (
                    <>
                      <button
                        onClick={() =>
                          navigateTo("/expenses", {
                            project: project,
                            action: "End Date",
                          })
                        }
                        className={
                          expensesStatus[project.project_id]?.end_date
                            ? "btn btn-success"
                            : "btn btn-danger"
                        }
                      >
                        {project.end_date}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      navigateTo("/expenses", {
                        project: project,
                        action: "View All",
                      })
                    }
                  >
                    View All
                  </button>
                </td>
                <td>
                  <button
                    onClick={() =>
                      navigateTo("/invoices", {
                        project: project,
                        action: "Latest",
                      })
                    }
                    className={
                      latestInvoiceDates[project.project_id]
                        ? "btn btn-success"
                        : "btn btn-danger"
                    }
                  >
                    Latest
                  </button>
                  <button
                    onClick={() =>
                      navigateTo("/invoices", {
                        project: project,
                        action: "View All",
                      })
                    }
                  >
                    View All
                  </button>
                </td>
                <td>{project.otek_invoice}</td>
                <td className="wider-col">
                  <div>
                    {notificationsCount[project.project_id] !== undefined ? (
                      <ul className="notification-list">
                        {notificationsCount[project.project_id].type1 !== 0 && (
                          <li className="highlight">{`${
                            notificationsCount[project.project_id].type1
                          } missing logs`}</li>
                        )}
                        {notificationsCount[project.project_id].type3 !== 0 && (
                          <li className="highlight">{`${
                            notificationsCount[project.project_id].type3
                          } missing invoices`}</li>
                        )}
                        {(notificationsCount[project.project_id].type2 !== 0 ||
                          notificationsCount[project.project_id].type4 !==
                            0) && (
                          <li className="highlight">
                            {notificationsCount[project.project_id].type2 !==
                              0 &&
                              `${
                                notificationsCount[project.project_id].type2
                              } overdue payments`}
                            {notificationsCount[project.project_id].type2 !==
                              0 &&
                              notificationsCount[project.project_id].type4 !==
                                0 &&
                              " and "}
                            {notificationsCount[project.project_id].type4 !==
                              0 &&
                              `(${
                                notificationsCount[project.project_id].type4
                              } total)`}
                          </li>
                        )}
                        {notificationsCount[project.project_id].type5 !== 0 && (
                          <li className="highlight">{`Error: end date should not be before start date`}</li>
                        )}
                      </ul>
                    ) : (
                      ""
                    )}
                  </div>

                  <button
                    onClick={() =>
                      navigateTo("/notifications", { project: project })
                    }
                  >
                    View Notifications
                  </button>
                </td>
                <td>
                  {permissionLevel >= 2 && (
                    <>
                      <button onClick={() => handleEditClick(project)}>
                        Edit Project
                      </button>
                      <button
                        onClick={() =>
                          navigateTo("/editEngineers", { project: project })
                        }
                      >
                        Edit Engineers
                      </button>
                      <button
                        onClick={() => handleDeleteClick(project.project_id)}
                      >
                        Delete Project
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="11" style={{ textAlign: "right" }}>
                <strong>Total Amount:</strong>
              </td>
              <td>{formatMoney(totalAmount)}</td>
              <td colSpan="7" style={{ textAlign: "right" }}>
                <strong>
                  Total Overdue Amount: {formatMoney(totalOverduePayments)}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
        <div ref={bottomRef}></div>
        {editProject && (
          <div id="editProject" className="edit-form">
            <h2>Edit Project {editProject.project_name}</h2>
            <form>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  name="project_name"
                  value={editProject.project_name}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Project Status</label>
                <select
                  name="project_status"
                  value={editProject.project_status}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value={1}>Ongoing</option>
                  <option value={2}>Completed</option>
                  <option value={3}>Bill Submitted</option>
                  <option value={4}>To Be Submitted</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={editProject.start_date}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={editProject.end_date || ""}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input
                  type="text"
                  name="details"
                  value={editProject.details}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={editProject.location}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Quotation URL</label>
                <input
                  type="text"
                  name="quotation_url"
                  value={editProject.quotation_url}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Purchase URL</label>
                <input
                  type="text"
                  name="purchase_url"
                  value={editProject.purchase_url}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Amount ($)</label>
                <input
                  type="number"
                  name="amount"
                  value={editProject.amount}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Contract ID</label>
                <input
                  type="text"
                  name="contract_id"
                  value={editProject.contract_id}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Otek Invoice</label>
                <input
                  type="text"
                  name="otek_invoice"
                  value={editProject.otek_invoice}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Company Name</label>
                <select
                  name="company_name"
                  value={editProject.company_name}
                  onChange={handleChange}
                  className="form-control"
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option
                      key={company.company_id}
                      value={company.company_name}
                    >
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Project Number</label>
                <input
                  type="number"
                  name="project_number"
                  value={editProject.project_number}
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
    </div>
  );
}

export default Projects;
