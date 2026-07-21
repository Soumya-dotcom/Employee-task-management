require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

async function createAdmin() {
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    await pool.query(
        "INSERT INTO admin (username, email, password) VALUES (?, ?, ?)",
        ["admin", "admin@company.com", hashedPassword]
    );
    console.log("Admin created. Login with admin@company.com / Admin@123");
    process.exit();
}

createAdmin();