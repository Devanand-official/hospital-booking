// Get form elements
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const emailInput = document.getElementById("email");
const forgotMessage = document.getElementById("forgotMessage");

// Display messages
function showForgotMessage(message, isSuccess = false) {
    forgotMessage.textContent = message;
    forgotMessage.style.color = isSuccess ? "#16803c" : "#dc2626";
}

// Handle password recovery form
forgotPasswordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    // Check empty email
    if (!email) {
        showForgotMessage("Please enter your registered email address.");
        return;
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showForgotMessage("Please enter a valid email address.");
        return;
    }

    // Check whether the email belongs to an account
    const registeredUsers = JSON.parse(
        localStorage.getItem("semasacareUsers") || "[]"
    );

    const demoEmails = [
        "admin@semasacare.com",
        "reception@semasacare.com",
        "doctor@semasacare.com",
        "patient@semasacare.com",
        "pharmacist@semasacare.com",
        "lab@semasacare.com",
        "accountant@semasacare.com"
    ];

    const emailExists =
        demoEmails.includes(email) ||
        registeredUsers.some(user => user.email.toLowerCase() === email);

    if (emailExists) {
        showForgotMessage(
            "Account found. Password recovery requires the secure email service to be connected.",
            true
        );
    } else {
        showForgotMessage(
            "If an account exists for this email, recovery instructions will be provided."
        );
    }
});