document.addEventListener("DOMContentLoaded", async function () {
    // Get logged-in admin name
    const meRes = await fetch('/api/me');
    if (meRes.status === 401) {
        window.location.href = '/login.html';
        return;
    }
    const me = await meRes.json();
    document.getElementById('adminName').textContent = me.username;

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async function () {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    });

    // Load stats
    const res = await fetch('/api/dashboard-stats');
    const data = await res.json();

    document.getElementById('totalEmployees').textContent = data.totalEmployees;
    document.getElementById('totalTasks').textContent = data.totalTasks;

    const pending = data.tasksByStatus.find(s => s.status === 'Pending');
    const completed = data.tasksByStatus.find(s => s.status === 'Completed');
    document.getElementById('pendingTasks').textContent = pending ? pending.count : 0;
    document.getElementById('completedTasks').textContent = completed ? completed.count : 0;

    // Due soon table
    const dueSoonBody = document.querySelector('#dueSoonTable tbody');
    if (data.dueSoon.length === 0) {
        dueSoonBody.innerHTML = `<tr><td colspan="3">No upcoming tasks</td></tr>`;
    } else {
        data.dueSoon.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task.title}</td>
                <td>${task.full_name || 'Unassigned'}</td>
                <td>${task.due_date ? task.due_date.split('T')[0] : '-'}</td>
            `;
            dueSoonBody.appendChild(row);
        });
    }

    // Employees without tasks
    const noTaskList = document.getElementById('noTaskList');
    if (data.employeesWithoutTasks.length === 0) {
        noTaskList.innerHTML = `<li>All employees have tasks assigned</li>`;
    } else {
        data.employeesWithoutTasks.forEach(emp => {
            const li = document.createElement('li');
            li.textContent = emp.full_name;
            noTaskList.appendChild(li);
        });
    }
});