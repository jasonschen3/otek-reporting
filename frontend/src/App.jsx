import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Projects from "./components/Projects";
import DailyLogs from "./components/DailyLogs";
import AddProject from "./components/AddProject";
import Expenses from "./components/Expenses";
import AddExpense from "./components/AddExpense";
import AddDailyLog from "./components/AddDailyLog";
import Unauthorized from "./components/Unauthorized";
import EditEngineers from "./components/EditEngineers";
import Layout from "./components/Layout";
import Notifications from "./components/Notifications";
import Invoices from "./components/Invoice";
import AddInvoice from "./components/AddInvoice";
import AddCompany from "./components/AddCompany";
import ManageEngineers from "./components/ManageEngineers";
import ManageCompanies from "./components/ManageCompanies";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route element={<Layout />}>
          <Route path="/register" element={<Register />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/addProject" element={<AddProject />} />
          <Route path="/dailyLogs" element={<DailyLogs />} />
          <Route path="/addDailyLog" element={<AddDailyLog />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/addExpense" element={<AddExpense />} />
          <Route path="/editEngineers" element={<EditEngineers />} />
          <Route path="/manageEngineers" element={<ManageEngineers />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/addInvoice" element={<AddInvoice />} />
          <Route path="/addCompany" element={<AddCompany />} />
          <Route path="/manageCompanies" element={<ManageCompanies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
