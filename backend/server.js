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

async function updateCompanyInfo() {
  // Change the table here
  const currProjectsInfo = await db.query(
    "SELECT p.project_id, p.project_name, p.project_status, TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date, TO_CHAR(p.end_date, 'YYYY-MM-DD') AS end_date, STRING_AGG(s.name, ', ') AS staff_names, p.details, p.location, p.notifications FROM projects p JOIN project_staff ps ON p.project_id = ps.project_id JOIN staff s ON ps.staff_id = s.staff_id GROUP BY p.project_id, p.project_name, p.start_date, p.end_date, p.details, p.location, p.notifications ORDER BY p.project_id"
  );
  const currDailyLogsInfo = await db.query(
    "SELECT dl.daily_log_id, TO_CHAR (dl.log_date, 'YYYY-MM-DD') AS log_date, p.project_name, STRING_AGG (s.name, ', ') AS staff_names, dl.status, dl.reimbursed, dl.hours FROM daily_logs dl JOIN projects p ON dl.project_id = p.project_id JOIN staff s ON dl.staff_id = s.staff_id GROUP BY dl.daily_log_id, p.project_name, dl.status, dl.reimbursed, dl.hours, dl.log_date ORDER BY dl.daily_log_id;"
  );
  const currExpensesInfo = await db.query(
    "SELECT e.expense_id, p.project_name, TO_CHAR (e.expense_date, 'YYYY-MM-DD') AS expense_date, e.expense_type, e.amount, e.daily_log_id, s.name AS staff_name, e.status FROM expenses e JOIN projects p ON e.project_id = p.project_id JOIN staff s ON e.staff_id = s.staff_id ORDER BY e.expense_id"
  );
  projectsInfo = currProjectsInfo.rows;
  dailyLogsInfo = currDailyLogsInfo.rows;
  expensesInfo = currExpensesInfo.rows;
}

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

app.get("/secrets", async (req, res) => {
  // console.log(req.user);
  await updateCompanyInfo(); // DONT FORGET AWAIT

  // if (req.isAuthenticated()) {
  if (true) {
    //here
    res.render("secrets.ejs", {
      projects: projectsInfo,
      dailyLogs: dailyLogsInfo,
      expenses: expensesInfo,
    });
  } else {
    res.send("Not authorised");
  }
});

app.get("/invalid", async (req, res) => {
  res.send("Invalid login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/invalid",
  })
);

// Route to handle project status update
app.post("/updateProjectStatus", async (req, res) => {
  const { project_id, project_status } = req.body;

  try {
    await db.query(
      "UPDATE projects SET project_status = $1 WHERE project_id = $2",
      [project_status, project_id]
    );
    res.redirect("/secrets");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
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
