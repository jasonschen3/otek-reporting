import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import env from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import pkg from "@18f/us-federal-holidays";
const { isAHoliday } = pkg;

env.config();
const app = express();

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.BACKEND_PORT;
const saltRounds = 10;
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

const secretKey = process.env.SESSION_KEY;

function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    permission_level: user.permission_level,
  };
  const options = { expiresIn: "2h" };
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
  const { projectDisplayStatus } = req.query;
  try {
    const allProjects = await db.query(`
    SELECT 
      p.project_id, 
      p.project_name, 
      p.project_status, 
      TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, 
      TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, 
      COALESCE(STRING_AGG(e.name, ', '), '') AS engineer_names, 
      p.details, 
      p.location,
      p.quotation_url,
      p.purchase_url,
      TRUNC(p.amount) AS amount,
      p.contract_id,
      p.otek_invoice,
      p.company_name,
      p.project_number
    FROM 
      projects p 
    LEFT JOIN 
      projects_assign_engineers pae ON p.project_id = pae.project_id 
    LEFT JOIN 
      engineers e ON pae.engineer_id = e.engineer_id 
    GROUP BY 
      p.project_id, p.project_name, p.project_status, p.start_date, p.end_date, p.details, p.location, p.quotation_url, p.purchase_url, p.amount, p.contract_id, p.otek_invoice, p.company_name, p.project_number
    ORDER BY 
      p.company_name ASC, p.project_number;
  `);
    let projectsInfo = allProjects.rows;

    if (projectDisplayStatus && projectDisplayStatus !== "5") {
      const status = parseInt(projectDisplayStatus, 10);
      projectsInfo = projectsInfo.filter(
        (project) => project.project_status === status
      );
    }

    res.json(projectsInfo);
  } catch (error) {
    console.error("Error fetching project info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/dailyLogs", verifyToken, async (req, res) => {
  const projectId = req.body.project_id;
  const action = req.body.action;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  let endDate = null;

  try {
    const endDateResult = await db.query(
      "SELECT TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date FROM projects WHERE project_id = $1",
      [projectId]
    );
    if (endDateResult.rows.length > 0) {
      endDate = endDateResult.rows[0].end_date;
    }
    // console.log("END DATE: ", endDate);
  } catch (error) {
    console.error("Error fetching end date:", error);
    return res.status(500).send("Error fetching end date");
  }

  let currDailyLogsInfo = null;

  const baseQuery = `
    SELECT 
      dl.daily_log_id, 
      TO_CHAR(dl.log_date, 'YYYY-MM-DD') AS log_date, 
      p.project_name, 
      COALESCE(STRING_AGG(e.name, ', '), '[No engineers]') AS engineer_names, 
      dl.status_submitted, 
      dl.hours, 
      dl.pdf_url,
      dl.num_engineers,
      dl.note
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
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.hours, dl.log_date, dl.num_engineers, dl.note ORDER BY dl.log_date;`;
    params = [projectId, formattedYesterday];
  } else if (action === "Today") {
    query =
      baseQuery +
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.hours, dl.log_date, dl.num_engineers, dl.note ORDER BY dl.log_date;`;
    params = [projectId, formattedToday];
  } else if (action === "View All") {
    query =
      baseQuery +
      `GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.hours, dl.log_date, dl.num_engineers, dl.note ORDER BY dl.log_date;`;
    params = [projectId];
  } else if (action === "End Date" && endDate) {
    query =
      baseQuery +
      `AND dl.log_date = $2 GROUP BY dl.daily_log_id, p.project_name, dl.status_submitted, dl.hours, dl.log_date, dl.num_engineers, dl.note ORDER BY dl.log_date;`;
    params = [projectId, endDate];
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

  let endDate = null;

  try {
    const endDateResult = await db.query(
      "SELECT TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date FROM projects WHERE project_id = $1",
      [projectId]
    );
    if (endDateResult.rows.length > 0) {
      endDate = endDateResult.rows[0].end_date;
    }
  } catch (error) {
    console.error("Error fetching end date:", error);
    return res.status(500).send("Error fetching end date");
  }

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
      baseQuery + "AND e.expense_date = $2 ORDER BY e.expense_date",
      [projectId, formattedYesterday]
    );
  } else if (action === "Today") {
    currExpensesInfo = await db.query(
      baseQuery + "AND e.expense_date = $2 ORDER BY e.expense_date",
      [projectId, formattedToday]
    );
  } else if (action === "View All") {
    currExpensesInfo = await db.query(baseQuery + "ORDER BY e.expense_date", [
      projectId,
    ]);
  } else if (action === "End Date" && endDate) {
    currExpensesInfo = await db.query(
      baseQuery + "AND e.expense_date = $2 ORDER BY e.expense_date",
      [projectId, endDate]
    );
  } else {
    return res.status(400).send("Unknown action");
  }

  try {
    res.json(currExpensesInfo.rows);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).send("Error fetching expenses");
  }
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
        return res.status(409).json({ message: "Username already exists" });
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
          res.status(500).json({ message: "Registration failed" });
        }
      });
    } catch (err) {
      console.error("Server error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

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
      quotation_url,
      purchase_url,
      amount,
      contract_id,
      otek_invoice,
      company_name,
      project_number,
    } = req.body;

    try {
      const result = await db.query(
        `UPDATE projects SET 
          project_name = $1, 
          project_status = $2, 
          start_date = $3, 
          end_date = $4, 
          details = $5, 
          location = $6, 
          quotation_url = $7, 
          purchase_url = $8, 
          amount = $9, 
          contract_id = $10, 
          otek_invoice = $11, 
          company_name = $12,
          project_number = $13
        WHERE 
          project_id = $14 
        RETURNING *`,
        [
          project_name,
          project_status,
          start_date,
          end_date,
          details,
          location,
          quotation_url,
          purchase_url,
          amount,
          contract_id,
          otek_invoice,
          company_name,
          project_number,
          project_id,
        ]
      );
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
      hours,
      pdf_url,
      daily_log_id,
      num_engineers,
      note,
      engineer_id,
    } = req.body;

    try {
      const result = await db.query(
        `UPDATE daily_logs 
         SET log_date = $1, status_submitted = $2, hours = $3, pdf_url = $4, num_engineers = $5, note = $6, engineer_id = $7
         WHERE daily_log_id = $8
         RETURNING *`,
        [
          log_date,
          status_submitted,
          hours,
          pdf_url,
          num_engineers,
          note,
          engineer_id,
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

// Update engineer
app.put(
  "/engineers/:id",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const { id } = req.params;
    const { name, title } = req.body;
    try {
      await db.query(
        "UPDATE engineers SET name = $1, title = $2 WHERE engineer_id = $3",
        [name, title, id]
      );
      res.sendStatus(200);
    } catch (error) {
      console.error("Error updating engineer:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

// Delete engineer
app.delete("/engineers/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM engineers WHERE engineer_id = $1", [id]);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting engineer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/allCompanies", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM companies ORDER BY company_name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.log("Error getting company names ", err);
  }
});

app.post(
  "/addCompany",
  verifyToken,
  checkPermissionLevel(2),
  async (req, res) => {
    const { company_name } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO companies (company_name) VALUES ($1) RETURNING *`,
        [company_name]
      );

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error("Error adding company:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update an existing company and project with company name
app.put("/companies/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { company_name } = req.body;
  try {
    await db.query("BEGIN"); // Start transaction

    // Retrieve the old company name
    const result = await db.query(
      "SELECT company_name FROM companies WHERE company_id = $1",
      [id]
    );

    const oldCompanyName = result.rows[0].company_name;
    // Update company name in the companies table
    await db.query(
      "UPDATE companies SET company_name = $1 WHERE company_id = $2",
      [company_name, id]
    );

    // Update company name in the projects table
    await db.query(
      "UPDATE projects SET company_name = $1 WHERE company_name = $2",
      [company_name, oldCompanyName]
    );

    await db.query("COMMIT"); // Commit transaction
    res.sendStatus(200);
  } catch (error) {
    await db.query("ROLLBACK"); // Rollback transaction in case of error
    console.error("Error updating company:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a company
app.delete("/companies/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM companies WHERE company_id = $1", [id]);
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

app.post("/addProject", verifyToken, async (req, res) => {
  const {
    project_name,
    project_status,
    start_date,
    end_date,
    details,
    location,
    quotation_url,
    purchase_url,
    engineer_ids,
    company_name,
    amount,
    contract_id,
    otek_invoice,
    project_number,
  } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO projects (project_name, project_status, start_date, end_date, details, location, quotation_url, purchase_url, company_name, amount, contract_id, otek_invoice, project_number) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        project_name,
        project_status,
        start_date,
        end_date,
        details,
        location,
        quotation_url,
        purchase_url,
        company_name,
        amount,
        contract_id,
        otek_invoice,
        project_number,
      ]
    );

    const newProject = result.rows[0];

    const engineerAssignments = engineer_ids.map((engineer_id) => {
      return db.query(
        `INSERT INTO projects_assign_engineers (project_id, engineer_id) VALUES ($1, $2)`,
        [newProject.project_id, engineer_id]
      );
    });

    await Promise.all(engineerAssignments);

    res.status(200).json(newProject);
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

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
      hours,
      pdf_url,
      num_engineers,
      note,
    } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO daily_logs (
        project_id,
        log_date,
        engineer_id,
        status_submitted,
        hours,
        pdf_url,
        num_engineers,
        note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
        [
          project_id,
          log_date,
          engineer_id,
          status_submitted,
          hours,
          pdf_url,
          num_engineers,
          note,
        ]
      );
      console.log("Daily log", result.rows[0]);
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

// Tells status of yesterday and today of either expenses or dl
app.get("/projectEntriesStatus", verifyToken, async (req, res) => {
  const { checkExpenses } = req.query;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formattedToday = getFormattedDate(today);
  const formattedYesterday = getFormattedDate(yesterday);

  try {
    const projects = await db.query(
      "SELECT project_id, TO_CHAR(end_date, 'YYYY-MM-DD') AS end_date FROM projects"
    );

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
      const endDateStatus = project.end_date
        ? await hasEntriesOrExpensesOnDate(
            project.project_id,
            project.end_date,
            checkExpenses === "true"
          )
        : false;

      return {
        project_id: project.project_id,
        today: todayStatus,
        yesterday: yesterdayStatus,
        end_date_status: endDateStatus, // Include end_date status in the response
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

const isWeekendOrHoliday = (date) => {
  const day = date.getDay();
  const month = date.getMonth();
  const dayOfMonth = date.getDate();

  // Check for Juneteenth (June 19th)
  const isJuneteenth = month === 5 && dayOfMonth === 19; // Months are 0-indexed, so June is 5

  return day === 0 || day === 6 || isAHoliday(date) || isJuneteenth;
};

const checkAndUpdateNotifications = async () => {
  try {
    // Delete all notifications
    await db.query("DELETE FROM notifications");

    // Fetch all projects
    const projects = await db.query("SELECT project_id FROM projects");

    for (const project of projects.rows) {
      const { project_id } = project;

      // Type 1: Check for missing daily logs
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

      const dailyLogResult = await db.query(
        `SELECT log_date, status_submitted, hours FROM daily_logs WHERE project_id = $1`,
        [project_id]
      );

      const logDates = dailyLogResult.rows.map(
        (row) => row.log_date.toISOString().split("T")[0]
      );
      const missingDates = [];

      for (let i = 0; i < totalDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const formattedDate = date.toISOString().split("T")[0];

        // Skip weekends
        if (isWeekendOrHoliday(date)) {
          continue;
        }
        if (!logDates.includes(formattedDate)) {
          missingDates.push(formattedDate);
        }
      }

      // Add new notifications for the missing dates
      for (const missingDate of missingDates) {
        await db.query(
          "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
          [1, missingDate, "Daily log missing for " + missingDate, project_id]
        );
      }

      // Type 2: Check for invoice expenses where payment has not been received after 30 days
      const invoiceResult = await db.query(
        `SELECT invoice_date, has_paid, amount FROM invoices WHERE project_id = $1`,
        [project_id]
      );

      // Calculate the total unpaid amount for invoices that are overdue by 30 days for type 4
      let totalUnpaidAmount = 0;
      const now = new Date();

      for (const invoice of invoiceResult.rows) {
        if (invoice.amount == 0) {
          continue;
        }
        if (!invoice.has_paid) {
          const invoiceDate = new Date(invoice.invoice_date);
          const diffDays = Math.floor(
            (now - invoiceDate) / (1000 * 60 * 60 * 24)
          );

          if (diffDays > 30) {
            totalUnpaidAmount += Number(invoice.amount);
            await db.query(
              "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
              [
                2,
                invoice.invoice_date,
                "Payment not received for invoice on " + invoice.invoice_date,
                project_id,
              ]
            );
          }
        }
      }

      // Type 4: Add a new notification for the total unpaid amount if it exists
      if (totalUnpaidAmount > 0) {
        await db.query(
          "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
          [
            4, // New notification type for total unpaid amount
            new Date(),
            `Total unpaid amount for invoices overdue by 30 days is $${totalUnpaidAmount.toFixed(
              2
            )}`,
            project_id,
          ]
        );
      }

      // Noti type 3: Missing invoice, 30 days an invoice remind after 30
      // Calculate the number of invoices required based on the project duration
      const invoiceInterval = 30; // 30 days per invoice
      const reqNumberOfInvoices = Math.ceil(totalDays / invoiceInterval);

      const currInvoices = (
        await db.query("SELECT internal_id FROM invoices WHERE project_id=$1", [
          project_id,
        ])
      ).rows.length;

      const missingInvoices = reqNumberOfInvoices - currInvoices;

      for (let i = 0; i < missingInvoices; i++) {
        const notificationDate = projectResult.rows[0].end_date
          ? new Date(projectResult.rows[0].end_date)
          : new Date();

        await db.query(
          "INSERT INTO notifications (noti_type, noti_related_date, noti_message, project_id) VALUES ($1, $2, $3, $4)",
          [3, notificationDate, `Invoice required`, project_id]
        );
      }
    }
    console.log("Notifications refreshed");
  } catch (error) {
    console.error("Error checking and updating notifications:", error);
  }
};

// Run the timer function every hour
setInterval(checkAndUpdateNotifications, 60 * 60 * 1000);

// Initial call to start immediately
checkAndUpdateNotifications();

app.post("/refreshAllNotifications", verifyToken, async (req, res) => {
  try {
    await checkAndUpdateNotifications();
    console.log("All notifications refreshed");
    res.json({ message: "All notifications refreshed" });
  } catch (err) {
    console.log("Error refreshing notifications ", err);
    res
      .status(500)
      .json({ message: "Error refreshing notifications", error: err });
  }
});

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
      has_paid,
      invoice_url,
      quotation_url,
      purchase_url,
      engineering_url,
      include_logs,
      note
    FROM invoices
    WHERE project_id = $1
    ORDER BY invoice_date`;

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
app.post("/editInvoice", verifyToken, checkPermissionLevel(2), (req, res) => {
  const {
    internal_id,
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    has_paid,
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
          has_paid = $5,
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
    has_paid,
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
app.post("/addInvoice", verifyToken, checkPermissionLevel(1), (req, res) => {
  const {
    project_id,
    invoice_number,
    invoice_date,
    invoice_terms,
    amount,
    has_paid,
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
          has_paid,
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
    has_paid,
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
      `
      SELECT 
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
