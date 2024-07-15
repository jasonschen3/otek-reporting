import React from "react";
import { Link } from "react-router-dom";
import GlobalClock from "./GlobalClock";

const Header = () => {
  const stateData = { isAuthenticated: true };
  return (
    <div className="navbar navbar-dark bg-dark">
      <img src="/public/otek-transparent.png" alt="Otek logo"></img>
      <GlobalClock />
      <ul>
        <li>
          <Link to="/">Login</Link>
        </li>
        <li>
          <Link to="/projects" state={stateData}>
            Projects
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Header;
