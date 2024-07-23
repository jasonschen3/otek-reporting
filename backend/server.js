import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import env from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

const port = 3000;
const saltRounds = 10;

env.config();
const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

const secretKey = process.env.SESSION_KEY;

function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    permission_level: user.permission_level, // Add user permissions here
  };
  const options = { expiresIn: "2h" }; // Set token expiration time
  console.log("generated");
  return jwt.sign(payload, secretKey, options);
}

function verifyToken(req, res, next) {
  const token = req.headers["access-token"];
  if (!token) {
    console.log("no token provided");
    return res.status(403).send("No token provided");
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(500).send("Failed to authenticate token");
    }
    console.log("Verified");
    req.user = decoded; // Save the decoded token to request object
    next();
  });
}

function checkPermissionLevel(minRequiredLevel) {
  return (req, res, next) => {
    const userPermissionLevel = req.user.permission_level;
    if (userPermissionLevel >= minRequiredLevel) {
      next();
    } else {
      console.log("Level isn't sufficient");
      res
        .status(403)
        .json({ message: "You do not have the required permission level" });
    }
  };
}
// Function to compare the password
async function comparePassword(plainPassword, hashedPassword) {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;

      const valid = await comparePassword(password, storedHashedPassword);
      if (valid) {
        const token = generateToken(user);
        console.log("Valid ", token);
        return res.status(200).json({ token });
      } else {
        return res.status(401).send("Invalid credentials");
      }
    } else {
      return res.status(401).send("Invalid credentials");
    }
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).send("Internal server error");
  }
});

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
    p.quotation_urL
  FROM 
    projects p 
  LEFT JOIN 
    projects_assign_engineers pae ON p.project_id = pae.project_id 
  LEFT JOIN 
    engineers e ON pae.engineer_id = e.engineer_id 
  WHERE 
    p.project_status = $1 
  GROUP BY 
    p.project_id, p.project_name, p.project_status, p.start_date, p.end_date, p.details, p.location, p.quotation_url
  ORDER BY 
    p.project_id;`;

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
        p.location
      FROM 
        projects p 
      LEFT JOIN 
        projects_assign_engineers pae ON p.project_id = pae.project_id 
      LEFT JOIN 
        engineers e ON pae.engineer_id = e.engineer_id 
      GROUP BY 
        p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location
      ORDER BY 
        p.project_id;`);
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

app.get("/", async (req, res) => {
  res.send("Root of server");
});

