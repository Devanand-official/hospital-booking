document.addEventListener("DOMContentLoaded", function () {

    // 1. CHECK LOGIN AND ROLE ACCESS
    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const allowedRoles = ["admin", "receptionist"];

    if (!allowedRoles.includes(currentUser.role)) {
        const roleDashboards = {
            admin: "dashboards/admin-dashboard.html",
            receptionist: "dashboards/receptionist-dashboard.html",
            doctor: "dashboards/doctor-dashboard.html",
            patient: "dashboards/patient-dashboard.html",
            pharmacist: "dashboards/pharmacist-dashboard.html",
            laboratory: "dashboards/laboratory-dashboard.html",
            accountant: "dashboards/accountant-dashboard.html"
        };

        window.location.href = roleDashboards[currentUser.role] || "login.html";
        return;
    }

    // 2. DISPLAY STAFF INFORMATION
    const staffName = currentUser.name || currentUser.email;
    const staffNameElement = document.getElementById("staffName");
    const headerNameElement = document.getElementById("headerName");
    const staffRoleElement = document.getElementById("staffRole");
    const headerRoleElement = document.getElementById("headerRole");

    const roleNames = {
        admin: "System Admin",
        receptionist: "Receptionist",
        doctor: "Doctor",
        pharmacist: "Pharmacist",
        laboratory: "Laboratory Technician",
        accountant: "Accountant"
    };

    if (staffNameElement) staffNameElement.textContent = staffName;
    if (headerNameElement) headerNameElement.textContent = staffName;
    if (staffRoleElement) staffRoleElement.textContent = roleNames[currentUser.role] || currentUser.role;
    if (headerRoleElement) headerRoleElement.textContent = roleNames[currentUser.role] || currentUser.role;

    // 3. SET MAXIMUM DATE OF BIRTH
    const dobInput = document.getElementById("dob");
    if (dobInput) {
        const today = new Date();
        dobInput.max = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
    }

    // 4. FORM ELEMENTS
    const registrationForm = document.getElementById("patientRegistrationForm");
    const registrationMessage = document.getElementById("registrationMessage");

    if (!registrationForm || !registrationMessage) {
        console.error("Patient registration form or message element was not found.");
        return;
    }

    // 5. MESSAGE HELPER
    function showMessage(message, type) {
        registrationMessage.textContent = message;
        registrationMessage.className = "form-message " + type;
    }

    // 6. PATIENT STORAGE
    function getPatients() {
        try {
            const patients = JSON.parse(localStorage.getItem("semasacarePatients") || "[]");
            return Array.isArray(patients) ? patients : [];
        } catch (error) {
            console.error("Unable to read patient records:", error);
            return [];
        }
    }

    function generatePatientID(patients) {
        let id;
        do {
            id = "PAT-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
        } while (patients.some((patient) => String(patient.id) === id));
        return id;
    }

    // 7. REGISTER PATIENT
    registrationForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const phone = document.getElementById("phone").value.trim();
        const dob = document.getElementById("dob").value;
        const gender = document.getElementById("gender").value;
        const bloodGroup = document.getElementById("bloodGroup").value;
        const address = document.getElementById("address").value.trim();
        const emergencyContact = document.getElementById("emergencyContact").value.trim();

        if (!name || !email || !phone || !dob || !gender || !address) {
            showMessage("Please complete all required fields.", "error");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage("Please enter a valid email address.", "error");
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            showMessage("Phone number must contain exactly 10 digits.", "error");
            return;
        }

        if (emergencyContact && !/^\d{10}$/.test(emergencyContact)) {
            showMessage("Emergency contact must contain exactly 10 digits.", "error");
            return;
        }

        const birthDate = new Date(dob + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(birthDate.getTime()) || birthDate >= today) {
            showMessage("Date of birth must be earlier than today.", "error");
            return;
        }

        const patients = getPatients();
        const duplicateEmail = patients.some((patient) => String(patient.email || "").trim().toLowerCase() === email);
        if (duplicateEmail) {
            showMessage("A patient with this email address is already registered.", "error");
            return;
        }

        const newPatient = {
            id: generatePatientID(patients),
            name: name,
            email: email,
            phone: phone,
            dob: dob,
            gender: gender,
            bloodGroup: bloodGroup,
            address: address,
            emergencyContact: emergencyContact,
            role: "patient",
            registeredBy: currentUser.email || currentUser.name || "Staff",
            registrationDate: new Date().toISOString()
        };

        try {
            patients.push(newPatient);
            localStorage.setItem("semasacarePatients", JSON.stringify(patients));
            showMessage("Patient registered successfully! Patient ID: " + newPatient.id, "success");
            registrationForm.reset();
        } catch (error) {
            console.error("Unable to save patient:", error);
            showMessage("Unable to save the patient record. Please try again.", "error");
        }
    });

    // 8. CLEAR MESSAGE WHEN FORM IS RESET
    registrationForm.addEventListener("reset", function () {
        registrationMessage.textContent = "";
        registrationMessage.className = "form-message";
    });

    // 9. MOBILE SIDEBAR TOGGLE
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");
    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    // 10. LOGOUT
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.removeItem("semasacareSession");
            window.location.href = "login.html";
        });
    }
});
