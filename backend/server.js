import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import LocalStrategy from "passport-local";
import session from "express-session";
import env from "dotenv";

import cors from "cors"; // NEEDS TO CONNECT

const port = 3000;
const saltRounds = 10;

env.config();

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

let projectsInfo = []; // arr of json
let dailyLogsInfo = [];
let expensesInfo = [];
let projectDisplayStatus = 1; // 0 1 2 3, display none, display ongoing, display completed, display all

async function updateCompanyInfo() {
  // Change the table here
  // Projects query depends on project status
  let currProjectsInfo = null;
  if (projectDisplayStatus === 1) {
    // ongoing
    currProjectsInfo = await db.query(
      "SELECT p.project_id, p.project_name, p.project_status, TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, STRING_AGG(s.name, ', ') AS staff_names, p.details, p.location, p.notifications FROM projects p JOIN project_staff ps ON p.project_id = ps.project_id JOIN staff s ON ps.staff_id = s.staff_id WHERE p.project_status = 1 GROUP BY p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications ORDER BY p.project_id;"
    );
  } else if (projectDisplayStatus === 0) {
    // none
    currProjectsInfo = await db.query("");
  } else if (projectDisplayStatus === 2) {
    // finished only
    currProjectsInfo = await db.query(
      "SELECT p.project_id, p.project_name, p.project_status, TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, STRING_AGG(s.name, ', ') AS staff_names, p.details, p.location, p.notifications FROM projects p JOIN project_staff ps ON p.project_id = ps.project_id JOIN staff s ON ps.staff_id = s.staff_id WHERE p.project_status = 0 GROUP BY p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications ORDER BY p.project_id;"
    );
  } else {
    currProjectsInfo = await db.query(
      "SELECT p.project_id, p.project_name, p.project_status, TO_CHAR (p.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR (p.end_date, 'YYYY-MM-DD') AS end_date, STRING_AGG (s.name, ', ') AS staff_names, p.details, p.location, p.notifications FROM projects p JOIN project_staff ps ON p.project_id = ps.project_id JOIN staff s ON ps.staff_id = s.staff_id GROUP BY p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications ORDER BY p.project_id;"
    );
  }
  projectsInfo = currProjectsInfo.rows;
}

