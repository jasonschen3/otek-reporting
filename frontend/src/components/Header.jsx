import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  const stateData = { isAuthenticated: true };
  return (
    <div className="navbar navbar-dark bg-dark">
      <img src="/public/otek-transparent.png" alt="Otek logo"></img>
      <ul>
        <li>
          <Link to="/">Login</Link>
        </li>
        <li>
          <Link to="/projects" state={stateData}>
            Projects
          </Link>
        </li>
        <li>
          <Link to="/addProject" state={stateData}>
            Add Project
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Header;
