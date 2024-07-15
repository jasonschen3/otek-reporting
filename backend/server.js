import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import LocalStrategy from "passport-local";
import session from "express-session";
import env from "dotenv";

import cors from "cors";

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
let projectDisplayStatus = 1; // 0 1 2 3, display none, display ongoing, display completed, display all

async function updateCompanyInfo() {
  let currProjectsInfo = null;

  const query = `
    SELECT 
      p.project_id, 
      p.project_name, 
      p.project_status, 
      TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, 
      TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, 
      COALESCE(STRING_AGG(e.name, ', '), '') AS engineer_names, 
      p.details, 
      p.location, 
      p.notifications 
    FROM 
      projects p 
    LEFT JOIN 
      projects_assign_engineers pae ON p.project_id = pae.project_id 
    LEFT JOIN 
      engineers e ON pae.engineer_id = e.engineer_id 
    WHERE 
      p.project_status = $1 
    GROUP BY 
      p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications 
    ORDER BY 
      p.project_id;
  `;

  if (projectDisplayStatus === 1) {
    // ongoing projects
    currProjectsInfo = await db.query(query, [1]);
  } else if (projectDisplayStatus === 0) {
    // no projects (empty query)
    currProjectsInfo = { rows: [] };
  } else if (projectDisplayStatus === 2) {
    // finished projects
    currProjectsInfo = await db.query(query, [0]);
  } else {
    // all projects
    currProjectsInfo = await db.query(`
      SELECT 
        p.project_id, 
        p.project_name, 
        p.project_status, 
        TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, 
        TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, 
        COALESCE(STRING_AGG(e.name, ', '), '') AS engineer_names, 
        p.details, 
        p.location, 
        p.notifications 
      FROM 
        projects p 
      LEFT JOIN 
        projects_assign_engineers pae ON p.project_id = pae.project_id 
      LEFT JOIN 
        engineers e ON pae.engineer_id = e.engineer_id 
      GROUP BY 
        p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications 
      ORDER BY 
        p.project_id;
    `);
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

app.get("/", async (req, res) => {
  res.send("Root of server");
});

app.get("/projects", async (req, res) => {
  try {
    await updateCompanyInfo();
    res.json(projectsInfo);
  } catch (error) {
    console.error("Error updating company info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/dailyLogs", async (req, res) => {
  const projectId = req.body.project_id;
  const action = req.body.action;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  console.log("Today's date is: ", formattedToday);

  let currDailyLogsInfo = null;

  const baseQuery = `
    SELECT 
      dl.daily_log_id, 
      TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, 
      p.project_name, 
      COALESCE(STRING_AGG(e.name, ', '), '[No engineers]') AS engineer_names, 
      dl.status_submitted, 
      dl.status_reimbursed, 
      dl.hours, 
      dl.pdf_url 
    FROM 
      daily_logs dl 
    JOIN 
      projects p ON dl.project_id = p.project_id 
    LEFT JOIN 
      engineers e ON dl.engineer_id = e.engineer_id 
    WHERE 
      dl.project_id = $1 `;

  let query = "";
  let params = [];

  if (action === "Yesterday") {
    query =
      baseQuery +
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.status_reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`;
    params = [projectId, formattedYesterday];
  } else if (action === "Today") {
    query =
      baseQuery +
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.status_reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`;
    params = [projectId, formattedToday];
  } else if (action === "View All") {
    query =
      baseQuery +
      `GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.status_reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;`;
    params = [projectId];
  } else {
    return res.status(400).send("Unknown action");
  }

  try {
    currDailyLogsInfo = await db.query(query, params);
    res.json(currDailyLogsInfo.rows);
  } catch (error) {
    console.error("Error fetching daily logs:", error);
    res.status(500).send("Error fetching daily logs");
  }
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

  const baseQuery = `
    SELECT 
      e.expense_id, 
      p.project_name, 
      TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, 
      e.expense_type, 
      e.expense_details, 
      e.amount, 
      e.daily_log_id, 
      en.name AS engineer_name, 
      e.is_billable, 
      e.status1, 
      e.status2, 
      e.status3, 
      e.pdf_url 
    FROM 
      expenses e 
    JOIN 
      projects p ON e.project_id = p.project_id 
    JOIN 
      engineers en ON e.engineer_id = en.engineer_id 
    WHERE 
      e.project_id = $1 `;

  if (action === "Yesterday") {
    currExpensesInfo = await db.query(
      baseQuery + "AND e.expense_date = $2 ORDER BY e.expense_id",
      [projectId, formattedYesterday]
    );
  } else if (action === "Today") {
    currExpensesInfo = await db.query(
      baseQuery + "AND e.expense_date = $2 ORDER BY e.expense_id",
      [projectId, formattedToday]
    );
  } else if (action === "View All") {
    currExpensesInfo = await db.query(baseQuery + "ORDER BY e.expense_id", [
      projectId,
    ]);
  } else {
    return res.status(400).send("Unknown action");
  }

  const expensesInfo = currExpensesInfo.rows;
  res.json(expensesInfo);
});

app.post("/editProjectDisplay", async (req, res) => {
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

// app.post("/register", async (req, res) => {
//   const username = req.body.username;
//   const password = req.body.password;

//   try {
//     // Check if the username already exists
//     const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
//       username,
//     ]);
//     console.log(checkResult.rows);
//     if (checkResult.rows.length > 0) {
//       return res.status(409).json({ message: "Username already exists" }); // 409 Conflict
//     } else {
//       bcrypt.hash(password, saltRounds, async (err, hash) => {
//         if (err) {
//           console.error("Error hashing password:", err);
//           return res.status(500).json({ message: "Error hashing password" });
//         } else {
//           const result = await db.query(
//             "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *",
//             [username, hash]
//           );
//           const user = result.rows[0];
//           // console.log(result.rows);
//           req.login(user, (err) => {
//             if (err) {
//               console.error("Error logging in user:", err);
//               return res.status(500).json({ message: "Error logging in user" });
//             }
//             console.log("success");
//             return res.status(201).json({ message: "Registration successful" }); // 201 Created
//           });
//         }
//       });
//     }
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({ message: "Server error" });
//   }
// });

// Login route
app.post("/login", passport.authenticate("local"), (req, res) => {
  projectDisplayStatus = 1;
  res.status(200).json({ message: "Login successful" });
});

// Passport strategy
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        const result = await db.query(
          "SELECT * FROM users WHERE username = $1",
          [username]
        );
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

// Edit functionality
app.post("/editProject", async (req, res) => {
  const {
    project_id,
    project_name,
    project_status,
    start_date,
    end_date,
    details,
    location,
    notifications,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE projects SET project_name = $1, project_status = $2, start_date = $3, end_date = $4, details = $5, location = $6, notifications = $7 WHERE project_id = $8 RETURNING *`,
      [
        project_name,
        project_status,
        start_date,
        end_date,
        details,
        location,
        notifications,
        project_id,
      ]
    );
    // console.log(result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/projects_assign_engineers", async (req, res) => {
  const { project_id } = req.query;

  try {
    const result = await db.query(
      `SELECT engineer_id FROM projects_assign_engineers WHERE project_id = $1`,
      [project_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching assigned engineers:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/updateProjectEngineers", async (req, res) => {
  const { project_id, engineer_ids } = req.body;

  // console.log("pae backend", req.body);
  try {
    // Delete all existing engineer assignments for the project
    const deleteQuery = await db.query(
      `DELETE FROM projects_assign_engineers WHERE project_id = $1 RETURNING *`,
      [project_id]
    );
    console.log("Deleted,", deleteQuery.rows);
    // Insert the new engineer assignments
    for (const engineer_id of engineer_ids) {
      const inserted = await db.query(
        `INSERT INTO projects_assign_engineers (project_id, engineer_id) VALUES ($1, $2) RETURNING *`,
        [project_id, engineer_id]
      );
      console.log("inserted ", inserted.rows);
    }

    res.json({ message: "Engineers updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/editExpense", async (req, res) => {
  const {
    expense_id,
    expense_date,
    expense_type,
    expense_details,
    amount,
    is_billable,
    status1,
    status2,
    status3,
    pdf_url,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE expenses SET expense_date = $1, expense_type = $2, expense_details = $3, amount = $4, is_billable = $5, status1 = $6, status2 = $7, status3 = $8, pdf_url = $9 WHERE expense_id = $10 RETURNING *`,
      [
        expense_date,
        expense_type,
        expense_details,
        amount,
        is_billable,
        status1,
        status2,
        status3,
        pdf_url,
        expense_id,
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/editDailyLog", async (req, res) => {
  const {
    log_date,
    status_submitted,
    status_reimbursed,
    hours,
    pdf_url,
    daily_log_id,
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE daily_logs SET log_date = $1, status_submitted = $2, status_reimbursed = $3, hours = $4, pdf_url = $5 WHERE daily_log_id = $6 RETURNING *`,
      [
        log_date,
        status_submitted,
        status_reimbursed,
        hours,
        pdf_url,
        daily_log_id,
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating daily log:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Title functionality
app.post("/title", async (req, res) => {
  const { project_id } = req.body;
  try {
    const result = await db.query(
      "SELECT project_name FROM projects WHERE project_id = $1",
      [project_id]
    );
    if (result.rows.length > 0) {
      res.json({ project_name: result.rows[0].project_name });
    } else {
      res.status(404).json({ error: "Project not found" });
    }
  } catch (err) {
    console.error("Error fetching project title:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/////////////////////// Add functionality
app.get("/engineers", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM engineers");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching engineers:", error);
    res.status(500).send("Error fetching engineers");
  }
});

// Fetch Daily Logs for a specific project based on id and date and returns logs with same id and engineer name
app.get("/dailyLogs", async (req, res) => {
  const { projectId, date } = req.query;
  // console.log(projectId, " Project id");
  // console.log(date, " date");
  try {
    const result = await db.query(
      `SELECT dl.*, e.name as engineer_name FROM daily_logs dl
       JOIN engineers e ON dl.engineer_id = e.engineer_id
       WHERE dl.project_id = $1 AND dl.log_date = $2`,
      [projectId, date]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Error fetching daily logs:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/addProject", async (req, res) => {
  let {
    project_name,
    project_status,
    start_date,
    end_date,
    details,
    location,
    notifications,
    engineer_ids,
  } = req.body;

  try {
    // Error if date is "" instead of null
    start_date = start_date === "" ? null : start_date;
    end_date = end_date === "" ? null : end_date;

    const newProjectResult = await db.query(
      `INSERT INTO projects (project_name, project_status, start_date, end_date, details, location, notifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        project_name,
        project_status,
        start_date,
        end_date,
        details,
        location,
        notifications,
      ]
    );

    const newProject = newProjectResult.rows[0];
    console.log(newProject);

    // Insert the engineer assignments into the projects_assign_engineers table
    const engineerAssignments = engineer_ids.map((engineer_id) => {
      return db.query(
        `INSERT INTO projects_assign_engineers (project_id, engineer_id)
         VALUES ($1, $2)`,
        [newProject.project_id, engineer_id]
      );
    });

    // Research this
    await Promise.all(engineerAssignments);

    res.status(200).json(newProject);
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).send("Error adding project");
  }
});

app.post("/addDailyLog", async (req, res) => {
  const {
    project_id,
    log_date,
    engineer_id,
    status_submitted,
    status_reimbursed,
    hours,
    pdf_url,
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO daily_logs (
        project_id,
        log_date,
        engineer_id,
        status_submitted,
        status_reimbursed,
        hours,
        pdf_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        project_id,
        log_date,
        engineer_id,
        status_submitted,
        status_reimbursed,
        hours,
        pdf_url,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding daily log:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/addExpense", async (req, res) => {
  const {
    project_id,
    engineer_id,
    daily_log_id,
    expense_date,
    expense_type,
    expense_details,
    amount,
    is_billable,
    status1,
    status2,
    status3,
    pdf_url,
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO expenses (
        daily_log_id,
        engineer_id,
        project_id,
        expense_date,
        expense_type,
        expense_details,
        amount,
        is_billable,
        status1,
        status2,
        status3,
        pdf_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        daily_log_id,
        engineer_id,
        project_id,
        expense_date,
        expense_type,
        expense_details,
        amount,
        is_billable,
        status1,
        status2,
        status3,
        pdf_url,
      ]
    );

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete
app.post("/deleteMarkedExpenses", async (req, res) => {
  const { expenseIds } = req.body;

  try {
    const result = await db.query(
      // ANY(id::int[]) checks if id is in int[]
      `DELETE FROM expenses WHERE expense_id = ANY($1::int[]) RETURNING *`,
      [expenseIds]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error deleting expenses:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/deleteMarkedDailyLogs", async (req, res) => {
  const { dailyLogIds } = req.body;

  try {
    const result = await db.query(
      `DELETE FROM daily_logs WHERE daily_log_id = ANY($1::int[]) RETURNING *`,
      [dailyLogIds]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error deleting daily logs:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/deleteMarkedProjects", async (req, res) => {
  const { projectIds } = req.body;

  try {
    // Begin transaction
    await db.query("BEGIN");

    // Delete related entries in projects_assign_engineers
    await db.query(
      `DELETE FROM projects_assign_engineers WHERE project_id = ANY($1::int[])`,
      [projectIds]
    );

    // Delete projects
    const result = await db.query(
      `DELETE FROM projects WHERE project_id = ANY($1::int[]) RETURNING *`,
      [projectIds]
    );

    // Commit transaction
    await db.query("COMMIT");

    res.json(result.rows);
  } catch (error) {
    // Rollback transaction on error
    await db.query("ROLLBACK");
    console.error("Error deleting projects:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Function to check if a project has log or expense entries on a specific date
const hasEntriesOnDate = async (projectId, date, isLog) => {
  let query = "";
  if (isLog) {
    query = `
    SELECT EXISTS (
      SELECT 1 
      FROM daily_logs 
      WHERE project_id = $1 AND log_date = $2
    ) AS exists`;
  } else {
    query = `
    SELECT EXISTS (
      SELECT 1 
      FROM expenses 
      WHERE project_id = $1 AND expense_date = $2
    ) AS exists`;
  }
  const result = await db.query(query, [projectId, date]);
  return result.rows[0].exists;
};

// Function to check if a project has entries or expenses on a specific date
const hasEntriesOrExpensesOnDate = async (projectId, date, checkExpenses) => {
  const table = checkExpenses ? "expenses" : "daily_logs";
  const dateColumn = checkExpenses ? "expense_date" : "log_date";

  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM ${table} 
      WHERE project_id = $1 AND ${dateColumn} = $2
    ) AS exists
  `;
  const result = await db.query(query, [projectId, date]);
  return result.rows[0].exists;
};

app.get("/projectEntriesStatus", async (req, res) => {
  const { checkExpenses } = req.query;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  try {
    const projects = await db.query("SELECT project_id FROM projects");
    const statusPromises = projects.rows.map(async (project) => {
      const todayStatus = await hasEntriesOrExpensesOnDate(
        project.project_id,
        formattedToday,
        checkExpenses === "true"
      );
      const yesterdayStatus = await hasEntriesOrExpensesOnDate(
        project.project_id,
        formattedYesterday,
        checkExpenses === "true"
      );
      return {
        project_id: project.project_id,
        today: todayStatus,
        yesterday: yesterdayStatus,
      };
    });

    const status = await Promise.all(statusPromises);
    res.json(status);
  } catch (error) {
    console.error("Error fetching project entries status:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
