
document.addEventListener("DOMContentLoaded", function () {
    // ------------------------------------
    // 1. Check login and user permissions
    // ------------------------------------

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

    // Allow receptionists and administrators.
    const allowedRoles = ["receptionist", "admin"];

    if (!allowedRoles.includes(currentUser.role)) {
        const dashboards = {
            admin: "admin-dashboard.html",
            receptionist: "receptionist-dashboard.html",
            doctor: "doctor-dashboard.html",
            patient: "patient-dashboard.html",
            pharmacist: "pharmacist-dashboard.html",
            laboratory: "laboratory-dashboard.html",
            accountant: "accountant-dashboard.html"
        };

        const destination = dashboards[currentUser.role];

        window.location.href = destination
            ? destination
            : "../login.html";

        return;
    }

    // ------------------------------------
    // 2. Display receptionist information
    // ------------------------------------

    const receptionistName =
        currentUser.name || currentUser.email || "Receptionist";
        

    const nameElements = [
        document.getElementById("receptionistName"),
        document.getElementById("headerName")
        
    ];
    

    nameElements.forEach(function (element) {
        if (element) {
            element.textContent = receptionistName;
        }
    });

    const currentDateElement = document.getElementById("currentDate");

    if (currentDateElement) {
        currentDateElement.textContent =
            new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
    }

    // ------------------------------------
    // 3. Load registered users
    // ------------------------------------

    function getRegisteredUsers() {
        try {
            return JSON.parse(
                localStorage.getItem("semasacareUsers")
            ) || [];
        } catch (error) {
            console.error("Could not read registered users:", error);
            return [];
        }
    }

    const demoUsers = [
        {
            name: "Administrator",
            email: "admin@semasacare.com",
            role: "admin"
        },
        {
            name: "Receptionist",
            email: "reception@semasacare.com",
            role: "receptionist"
        },
        {
            name: "Doctor",
            email: "doctor@semasacare.com",
            role: "doctor"
        },
        {
            name: "Patient",
            email: "patient@semasacare.com",
            role: "patient"
        },
        {
            name: "Pharmacist",
            email: "pharmacist@semasacare.com",
            role: "pharmacist"
        },
        {
            name: "Laboratory Technician",
            email: "lab@semasacare.com",
            role: "laboratory"
        },
        {
            name: "Accountant",
            email: "accountant@semasacare.com",
            role: "accountant"
        }
    ];

    const registeredUsers = getRegisteredUsers();
    const allUsers = [...demoUsers, ...registeredUsers];

    const patients = allUsers.filter(
        user => user.role === "patient"
    );

    const doctors = allUsers.filter(
        user => user.role === "doctor"
    );

    // ------------------------------------
    // 4. Load appointment information
    // ------------------------------------

    function getAppointments() {
        try {
            return JSON.parse(
                localStorage.getItem("semasacareAppointments")
            ) || [];
        } catch (error) {
            console.error("Could not read appointments:", error);
            return [];
        }
    }

    const appointments = getAppointments();

    const pendingAppointments = appointments.filter(function (appointment) {
        return String(appointment.status || "").toLowerCase() === "pending";
    });

    // ------------------------------------
    // 5. Update dashboard statistics
    // ------------------------------------

    function updateNumber(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    updateNumber("totalPatients", patients.length);
    updateNumber("totalDoctors", doctors.length);
    updateNumber("totalAppointments", appointments.length);
    updateNumber("pendingAppointments", pendingAppointments.length);

    // ------------------------------------
    // 6. Display recent appointments
    // ------------------------------------

    const appointmentsTable = document.getElementById(
        "recentAppointments"
    );

    function formatDate(dateValue) {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return String(dateValue);
        }

        return date.toLocaleDateString("en-IN");
    }

    function addCell(row, value) {
        const cell = document.createElement("td");
        cell.textContent = value || "—";
        row.appendChild(cell);
    }

    if (appointmentsTable) {
        appointmentsTable.textContent = "";

        if (appointments.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No appointments found.";
            cell.style.textAlign = "center";

            row.appendChild(cell);
            appointmentsTable.appendChild(row);
        } else {
            const recentAppointments = [...appointments]
                .reverse()
                .slice(0, 5);

            recentAppointments.forEach(function (appointment) {
                const row = document.createElement("tr");

                addCell(row, appointment.patientName);
                addCell(row, appointment.doctorName);
                addCell(row, formatDate(appointment.date));
                addCell(row, appointment.time);

                const statusCell = document.createElement("td");
                const status = document.createElement("span");

                status.textContent = appointment.status || "Pending";
                status.className =
                    "status " +
                    String(appointment.status || "pending").toLowerCase();

                statusCell.appendChild(status);
                row.appendChild(statusCell);

                appointmentsTable.appendChild(row);
            });
        }
    }

    // ------------------------------------
    // 7. Mobile sidebar toggle
    // ------------------------------------

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    // ------------------------------------
    // 8. Logout
    // ------------------------------------

    const logoutButton = document.getElementById("logoutBtn");

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            SemasaAuth.logout();
        });
    }
});
