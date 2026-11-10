// Get registration form elements
const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const dobInput = document.getElementById("dob");
const genderInput = document.getElementById("gender");
const addressInput = document.getElementById("address");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const termsInput = document.getElementById("terms");

// Display registration messages
function showRegisterMessage(message, isSuccess = false) {
    registerMessage.textContent = message;
    registerMessage.style.color = isSuccess ? "#16803c" : "#dc2626";
}

// Set maximum date of birth to today
dobInput.max = new Date().toISOString().split("T")[0];

// Handle registration form
registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const phone = phoneInput.value.trim();
    const dob = dobInput.value;
    const gender = genderInput.value;
    const address = addressInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Check required fields
    if (
        !fullName || !email || !phone || !dob ||
        !gender || !address || !password || !confirmPassword
    ) {
        showRegisterMessage("Please fill in all required fields.");
        return;
    }

    // Validate email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        showRegisterMessage("Please enter a valid email address.");
        return;
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phone)) {
        showRegisterMessage("Please enter a valid 10-digit phone number.");
        return;
    }

    // Validate date of birth
    if (new Date(dob + "T00:00:00") >= new Date(new Date().toDateString())) {
        showRegisterMessage("Please enter a valid date of birth.");
        return;
    }

    // Validate password length
    if (password.length < 8) {
        showRegisterMessage("Password must contain at least 8 characters.");
        return;
    }

    // Check password match
    if (password !== confirmPassword) {
        showRegisterMessage("Passwords do not match.");
        return;
    }

    // Check terms and conditions
    if (!termsInput.checked) {
        showRegisterMessage("Please accept the Terms and Conditions.");
        return;
    }

    // Register patient through auth.js
    if (typeof SemasaAuth === "undefined" ||
        typeof SemasaAuth.register !== "function") {
        showRegisterMessage(
            "Registration service is not ready. Please update auth.js."
        );
        return;
    }

    const result = SemasaAuth.register({
        name: fullName,
        email: email,
        phone: phone,
        dob: dob,
        gender: gender,
        address: address,
        password: password,
        role: "patient"
    });

    if (result.success) {
        showRegisterMessage(
            "Registration successful! Redirecting to login...",
            true
        );

        registerForm.reset();

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1500);

    } else {
        showRegisterMessage(result.message);
    }
});