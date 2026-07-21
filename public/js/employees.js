let employees = [];

document.addEventListener("DOMContentLoaded", async function () {
    const meRes = await fetch('/api/me');
    if (meRes.status === 401) { window.location.href = '/login.html'; return; }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    loadEmployees();

    document.getElementById('searchInput').addEventListener('input', debounce(loadEmployees, 300));
    document.getElementById('departmentFilter').addEventListener('change', loadEmployees);
    document.getElementById('statusFilter').addEventListener('change', loadEmployees);

    document.getElementById('addEmployeeBtn').addEventListener('click', () => openModal());
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('employeeForm').addEventListener('submit', saveEmployee);
});

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

async function loadEmployees() {
    const search = document.getElementById('searchInput').value;
    const department = document.getElementById('departmentFilter').value;
    const status = document.getElementById('statusFilter').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (department) params.append('department', department);
    if (status) params.append('status', status);

    const res = await fetch('/api/employees?' + params.toString());
    employees = await res.json();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const msg = document.getElementById('listMsg');

    if (employees.length === 0) {
        tbody.innerHTML = '';
        msg.textContent = "No employees found.";
        msg.style.display = "block";
        return;
    }
    msg.style.display = "none";

    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${escapeHtml(emp.full_name)}</td>
            <td>${escapeHtml(emp.email)}</td>
            <td>${emp.phone ? escapeHtml(emp.phone) : '-'}</td>
            <td>${escapeHtml(emp.department)}</td>
            <td>${emp.designation ? escapeHtml(emp.designation) : '-'}</td>
            <td><span class="badge badge-${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <button class="btn-link" onclick="editEmployee(${emp.id})">Edit</button>
                <button class="btn-link btn-danger" onclick="deleteEmployee(${emp.id}, '${escapeHtml(emp.full_name)}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function openModal(employee = null) {
    document.getElementById('formError').style.display = 'none';
    document.getElementById('employeeForm').reset();
    ['full_name','email','phone','department'].forEach(f => document.getElementById('err_' + f).textContent = '');

    if (employee) {
        document.getElementById('modalTitle').textContent = 'Edit Employee';
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('full_name').value = employee.full_name;
        document.getElementById('email').value = employee.email;
        document.getElementById('phone').value = employee.phone || '';
        document.getElementById('department').value = employee.department;
        document.getElementById('designation').value = employee.designation || '';
        document.getElementById('date_joined').value = employee.date_joined ? employee.date_joined.split('T')[0] : '';
        document.getElementById('status').value = employee.status;
    } else {
        document.getElementById('modalTitle').textContent = 'Add Employee';
        document.getElementById('employeeId').value = '';
    }
    document.getElementById('employeeModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (emp) openModal(emp);
}

async function deleteEmployee(id, name) {
    if (!confirm(`Delete employee "${name}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        loadEmployees();
    } else {
        alert(data.message || "Failed to delete.");
    }
}

async function saveEmployee(e) {
    e.preventDefault();

    let valid = true;
    const full_name = document.getElementById('full_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const department = document.getElementById('department').value;

    document.getElementById('err_full_name').textContent = '';
    document.getElementById('err_email').textContent = '';
    document.getElementById('err_phone').textContent = '';
    document.getElementById('err_department').textContent = '';

    if (!full_name) { document.getElementById('err_full_name').textContent = 'Name is required.'; valid = false; }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) { document.getElementById('err_email').textContent = 'Enter a valid email.'; valid = false; }

    if (phone && !/^[0-9]{10}$/.test(phone)) { document.getElementById('err_phone').textContent = 'Phone must be 10 digits.'; valid = false; }

    if (!department) { document.getElementById('err_department').textContent = 'Select a department.'; valid = false; }

    if (!valid) return;

    const id = document.getElementById('employeeId').value;
    const payload = {
        full_name, email, phone,
        department,
        designation: document.getElementById('designation').value.trim(),
        date_joined: document.getElementById('date_joined').value,
        status: document.getElementById('status').value
    };

    const url = id ? `/api/employees/${id}` : '/api/employees';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        closeModal();
        loadEmployees();
    } else {
        document.getElementById('formError').textContent = data.message;
        document.getElementById('formError').style.display = 'block';
    }
}