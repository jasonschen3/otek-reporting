import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const Notifications = () => {
  const ip = "http://localhost:3000";
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const nav = useNavigate();
  const { isAuthenticated, project } = location.state || {};
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!isAuthenticated || !token) {
      nav("/unauthorized");
      return;
    }

    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${ip}/notifications`, {
          params: { project_id: project.project_id },
          headers: { "access-token": token },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [isAuthenticated, nav, project, token]);

  const handleBack = () => {
    nav(-1);
  };

  const navAddDailyLog = () => {
    nav("/addDailyLog", {
      state: {
        projectId: project.project_id,
        projectTitle: project.project_name,
        isAuthenticated: true,
      },
    });
  };

  const refreshNotifications = async () => {
    try {
      await axios.post(
        `${ip}/updateNotifications`,
        {},
        {
          headers: { "access-token": token },
        }
      );
      const response = await axios.get(`${ip}/notifications`, {
        params: { project_id: project.project_id },
        headers: { "access-token": token },
      });
      setNotifications(response.data);
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  return (
    <div className="container mt-5">
      <h1>Notifications for {project.project_name}</h1>
      <div className="subheading">
        <button className="btn btn-secondary back" onClick={handleBack}>
          Back
        </button>
        <div>
          <button className="btn btn-primary back" onClick={navAddDailyLog}>
            Add Daily Log
          </button>
          <button
            className="btn btn-primary back"
            onClick={refreshNotifications}
          >
            Refresh Notifications
          </button>
        </div>
      </div>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Type</th>
            <th>Related Date</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((noti) => (
            <tr key={noti.noti_id}>
              <td>{noti.noti_type}</td>
              <td>{noti.formatted_date}</td>
              <td>{noti.noti_message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Notifications;