app.get("/projects", verifyToken, async (req, res) => {
  console.log("Attempting to get projects");
  try {
    await updateCompanyInfo();
    res.json(projectsInfo);
  } catch (error) {
    console.error("Error updating company info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/dailyLogs", verifyToken, async (req, res) => {
  console.log("Post daily log");
  const projectId = req.body.project_id;
  const action = req.body.action;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  let currDailyLogsInfo = null;

  const baseQuery = `
    SELECT 
      dl.daily_log_id, 
      TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, 
      p.project_name, 
      COALESCE(STRING_AGG(e.name, ', '), '[No engineers]') AS engineer_names, 
      dl.status_submitted, 
      dl.received_payment, 
      dl.hours, 
      dl.pdf_url,
      TO_CHAR(dl.date_submitted, 'YYYY-MM-DD') AS date_submitted
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
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.received_payment, dl.hours, dl.log_date, dl.date_submitted ORDER BY dl.daily_log_id;`;
    params = [projectId, formattedYesterday];
  } else if (action === "Today") {
    query =
      baseQuery +
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.received_payment, dl.hours, dl.log_date, dl.date_submitted ORDER BY dl.daily_log_id;`;
    params = [projectId, formattedToday];
  } else if (action === "View All") {
    query =
      baseQuery +
      `GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.received_payment, dl.hours, dl.log_date, dl.date_submitted ORDER BY dl.daily_log_id;`;
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

app.post("/expenses", verifyToken, async (req, res) => {
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

app.post(
  "/editProjectDisplay",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    // console.log("Update posted");
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
  }
);

// Toggle what to display based on status
app.post("/updateProjectDisplay", verifyToken, async (req, res) => {
  // console.log("Update posted");
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

app.post(
  "/register",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const { username, password, permission_level } = req.body;

    try {
      // Check if the username already exists
      const checkResult = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );

      if (checkResult.rows.length > 0) {
        return res.status(409).json({ message: "Username already exists" }); // 409 Conflict
      }

      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ message: "Error hashing password" });
        }

        const result = await db.query(
          "INSERT INTO users (username, password, permission_level) VALUES ($1, $2, $3) RETURNING *",
          [username, hash, permission_level]
        );

        if (result.rows.length > 0) {
          res.status(201).json({ message: "Registration successful" }); // 201 Created
        } else {
          res.status(500).json({ message: "Registration failed" }); // 500 Internal Server Error
        }
      });
    } catch (err) {
      console.error("Server error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// Edit functionality
app.post(
  "/editProject",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const {
      project_id,
      project_name,
      project_status,
      start_date,
      end_date,
      details,
      location,
    } = req.body;

    try {
      const result = await db.query(
        `UPDATE projects SET project_name = $1, project_status = $2, start_date = $3, end_date = $4, details = $5, location = $6 WHERE project_id = $7 RETURNING *`,
        [
          project_name,
          project_status,
          start_date,
          end_date,
          details,
          location,
          project_id,
        ]
      );
      // console.log(result.rows[0]);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

app.get("/projects_assign_engineers", verifyToken, async (req, res) => {
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

app.post(
  "/updateProjectEngineers",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
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
  }
);

app.post(
  "/editExpense",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
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
  }
);

app.post(
  "/editDailyLog",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const {
      log_date,
      status_submitted,
      received_payment,
      hours,
      pdf_url,
      daily_log_id,
      date_submitted,
    } = req.body;

    try {
      const result = await db.query(
        `UPDATE daily_logs 
       SET log_date = $1, status_submitted = $2, received_payment = $3, hours = $4, pdf_url = $5, date_submitted = $6
       WHERE daily_log_id = $7 
       RETURNING *`,
        [
          log_date,
          status_submitted,
          received_payment,
          hours,
          pdf_url,
          date_submitted,
          daily_log_id,
        ]
      );
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating daily log:", error);
      res.status(500).send("Error updating daily log");
    }
  }
);

// Title functionality
app.post("/title", verifyToken, async (req, res) => {
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
app.get("/allEngineers", verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM engineers
      ORDER BY name ASC;
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching engineers:", error);
    res.status(500).send("Error fetching engineers");
  }
});

app.get("/engineers", verifyToken, async (req, res) => {
  const { project_id } = req.query;

  try {
    const query = `
      SELECT e.*
      FROM engineers e
      JOIN projects_assign_engineers pae ON e.engineer_id = pae.engineer_id
      WHERE pae.project_id = $1
      ORDER BY e.name ASC;
    `;

    const result = await db.query(query, [project_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching engineers:", error);
    res.status(500).send("Error fetching engineers");
  }
});

app.get("/dailyLogs", verifyToken, async (req, res) => {
  const { projectId, date } = req.query;
  console.log(projectId, " Project id (daily log)");
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

app.post(
  "/addProject",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    let {
      project_name,
      project_status,
      start_date,
      end_date,
      details,
      location,
      engineer_ids,
      quotation_url,
    } = req.body;

    try {
      // Error if date is "" instead of null
      start_date = start_date === "" ? null : start_date;
      end_date = end_date === "" ? null : end_date;

      const newProjectResult = await db.query(
        `INSERT INTO projects (project_name, project_status, start_date, end_date, details, location, quotation_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
        [
          project_name,
          project_status,
          start_date,
          end_date,
          details,
          location,
          quotation_url,
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
  }
);

app.post(
  "/addDailyLog",
  verifyToken,
  checkPermissionLevel(1),
  async (req, res) => {
    const {
      project_id,
      log_date,
      engineer_id,
      status_submitted,
      received_payment,
      hours,
      pdf_url,
      date_submitted,
    } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO daily_logs (
        project_id,
        log_date,
        engineer_id,
        status_submitted,
        received_payment,
        hours,
        pdf_url,
        date_submitted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
        [
          project_id,
          log_date,
          engineer_id,
          status_submitted,
          received_payment,
          hours,
          pdf_url,
          date_submitted,
        ]
      );

      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("Error adding daily log:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

app.post(
  "/addExpense",
  verifyToken,
  checkPermissionLevel(1),
  async (req, res) => {
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

    console.log("Received data:", req.body); // Log the received data
    const parsedDailyLogId = daily_log_id === "" ? null : daily_log_id;

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
          parsedDailyLogId,
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
      res
        .status(500)
        .json({ error: "Internal Server Error", details: err.message });
    }
  }
);

app.post(
  "/addEngineer",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const { name, title } = req.body;

    try {
      const result = await db.query(
        "INSERT INTO engineers (name, title) VALUES ($1, $2) RETURNING *",
        [name, title]
      );
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("Error adding engineer:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete
app.post(
  "/deleteMarkedExpenses",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
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
  }
);

app.post(
  "/deleteMarkedDailyLogs",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
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
  }
);
app.post(
  "/deleteMarkedProjects",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const { projectIds } = req.body;

    try {
      // Begin transaction
      await db.query("BEGIN");

      // Delete related entries in projects_assign_engineers
      await db.query(
        `DELETE FROM projects_assign_engineers WHERE project_id = ANY($1::int[])`,
        [projectIds]
      );

      // Delete related entries in notifications
      await db.query(
        `DELETE FROM notifications WHERE project_id = ANY($1::int[])`,
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
  }
);

// Notification functions
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

app.get("/projectEntriesStatus", verifyToken, async (req, res) => {
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

app.get("/notifications", verifyToken, async (req, res) => {
  const { project_id } = req.query;
  // console.log("Getting noti backend");
  try {
    const result = await db.query(
      `SELECT noti_id, noti_type, TO_CHAR(noti_related_date, 'MM-DD-YYYY') as formatted_date, noti_message
       FROM notifications WHERE project_id = $1`,
      [project_id]
    );
    // console.log(result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday (0) or Saturday (6)
};

const checkAndUpdateNotifications = async () => {
  try {
    // Delete all notifications
    await db.query("DELETE FROM notifications");

    // Fetch all projects
    const projects = await db.query("SELECT project_id FROM projects");

    for (const project of projects.rows) {
      const { project_id } = project;

      // Check for missing daily logs
      const projectResult = await db.query(
        `SELECT start_date, end_date FROM projects WHERE project_id = $1`,
        [project_id]
      );

      if (
        projectResult.rows.length === 0 ||
        !projectResult.rows[0].start_date
      ) {
        continue;
      }

      const startDate = new Date(projectResult.rows[0].start_date);
      const endDate = projectResult.rows[0].end_date
        ? new Date(projectResult.rows[0].end_date)
        : new Date();

      const totalDays =
        Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      const logsResult = await db.query(
        `SELECT log_date, status_submitted, received_payment FROM daily_logs WHERE project_id = $1`,
        [project_id]
      );

      const logDates = logsResult.rows.map(
        (row) => row.log_date.toISOString().split("T")[0]
      );
      const missingDates = [];

      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const formattedDate = date.toISOString().split("T")[0];

        // Skip weekends
        if (isWeekend(date)) {
          continue;
        }

        if (!logDates.includes(formattedDate)) {
          missingDates.push(formattedDate);
        }
      }
      // Add new notifications for missing dates
      for (const missingDate of missingDates) {
        await db.query(
          "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
          [1, missingDate, "Daily log missing for " + missingDate, project_id]
        );
      }

      // Check for daily logs where payment has not been received after 30 days
      const now = new Date();
      for (const log of logsResult.rows) {
        //FIXED BUG: BITS must be in quotes
        if (log.status_submitted === "1" && log.received_payment === "0") {
          const submittedDate = new Date(log.date_submitted);
          const diffDays = Math.floor(
            (now - submittedDate) / (1000 * 60 * 60 * 24)
          );
          // console.log(diffDays, " diff days");
          if (diffDays > 30) {
            await db.query(
              "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
              [
                2,
                log.log_date,
                "Payment not received for log on " + log.log_date,
                project_id,
              ]
            );
          }
        }
      }
    }

    // console.log("Notifications refreshed.");
  } catch (error) {
    console.error("Error checking and updating notifications:", error);
  }
};

// Run the timer function every hour
setInterval(checkAndUpdateNotifications, 60 * 60 * 1000);

// Every min
// setInterval(checkAndUpdateNotifications, 1000 * 60);

// Initial call to start immediately
checkAndUpdateNotifications();

app.post("/updateNotifications", verifyToken, async (req, res) => {
  try {
    await checkAndUpdateNotifications();
    console.log("Updated Notifications");
    res.json({ message: "Updated notifications" });
  } catch (err) {
    console.log("Error updating notifications ", err);
    res
      .status(500)
      .json({ message: "Error updating notifications", error: err });
  }
});

app.get("/missingLogs", verifyToken, async (req, res) => {
  const { project_id } = req.query;
  try {
    // Fetch the start and end date of the project
    const projectResult = await db.query(
      `SELECT start_date, end_date FROM projects WHERE project_id = $1`,
      [project_id]
    );
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const startDate = new Date(projectResult.rows[0].start_date);
    const endDate = projectResult.rows[0].end_date
      ? new Date(projectResult.rows[0].end_date)
      : new Date();

    // Calculate the total number of days between the start date and the end date (or current date)
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Fetch the existing daily logs
    const logsResult = await db.query(
      `SELECT log_date FROM daily_logs WHERE project_id = $1`,
      [project_id]
    );

    const existingLogsCount = logsResult.rows.length;

    // Calculate missing days
    const missingDays = totalDays - existingLogsCount;

    res.json({ missingDailyLogs: missingDays });
  } catch (error) {
    console.error("Error calculating missing daily logs:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Invoices
app.get("/invoices", (req, res) => {
  const { project_id } = req.query;

  const query = `
    SELECT 
      internal_id,
      project_id,
      invoice_number,
      TO_CHAR(invoice_date, 'YYYY-MM-DD') AS invoice_date,
      invoice_terms,
      amount,
      hasPaid,
      invoice_url,
      quotation_url,
      purchase_url,
      engineering_url,
      include_logs,
      note
    FROM invoices
    WHERE project_id = $1`;

  const values = [project_id];

  db.query(query, values, (error, results) => {
    if (error) {
      console.error("Error fetching invoices ", error);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(results.rows);
  });
});

// Edit an invoice
app.post("/editInvoice", (req, res) => {
  const {
    internal_id,
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    hasPaid,
    invoice_url,
    quotation_url,
    purchase_url,
    engineering_url,
    include_logs,
    note,
  } = req.body;

  const query = `
      UPDATE invoices 
      SET 
          invoice_number = $1,
          invoice_date = $2,
          invoice_terms = $3,
          amount = $4,
          hasPaid = $5,
          invoice_url = $6,
          quotation_url = $7,
          purchase_url = $8,
          engineering_url = $9,
          include_logs = $10,
          note = $11
      WHERE internal_id = $12
      RETURNING *`;

  const values = [
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    hasPaid,
    invoice_url,
    quotation_url,
    purchase_url,
    engineering_url,
    include_logs,
    note,
    internal_id,
  ];

  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(results.rows[0]);
  });
});

// Add an invoice
app.post("/addInvoice", (req, res) => {
  const {
    project_id,
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    hasPaid,
    invoice_url,
    quotation_url,
    purchase_url,
    engineering_url,
    include_logs,
    note,
  } = req.body;

  const query = `
      INSERT INTO invoices (
          project_id,
          invoice_number,
          invoice_date,
          invoice_terms,
          amount,
          hasPaid,
          invoice_url,
          quotation_url,
          purchase_url,
          engineering_url,
          include_logs,
          note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`;

  const values = [
    project_id,
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    hasPaid,
    invoice_url,
    quotation_url,
    purchase_url,
    engineering_url,
    include_logs,
    note,
  ];

  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(results.rows[0]);
  });
});

// Delete an invoice
app.post("/deleteInvoice", (req, res) => {
  const { internal_id } = req.body;

  const query = `DELETE FROM invoices WHERE internal_id = $1 RETURNING *`;

  const values = [internal_id];

  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json(results.rows[0]);
  });
});

app.get("/latestInvoiceDate", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
          project_id, 
          TO_CHAR(MAX(invoice_date), 'YYYY-MM-DD') AS latest_invoice_date
      FROM 
          invoices
      GROUP BY project_id`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching latest invoice date:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
