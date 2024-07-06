import React, { useState } from "react";
import "./App.css";
import Login from "./components/Login";
// import "bootstrap/dist/css/bootstrap.min.css"; this can be used if the index.html one isn't used
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./components/Register";
import Projects from "./components/Projects";
import DailyLogs from "./components/DailyLogs";
import Expenses from "./components/Expenses";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />}></Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />}></Route>
        <Route path="/projects" element={<Projects />}></Route>
        <Route
          path="/dailyLogs/:projectId/:action"
          element={<DailyLogs />}
        ></Route>
        <Route path="/expenses" element={<Expenses />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
