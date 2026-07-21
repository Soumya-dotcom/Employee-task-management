let tasks = [];
let employeesList = [];

document.addEventListener("DOMContentLoaded", async function () {
    const meRes = await fetch('/api/me');
    if (meRes.status === 401) { window.location.href = '/login.html'; return; }

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    await loadEmployeesForDropdown();
    loadTasks();

    document.getElementById('searchInput').addEventListener('input', debounce(loadTasks, 300));
    document.getElementById('statusFilter').addEventListener('change', loadTasks);
    document.getElementById('priorityFilter').addEventListener('change', loadTasks);
    document.getElementById('sortBy').addEventListener('change', loadTasks);

    document.getElementById('addTaskBtn').addEventListener('click', () => openModal());
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    document.getElementById('taskForm').addEventListener('submit', saveTask);

    // Character counter
    document.getElementById('description').addEventListener('input', function () {
        document.getElementById('charCount').textContent = `(${this.value.length}/500)`;
    });

    // Prevent picking a past due date
    document.getElementById('due_date').min = new Date().toISOString().split('T')[0];
});

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

async function loadEmployeesForDropdown() {
    const res = await fetch('/api/employees');
    employeesList = await res.json();
    const select = document.getElementById('employee_id');
    employeesList.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.full_name;
        select.appendChild(opt);
    });
}

async function loadTasks() {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const sortBy = document.getElementById('sortBy').value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    params.append('sortBy', sortBy);

    const res = await fetch('/api/tasks?' + params.toString());
    tasks = await res.json();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('taskTableBody');
    const msg = document.getElementById('listMsg');

    if (tasks.length === 0) {
        tbody.innerHTML = '';
        msg.textContent = "No tasks found.";
        msg.style.display = "block";
        return;
    }
    msg.style.display = "none";

    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td>${escapeHtml(t.title)}</td>
            <td>${t.employee_name ? escapeHtml(t.employee_name) : '<em>Unassigned</em>'}</td>
            <td><span class="badge badge-priority-${t.priority.toLowerCase()}">${t.priority}</span></td>
            <td><span class="badge badge-status-${t.status.replace(/\s/g,'').toLowerCase()}">${t.status}</span></td>
            <td>${t.due_date ? t.due_date.split('T')[0] : '-'}</td>
            <td>
                <button class="btn-link" onclick="editTask(${t.id})">Edit</button>
                <button class="btn-link btn-danger" onclick="deleteTask(${t.id}, '${escapeHtml(t.title)}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function openModal(task = null) {
    document.getElementById('formError').style.display = 'none';
    document.getElementById('taskForm').reset();
    document.getElementById('err_title').textContent = '';
    document.getElementById('err_due_date').textContent = '';
    document.getElementById('charCount').textContent = '(0/500)';

    if (task) {
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('title').value = task.title;
        document.getElementById('description').value = task.description || '';
        document.getElementById('charCount').textContent = `(${(task.description || '').length}/500)`;
        document.getElementById('employee_id').value = task.employee_id || '';
        document.getElementById('priority').value = task.priority;
        document.getElementById('status').value = task.status;
        document.getElementById('due_date').value = task.due_date ? task.due_date.split('T')[0] : '';
    } else {
        document.getElementById('modalTitle').textContent = 'Add Task';
        document.getElementById('taskId').value = '';
    }
    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) openModal(task);
}

async function deleteTask(id, title) {
    if (!confirm(`Delete task "${title}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        loadTasks();
    } else {
        alert(data.message || "Failed to delete.");
    }
}

async function saveTask(e) {
    e.preventDefault();

    let valid = true;
    const title = document.getElementById('title').value.trim();
    const due_date = document.getElementById('due_date').value;

    document.getElementById('err_title').textContent = '';
    document.getElementById('err_due_date').textContent = '';

    if (!title) { document.getElementById('err_title').textContent = 'Title is required.'; valid = false; }
    if (!due_date) { document.getElementById('err_due_date').textContent = 'Due date is required.'; valid = false; }

    if (!valid) return;

    const id = document.getElementById('taskId').value;
    const payload = {
        title,
        description: document.getElementById('description').value.trim(),
        employee_id: document.getElementById('employee_id').value || null,
        priority: document.getElementById('priority').value,
        status: document.getElementById('status').value,
        due_date
    };

    const url = id ? `/api/tasks/${id}` : '/api/tasks';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
        closeModal();
        loadTasks();
    } else {
        document.getElementById('formError').textContent = data.message;
        document.getElementById('formError').style.display = 'block';
    }
}