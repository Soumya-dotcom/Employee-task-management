require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const pool = require('./db');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

function requireLogin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(401).json({ success: false, message: "Not logged in." });
    }
    next();
}

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Both fields are required." });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM admin WHERE email = ?", [email]);
        const admin = rows[0];
        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        req.session.adminId = admin.id;
        req.session.username = admin.username;
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', requireLogin, (req, res) => {
    res.json({ username: req.session.username });
});

const PORT = process.env.PORT || 3000;

// DASHBOARD STATS
app.get('/api/dashboard-stats', requireLogin, async (req, res) => {
    try {
        const [[employeeCount]] = await pool.query("SELECT COUNT(*) AS total FROM employees");
        const [[taskCount]] = await pool.query("SELECT COUNT(*) AS total FROM tasks");

        const [tasksByStatus] = await pool.query(
            "SELECT status, COUNT(*) AS count FROM tasks GROUP BY status"
        );

        const [tasksByPriority] = await pool.query(
            "SELECT priority, COUNT(*) AS count FROM tasks GROUP BY priority"
        );

        const [dueSoon] = await pool.query(
            `SELECT t.title, t.due_date, e.full_name
             FROM tasks t
             LEFT JOIN employees e ON t.employee_id = e.id
             WHERE t.due_date >= CURDATE() AND t.status != 'Completed'
             ORDER BY t.due_date ASC
             LIMIT 5`
        );

        const [employeesWithoutTasks] = await pool.query(
            `SELECT e.id, e.full_name
             FROM employees e
             LEFT JOIN tasks t ON e.id = t.employee_id
             WHERE t.id IS NULL`
        );

        res.json({
            totalEmployees: employeeCount.total,
            totalTasks: taskCount.total,
            tasksByStatus,
            tasksByPriority,
            dueSoon,
            employeesWithoutTasks
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// Serve dashboard.html only if logged in
app.get('/dashboard.html', (req, res, next) => {
    if (!req.session.adminId) {
        return res.redirect('/login.html');
    }
    next();
});

// ===== EMPLOYEES CRUD =====

// GET all employees (with search + filter)
app.get('/api/employees', requireLogin, async (req, res) => {
    try {
        const { search, department, status } = req.query;
        let sql = "SELECT * FROM employees WHERE 1=1";
        const params = [];

        if (search) {
            sql += " AND (full_name LIKE ? OR email LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }
        if (department) {
            sql += " AND department = ?";
            params.push(department);
        }
        if (status) {
            sql += " AND status = ?";
            params.push(status);
        }
        sql += " ORDER BY created_at DESC";

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// GET single employee (for edit page)
app.get('/api/employees/:id', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM employees WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// CREATE employee
app.post('/api/employees', requireLogin, async (req, res) => {
    try {
        const { full_name, email, phone, department, designation, date_joined, status } = req.body;

        if (!full_name || !email || !department) {
            return res.status(400).json({ success: false, message: "Name, email and department are required." });
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }

        const [existing] = await pool.query("SELECT id FROM employees WHERE email = ?", [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "An employee with this email already exists." });
        }

        await pool.query(
            `INSERT INTO employees (full_name, email, phone, department, designation, date_joined, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, phone || null, department, designation || null, date_joined || null, status || 'Active']
        );

        res.json({ success: true, message: "Employee added successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// UPDATE employee
app.put('/api/employees/:id', requireLogin, async (req, res) => {
    try {
        const { full_name, email, phone, department, designation, date_joined, status } = req.body;
        const { id } = req.params;

        if (!full_name || !email || !department) {
            return res.status(400).json({ success: false, message: "Name, email and department are required." });
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address." });
        }

        const [existing] = await pool.query("SELECT id FROM employees WHERE email = ? AND id != ?", [email, id]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: "Another employee already uses this email." });
        }

        await pool.query(
            `UPDATE employees SET full_name=?, email=?, phone=?, department=?, designation=?, date_joined=?, status=?
             WHERE id=?`,
            [full_name, email, phone || null, department, designation || null, date_joined || null, status, id]
        );

        res.json({ success: true, message: "Employee updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// DELETE employee
app.delete('/api/employees/:id', requireLogin, async (req, res) => {
    try {
        await pool.query("DELETE FROM employees WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Employee deleted." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// ===== TASKS CRUD =====

// GET all tasks (search, filter, sort) + employee name via JOIN
app.get('/api/tasks', requireLogin, async (req, res) => {
    try {
        const { search, status, priority, sortBy, order } = req.query;

        let sql = `
            SELECT t.*, e.full_name AS employee_name
            FROM tasks t
            LEFT JOIN employees e ON t.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            sql += " AND t.title LIKE ?";
            params.push(`%${search}%`);
        }
        if (status) {
            sql += " AND t.status = ?";
            params.push(status);
        }
        if (priority) {
            sql += " AND t.priority = ?";
            params.push(priority);
        }

        const allowedSort = ['due_date', 'priority', 'status', 'created_at'];
        const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        sql += ` ORDER BY t.${sortColumn} ${sortOrder}`;

        const [rows] = await pool.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// GET single task
app.get('/api/tasks/:id', requireLogin, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: "Not found." });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// CREATE task
app.post('/api/tasks', requireLogin, async (req, res) => {
    try {
        const { title, description, employee_id, priority, status, due_date } = req.body;

        if (!title || !due_date) {
            return res.status(400).json({ success: false, message: "Title and due date are required." });
        }
        const today = new Date().toISOString().split('T')[0];
        if (due_date < today) {
            return res.status(400).json({ success: false, message: "Due date cannot be in the past." });
        }

        await pool.query(
            `INSERT INTO tasks (title, description, employee_id, priority, status, due_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [title, description || null, employee_id || null, priority || 'Medium', status || 'Pending', due_date]
        );

        res.json({ success: true, message: "Task created successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// UPDATE task
app.put('/api/tasks/:id', requireLogin, async (req, res) => {
    try {
        const { title, description, employee_id, priority, status, due_date } = req.body;
        const { id } = req.params;

        if (!title || !due_date) {
            return res.status(400).json({ success: false, message: "Title and due date are required." });
        }

        await pool.query(
            `UPDATE tasks SET title=?, description=?, employee_id=?, priority=?, status=?, due_date=?
             WHERE id=?`,
            [title, description || null, employee_id || null, priority, status, due_date, id]
        );

        res.json({ success: true, message: "Task updated successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

// DELETE task
app.delete('/api/tasks/:id', requireLogin, async (req, res) => {
    try {
        await pool.query("DELETE FROM tasks WHERE id = ?", [req.params.id]);
        res.json({ success: true, message: "Task deleted." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error." });
    }
});
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));