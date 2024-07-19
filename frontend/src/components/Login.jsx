import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  let ip = "http://localhost:3000";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); // Initialize the navigate function

  function handleSubmit(event) {
    event.preventDefault();
    console.log("username react", username);
    axios
      .post(`${ip}/login`, {
        username: username,
        password: password,
      })
      .then((res) => {
        if (res.status === 200) {
          console.log("Frontend login successful");

          // Sets item, IMPORTANT
          localStorage.setItem("token", res.data.token);
          console.log(res.data);
          navigate("/projects", { state: { isAuthenticated: true } });
        } else {
          console.log("Wrong credentials");
          setMessage("Wrong credentials");
        }
      })
      .catch((err) => {
        if (err.response && err.response.status === 401) {
          setMessage("Invalid credentials. Please try again.");
        } else {
          setMessage("An error occurred. Please try again later.");
        }
        console.log(err);
      });
  }

  return (
    <div className="container mt-5">
      <h1>Login</h1>
      <div className="center-container">
        <div className="col-sm-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    onChange={(e) => setUsername(e.target.value)}
                    value={username}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                  />
                </div>
                <br />
                <button type="submit" className="btn btn-dark">
                  Login
                </button>
              </form>
              {message ? (
                <p className="mt-3 text-danger">{message}</p>
              ) : (
                <p></p>
              )}
              {/* <Link to="/register" className="btn btn-info b-110">
                Register
              </Link> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
