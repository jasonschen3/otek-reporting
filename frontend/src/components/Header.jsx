import React from "react";
import { Link } from "react-router-dom";
import GlobalClock from "./GlobalClock"; // Assuming GlobalClock is another component

const Header = () => {
  return (
    <div className="navbar navbar-dark bg-dark">
      <div className="navbar-container">
        <Link to="/projects">
          <img
            src="/otek-transparent.png"
            alt="Otek logo"
            className="navbar-logo"
          />
        </Link>
        <GlobalClock className="navbar-clock" />
        <ul className="navbar-links">
          <li>
            <Link to="/">Login</Link>
          </li>
          <li>
            <Link to="/projects">Projects</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Header;
