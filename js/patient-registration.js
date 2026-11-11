
document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // 1. Check Login and Role Access
    // =========================================

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

        window.location.href =
            roleDashboards[currentUser.role] || "login.html";

        return;
    }


    // =========================================
    // 2. Display Staff Information
    // =========================================

    const staffName = currentUser.name || currentUser.email;

    const staffNameElement = document.getElementById("staffName");
    const headerNameElement = document.getElementById("headerName");
    const staffRoleElement = document.getElementById("staffRole");
    const headerRoleElement = document.getElementById("headerRole");

    if (staffNameElement) {
        staffNameElement.textContent = staffName;
    }

    if (headerNameElement) {
        headerNameElement.textContent = staffName;
    }

    if (staffRoleElement) {
        staffRoleElement.textContent = currentUser.role;
    }

    if (headerRoleElement) {
        headerRoleElement.textContent = currentUser.role;
    }


    // =========================================
    // 3. Set Maximum Date of Birth
    // =========================================

    const dobInput = document.getElementById("dob");

    if (dobInput) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        dobInput.max = `${year}-${month}-${day}`;
    }


    // =========================================
    // 4. Get Registration Form Elements
    // =========================================

    const registrationForm =
        document.getElementById("patientRegistrationForm");

    const registrationMessage =
        document.getElementById("registrationMessage");


    // =========================================
    // 5. Display Messages
    // =========================================

    function showMessage(message, type) {

        registrationMessage.textContent = message;
        registrationMessage.className = "form-message " + type;
    }


    // =========================================
    // 6. Get Existing Patient Records
    // =========================================

    function getPatients() {

        try {
            const patients =
                JSON.parse(localStorage.getItem("semasacarePatients")) || [];

            return Array.isArray(patients) ? patients : [];

        } catch (error) {
            return [];
        }
    }


    // =========================================
    // 7. Register Patient
    // =========================================

    registrationForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const name =
            document.getElementById("fullName").value.trim();

        const email =
            document.getElementById("email").value.trim().toLowerCase();

        const phone =
            document.getElementById("phone").value.trim();

        const dob =
            document.getElementById("dob").value;

        const gender =
            document.getElementById("gender").value;

        const bloodGroup =
            document.getElementById("bloodGroup").value;

        const address =
            document.getElementById("address").value.trim();

        const emergencyContact =
            document.getElementById("emergencyContact").value.trim();


        // Validate required fields

        if (!name || !email || !phone || !dob ||
            !gender || !address) {

            showMessage("Please complete all required fields.", "error");
            return;
        }


        // Validate email

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {

            showMessage("Please enter a valid email address.", "error");
            return;
        }


        // Validate phone number

        if (!/^\d{10}$/.test(phone)) {

            showMessage(
                "Phone number must contain exactly 10 digits.",
                "error"
            );

            return;
        }


        // Validate emergency contact if provided

        if (emergencyContact && !/^\d{10}$/.test(emergencyContact)) {

            showMessage(
                "Emergency contact must contain exactly 10 digits.",
                "error"
            );

            return;
        }


        // Validate date of birth

        const birthDate = new Date(dob + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (Number.isNaN(birthDate.getTime()) || birthDate >= today) {

            showMessage(
                "Date of birth must be earlier than today.",
                "error"
            );

            return;
        }


        // Check duplicate email

        const patients = getPatients();

        const emailExists = patients.some(function (patient) {
            return patient.email.toLowerCase() === email;
        });

        if (emailExists) {

            showMessage(
                "A patient with this email address is already registered.",
                "error"
            );

            return;
        }


        // Create patient record

        const newPatient = {

            id: "PAT-" + Date.now(),

            name: name,
            email: email,
            phone: phone,
            dob: dob,
            gender: gender,
            bloodGroup: bloodGroup,
            address: address,
            emergencyContact: emergencyContact,

            role: "patient",

            registeredBy: currentUser.email,

            registrationDate: new Date().toISOString()
        };


        // Save patient record

        try {

            patients.push(newPatient);

            localStorage.setItem(
                "semasacarePatients",
                JSON.stringify(patients)
            );

            showMessage(
                "Patient registered successfully!",
                "success"
            );

            registrationForm.reset();

        } catch (error) {

            showMessage(
                "Unable to save the patient record. Please try again.",
                "error"
            );

        }

    });


    // =========================================
    // 8. Clear Message When Form Is Reset
    // =========================================

    registrationForm.addEventListener("reset", function () {

        registrationMessage.textContent = "";
        registrationMessage.className = "form-message";

    });


    // =========================================
    // 9. Mobile Sidebar Toggle
    // =========================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

    }


    // =========================================
    // 10. Logout
    // =========================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", function () {

            localStorage.removeItem("semasacareSession");

            window.location.href = "login.html";

        });

    }

});
