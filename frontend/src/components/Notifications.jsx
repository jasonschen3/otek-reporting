import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const Notifications = () => {
  let ip = "http://localhost:3000";
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();
  const nav = useNavigate();
  const { isAuthenticated, project } = location.state || {};

  useEffect(() => {
    if (!isAuthenticated) {
      nav("/unauthorized");
    }
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${ip}/notifications`, {
          params: { project_id: project.project_id },
        });
        setNotifications(response.data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  });

  return (
    <div className="container mt-5">
      <h1>Notifications for {project.project_name}</h1>
      <table className="table mt-3">
        <thead>
          <tr>
            <th>Id</th>
            <th>Type</th>
            <th>Related Date</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((noti) => (
            <tr key={noti.noti_id}>
              <td>{noti.noti_id}</td>
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
