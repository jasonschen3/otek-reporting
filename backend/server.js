import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;

env.config();

app.use(
  session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/projects", async (req, res) => {
  // console.log(req.user);
  await updateCompanyInfo(); // DONT FORGET AWAIT

  if (req.isAuthenticated()) {
    // if (true) {
    //here
    res.render("projects.ejs", {
      projects: projectsInfo,
    });
  } else {
    res.send("Not authorised");
  }
});

// app.get("/dailyLogs", async (req, res) => {
//   const currDailyLogsInfo = await db.query(
//     "SELECT dl.daily_log_id, TO_CHAR (dl.log_date, 'YYYY-MM-DD') AS log_date, p.project_name, STRING_AGG (s.name, ', ') AS staff_names, dl.status, dl.reimbursed, dl.hours, dl.pdf_url FROM daily_logs dl JOIN projects p ON dl.project_id = p.project_id JOIN staff s ON dl.staff_id = s.staff_id WHERE dl.project_id = p.project_id GROUP BY dl.daily_log_id, p.project_name, dl.status, dl.reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;"
//   );

//   dailyLogsInfo = currDailyLogsInfo.rows;
//   res.render("daily-logs.ejs", {
//     dailyLogs: dailyLogsInfo,
//   });
// });

app.get("/invalid", async (req, res) => {
  res.send("Invalid login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/projects",
    failureRedirect: "/invalid",
  })
);

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
  res.render("daily-logs.ejs", {
    dailyLogs: dailyLogsInfo,
  });
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
  res.render("expenses.ejs", {
    expenses: expensesInfo,
  });
});
// Route to handle project status update
app.post("/updateProjectStatus", async (req, res) => {
  const { project_id, project_status } = req.body;

  try {
    await db.query(
      "UPDATE projects SET project_status = $1 WHERE project_id = $2",
      [project_status, project_id]
    );
    res.redirect("/projects");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Toggle what to display based on status
app.post("/updateProjectDisplay", async (req, res) => {
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
    // Check if alr exists
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.send("Email already exists");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/login");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
