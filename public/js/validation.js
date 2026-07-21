document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    const serverError = document.getElementById("serverError");

    if (togglePassword) {
        togglePassword.addEventListener("click", function () {
            const isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            togglePassword.textContent = isHidden ? "Hide" : "Show";
        });
    }

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            let valid = true;
            const email = document.getElementById("email");
            const emailError = document.getElementById("emailError");
            const passwordError = document.getElementById("passwordError");

            emailError.textContent = "";
            passwordError.textContent = "";
            serverError.style.display = "none";

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email.value.trim() || !emailPattern.test(email.value)) {
                emailError.textContent = "Enter a valid email address.";
                valid = false;
            }
            if (!passwordInput.value.trim()) {
                passwordError.textContent = "Password is required.";
                valid = false;
            }
            if (!valid) return;

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.value.trim(),
                    password: passwordInput.value
                })
            });
            const data = await res.json();

            if (data.success) {
                window.location.href = '/dashboard.html';
            } else {
                serverError.textContent = data.message;
                serverError.style.display = "block";
            }
        });
    }
});