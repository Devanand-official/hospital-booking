
document.addEventListener("DOMContentLoaded", function () {
    // Check whether an administrator is logged in
    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

    // Redirect users who are not administrators
    if (currentUser.role !== "admin") {
        const dashboardPaths = {
            receptionist: "receptionist-dashboard.html",
            doctor: "doctor-dashboard.html",
            patient: "patient-dashboard.html",
            pharmacist: "pharmacist-dashboard.html",
            laboratory: "laboratory-dashboard.html",
            accountant: "accountant-dashboard.html"
        };

        window.location.href =
            dashboardPaths[currentUser.role] || "../login.html";
        return;
    }

    // Display administrator name
    const adminName = document.getElementById("adminName");

    if (adminName) {
        adminName.textContent = currentUser.name || "Administrator";
    }

    // Display current date
    const currentDate = document.getElementById("currentDate");

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    // Safely read registered users
    function getRegisteredUsers() {
        try {
            return JSON.parse(
                localStorage.getItem("semasacareUsers") || "[]"
            );
        } catch (error) {
            console.error("Unable to read registered users:", error);
            return [];
        }
    }

    // Demo staff accounts created in auth.js
    const demoStaff = [
        { role: "admin" },
        { role: "receptionist" },
        { role: "doctor" },
        { role: "pharmacist" },
        { role: "laboratory" },
        { role: "accountant" }
    ];

    const registeredUsers = getRegisteredUsers();

    // Count patients
    const demoPatientCount = 1;
    const registeredPatientCount = registeredUsers.filter(
        user => user.role === "patient"
    ).length;

    const totalPatients = demoPatientCount + registeredPatientCount;

    // Count doctors
    const demoDoctorCount = demoStaff.filter(
        user => user.role === "doctor"
    ).length;

    const registeredDoctorCount = registeredUsers.filter(
        user => user.role === "doctor"
    ).length;

    const totalDoctors = demoDoctorCount + registeredDoctorCount;

    // Count staff accounts, including the administrator
    const totalStaff =
        demoStaff.length + registeredUsers.filter(
            user => user.role !== "patient"
        ).length;

    // Read appointment data when the appointment module is connected
    function getAppointments() {
        try {
            return JSON.parse(
                localStorage.getItem("semasacareAppointments") || "[]"
            );
        } catch (error) {
            console.error("Unable to read appointments:", error);
            return [];
        }
    }

    const appointments = getAppointments();

    // Update dashboard statistics
    function updateStat(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    updateStat("totalPatients", totalPatients);
    updateStat("totalDoctors", totalDoctors);
    updateStat("totalAppointments", appointments.length);
    updateStat("totalStaff", totalStaff);

    // Display recent appointments
    const recentAppointments = document.getElementById("recentAppointments");

    if (recentAppointments) {
        recentAppointments.textContent = "";

        if (appointments.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No appointments available yet.";
            cell.style.textAlign = "center";

            row.appendChild(cell);
            recentAppointments.appendChild(row);
        } else {
            appointments.slice(-5).reverse().forEach(appointment => {
                const row = document.createElement("tr");

                const values = [
                    appointment.patientName || "N/A",
                    appointment.doctorName || "N/A",
                    appointment.date || "N/A",
                    appointment.time || "N/A",
                    appointment.status || "Pending"
                ];

                values.forEach((value, index) => {
                    const cell = document.createElement("td");
                    cell.textContent = value;

                    if (index === 4) {
                        cell.classList.add(
                            "status",
                            String(value).toLowerCase().replace(/\s+/g, "-")
                        );
                    }

                    row.appendChild(cell);
                });

                recentAppointments.appendChild(row);
            });
        }
    }

    // Mobile sidebar toggle
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

        // Close sidebar after selecting a navigation link
        const sidebarLinks = sidebar.querySelectorAll(".nav-link");

        sidebarLinks.forEach(link => {
            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });
        });
    }

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            SemasaAuth.logout();
        });
    }
});
