// Get login form elements
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

// Show or hide password
if (togglePassword) {
    togglePassword.addEventListener("click", function () {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        const icon = this.querySelector("i");

        if (icon) {
            icon.classList.toggle("fa-eye", !isPassword);
            icon.classList.toggle("fa-eye-slash", isPassword);
        }

        this.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

// Display login messages
function showLoginMessage(message, isSuccess = false) {
    loginMessage.textContent = message;
    loginMessage.style.color = isSuccess ? "#16803c" : "#dc2626";
}

// Handle login form submission
loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Check empty fields
    if (!email || !password) {
        showLoginMessage("Please enter your email and password.");
        return;
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showLoginMessage("Please enter a valid email address.");
        return;
    }

    // Authenticate using auth.js
    const result = SemasaAuth.login(email, password);

    if (result.success) {
        showLoginMessage("Login successful! Redirecting...", true);

        // Redirect according to the user's role
        setTimeout(function () {
            SemasaAuth.redirectByRole(result.user.role);
        }, 800);

    } else {
        showLoginMessage(result.message);
    }
});