// Function to get formatted date string (e.g., YYYY-MM-DD)
const getFormattedDate = (date) => {
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
};

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/projects", async (req, res) => {
  // if (!req.isAuthenticated()) {
  //   console.log("Not authorized");
  //   return res.status(401).json({ message: "Not authorized" });
  // }

  try {
    await updateCompanyInfo(); // Perform the asynchronous operation
    res.json(projectsInfo);
  } catch (error) {
    console.error("Error updating company info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Handle click daily logs
app.post("/dailyLogs", async (req, res) => {
  const projectId = req.body.project_id;

  const action = req.body.action;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  let currDailyLogsInfo = null;

  // console.log(req.body.project_id);
  if (action === "Yesterday") {
    currDailyLogsInfo = await db.query(
      `SELECT dl.daily_log_id, TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, p.project_name, STRING_AGG(s.name, ', ') AS staff_names, dl.status, dl.reimbursed, dl.hours, dl.pdf_url FROM daily_logs dl JOIN projects p ON dl.project_id = p.project_id JOIN staff s ON dl.staff_id = s.staff_id WHERE dl.project_id = $1 AND log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status, dl.reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`,
      [projectId, formattedYesterday]
    );
  } else if (action === "Today") {
    currDailyLogsInfo = await db.query(
      `SELECT dl.daily_log_id, TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, p.project_name, STRING_AGG(s.name, ', ') AS staff_names, dl.status, dl.reimbursed, dl.hours, dl.pdf_url FROM daily_logs dl JOIN projects p ON dl.project_id = p.project_id JOIN staff s ON dl.staff_id = s.staff_id WHERE dl.project_id = $1 AND log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status, dl.reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`,
      [projectId, formattedToday]
    );
  } else if (action === "View All") {
    currDailyLogsInfo = await db.query(
      `SELECT dl.daily_log_id, TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, p.project_name, STRING_AGG(s.name, ', ') AS staff_names, dl.status, dl.reimbursed, dl.hours, dl.pdf_url FROM daily_logs dl JOIN projects p ON dl.project_id = p.project_id JOIN staff s ON dl.staff_id = s.staff_id WHERE dl.project_id = $1 GROUP BY dl.daily_log_id, p.project_name, dl.status, dl.reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`,
      [projectId]
    );
  } else {
    res.send("Unknown action");
  }

  dailyLogsInfo = currDailyLogsInfo.rows;
  res.json(dailyLogsInfo);
});

app.post("/expenses", async (req, res) => {
  const projectId = req.body.project_id;

  const action = req.body.action;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  let currExpensesInfo = null;

  if (action === "Yesterday") {
    currExpensesInfo = await db.query(
      "SELECT e.expense_id, p.project_name, TO_CHAR (e.expense_date, 'YYYY-MM-DD') AS expense_date, e.expense_type, e.amount, e.daily_log_id, s.name AS staff_name, e.status FROM expenses e JOIN projects p ON e.project_id = p.project_id JOIN staff s ON e.staff_id = s.staff_id WHERE e.project_id = $1 AND expense_date = $2 ORDER BY e.expense_id",
      [projectId, formattedYesterday]
    );
  } else if (action === "Today") {
    currExpensesInfo = await db.query(
      "SELECT e.expense_id, p.project_name, TO_CHAR (e.expense_date, 'YYYY-MM-DD') AS expense_date, e.expense_type, e.amount, e.daily_log_id, s.name AS staff_name, e.status FROM expenses e JOIN projects p ON e.project_id = p.project_id JOIN staff s ON e.staff_id = s.staff_id WHERE e.project_id = $1 AND expense_date = $2 ORDER BY e.expense_id",
      [projectId, formattedToday]
    );
  } else if (action === "View All") {
    currExpensesInfo = await db.query(
      "SELECT e.expense_id, p.project_name, TO_CHAR (e.expense_date, 'YYYY-MM-DD') AS expense_date, e.expense_type, e.amount, e.daily_log_id, s.name AS staff_name, e.status FROM expenses e JOIN projects p ON e.project_id = p.project_id JOIN staff s ON e.staff_id = s.staff_id WHERE e.project_id = $1 ORDER BY e.expense_id",
      [projectId]
    );
  } else {
    res.send("Unknown action");
  }

  expensesInfo = currExpensesInfo.rows;
  res.json(expensesInfo);
});

app.post("/updateProjectDisplay", async (req, res) => {
  console.log("Update posted");
  const { ongoing, completed } = req.body;

  console.log("Ongoing:", ongoing);
  console.log("Completed:", completed);

  if (ongoing && completed) {
    projectDisplayStatus = 3; // display all
  } else if (ongoing) {
    projectDisplayStatus = 1; // display ongoing
  } else if (completed) {
    projectDisplayStatus = 2; // display completed
  } else {
    projectDisplayStatus = 0; // display none
  }

  res.redirect("/projects");
});

// Toggle what to display based on status
app.post("/updateProjectDisplay", async (req, res) => {
  console.log("Update posted");
  const ongoing = req.body.ongoing;
  const completed = req.body.completed;
  if (ongoing && completed) {
    projectDisplayStatus = 3; // display all
  } else if (ongoing) {
    projectDisplayStatus = 1; // display ongoing
  } else if (completed) {
    projectDisplayStatus = 2; // display completed
  } else {
    projectDisplayStatus = 0; // display none
  }

  res.redirect("/projects");
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    // Check if the email already exists
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    console.log(checkResult.rows);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" }); // 409 Conflict
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ message: "Error hashing password" });
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          // console.log(result.rows);
          req.login(user, (err) => {
            if (err) {
              console.error("Error logging in user:", err);
              return res.status(500).json({ message: "Error logging in user" });
            }
            console.log("success");
            return res.status(201).json({ message: "Registration successful" }); // 201 Created
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Below is all login and passport
// Login route
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.status(200).json({ message: "Login successful" });
});

// Passport strategy
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          username,
        ]);
        console.log("STRATEGY ", result);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              console.error("Error comparing passwords:", err);
              return done(err);
            }
            if (valid) {
              return done(null, user);
            } else {
              return done(null, false, { message: "Incorrect password" });
            }
          });
        } else {
          return done(null, false, { message: "User not found" });
        }
      } catch (err) {
        console.log(err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    const user = result.rows[0];
    cb(null, user);
  } catch (err) {
    cb(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
