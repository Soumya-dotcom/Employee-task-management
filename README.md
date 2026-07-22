# Employee Task Management (ETM) System

An internal administrative management portal that lets administrators perform full **CRUD** (Create, Read, Update, Delete) operations on employee records, assign and monitor tasks, and view real-time statistics via a home dashboard.

---

##Project Directory Structure

```text
EMPLOYEE_TASK_MANAGEMENT/
│
├── public/                       # Frontend static files served by Express
│   ├── css/
│   │   └── style.css             # Main stylesheet
│   ├── database/
│   │   └── schema.sql            # MySQL database tables & sample seed data
│   ├── js/
│   │   ├── dashboard.js          # Handles metrics, chart counts & dashboard lists
│   │   ├── employees.js          # Handles employee CRUD, search, & modal forms
│   │   ├── login.js              # Handles admin login validation & password toggle
│   │   └── tasks.js              # Handles task creation, assignment, & filtering
│   ├── dashboard.html            # Main home analytics view
│   ├── employees.html            # Employee management page
│   ├── login.html                # Admin authentication page
│   └── tasks.html                # Task tracking & management page
│
├── .env                          # Environment variables (DB credentials, PORT)
├── .gitignore                    # Git ignore file (node_modules, temp files)
├── createAdmin.js                # Helper script to create/seed default admin account
├── db.js                         # MySQL database connection pool setup
├── package.json                  # Node.js project metadata & dependencies
├── package-lock.json             # Dependency lockfile
└── server.js                     # Express backend API server entry point

## Tech Stack & Dependencies
Frontend: HTML5, CSS3, JavaScript (Vanilla JS)
Backend Runtime: Node.js
Web Framework: Express.js
Database: MySQL
Environment Management: dotenv

## Application Architecture
Database Layer (db.js & schema.sql):

Configures a MySQL connection pool to handle query operations efficiently.
Consists of three tables: admin, employees, and tasks.The tasks table references employees using a foreign key (employee_id).

Backend API Layer (server.js):

Serves static frontend files from the public/ directory via Express.

Exposes RESTful API endpoints for:

POST /api/login → Authenticates admin credentials.
GET/POST/DELETE /api/employees → Manages employee records.
GET/POST/PUT/DELETE /api/tasks → Manages task assignments & status updates.


Frontend UI (public/):

Uses the asynchronous fetch API to communicate with server.js without full page reloads.
Dynamically populates data tables, filters records by department or status, and renders total counts on dashboard.html.

##Local Setup & Execution Guide

1. Database Setup
Execute the schema.sql file inside MySQL Workbench or Terminal to set up the database structure and sample seed data:

SQL
SOURCE public/database/schema.sql;

2. Configure Environment Variables
Ensure your .env file contains your local MySQL configuration:


PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Database@123
DB_NAME=employee_task_management


3. Initialize Admin Account
Run the helper script to create the initial admin user:

Bash
node createAdmin.js

4. Start the Application
Install dependencies and run the Node.js Express server:

Bash
npm install
npm start

Local Web URL: http://localhost:3000

Default Admin Login: admin@company.com

Default Admin Password: Admin@123