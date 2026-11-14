
document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // ADMIN AUTHENTICATION
    // ==========================================

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

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

    // ==========================================
    // ADMIN PROFILE
    // ==========================================

    const adminName = document.getElementById("adminName");

    if (adminName) {
        adminName.textContent = currentUser.name || "Administrator";
    }

    const currentDate = document.getElementById("currentDate");

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    // ==========================================
    // READ REGISTERED USERS
    // ==========================================

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

    const demoStaff = [
        { role: "admin" },
        { role: "receptionist" },
        { role: "doctor" },
        { role: "pharmacist" },
        { role: "laboratory" },
        { role: "accountant" }
    ];

    const registeredUsers = getRegisteredUsers();

    // ==========================================
    // DASHBOARD STATISTICS
    // ==========================================

    const demoPatientCount = 1;

    const registeredPatientCount = registeredUsers.filter(
        user => user.role === "patient"
    ).length;

    const totalPatients = demoPatientCount + registeredPatientCount;

    const demoDoctorCount = demoStaff.filter(
        user => user.role === "doctor"
    ).length;

    const registeredDoctorCount = registeredUsers.filter(
        user => user.role === "doctor"
    ).length;

    const totalDoctors = demoDoctorCount + registeredDoctorCount;

    const totalStaff =
        demoStaff.length +
        registeredUsers.filter(
            user => user.role !== "patient"
        ).length;

    // ==========================================
    // READ APPOINTMENTS
    // ==========================================

    function getAppointments() {
        try {
            const data = JSON.parse(
                localStorage.getItem("semasacareAppointments") || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to read appointments:", error);
            return [];
        }
    }

    const appointments = getAppointments();

    // ==========================================
    // UPDATE DASHBOARD STATISTICS
    // ==========================================

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

    // ==========================================
    // APPOINTMENT DATE AND TIME SORTING
    // ==========================================

    function getAppointmentTimestamp(appointment) {

        const date = String(appointment.date || "").trim();
        const time = String(appointment.time || "").trim();

        if (!date) {
            return 0;
        }

        let year;
        let month;
        let day;

        // Supports YYYY-MM-DD
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {

            [year, month, day] = date.split("-").map(Number);

        }

        // Supports DD-MM-YYYY and DD/MM/YYYY
        else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {

            [day, month, year] = date.split(/[-/]/).map(Number);

        }

        // Supports dates parseable by JavaScript
        else {

            const parsedDate = new Date(date);

            if (Number.isNaN(parsedDate.getTime())) {
                return 0;
            }

            year = parsedDate.getFullYear();
            month = parsedDate.getMonth() + 1;
            day = parsedDate.getDate();
        }

        let hours = 0;
        let minutes = 0;

        const timeMatch = time.match(
            /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
        );

        if (timeMatch) {

            hours = Number(timeMatch[1]);
            minutes = Number(timeMatch[2]);

            const period = timeMatch[3]?.toUpperCase();

            if (period === "PM" && hours < 12) {
                hours += 12;
            }

            if (period === "AM" && hours === 12) {
                hours = 0;
            }
        }

        const timestamp = new Date(
            year,
            month - 1,
            day,
            hours,
            minutes
        ).getTime();

        return Number.isNaN(timestamp) ? 0 : timestamp;
    }
    // ==========================================
// NORMALIZE APPOINTMENT DATE
// ==========================================

function normalizeAppointmentDate(dateValue) {

    const date = String(dateValue || "").trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {

        const [year, month, day] = date.split("-").map(Number);

        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {

        const [day, month, year] = date.split(/[-/]/).map(Number);

        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return "";
}

    // ==========================================
// DISPLAY TODAY'S APPOINTMENTS
// READ-ONLY ADMIN VIEW
// ==========================================

const todayAppointments =
    document.getElementById("recentAppointments");

if (todayAppointments) {

    todayAppointments.textContent = "";

    const today = new Date();

    const todayDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    // Filter today's appointments and sort by time
    const todaysList = [...appointments]
        .filter(appointment => {
            return normalizeAppointmentDate(appointment.date) === todayDate;
        })
        .sort((a, b) => {
            return getAppointmentTimestamp(a) -
                   getAppointmentTimestamp(b);
        });

    if (todaysList.length === 0) {

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No appointments scheduled for today.";
        cell.style.textAlign = "center";

        row.appendChild(cell);
        todayAppointments.appendChild(row);

    } else {

        todaysList.forEach(appointment => {

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
                        String(value)
                            .toLowerCase()
                            .replace(/\s+/g, "-")
                    );
                }

                row.appendChild(cell);
            });

            todayAppointments.appendChild(row);
        });
    }
}
    // ==========================================
    // MOBILE SIDEBAR
    // ==========================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

        const sidebarLinks =
            sidebar.querySelectorAll(".menu-item");

        sidebarLinks.forEach(link => {

            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });
        });
    }

    // ==========================================
    // LOGOUT
    // ==========================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", function () {
            SemasaAuth.logout();
        });
    }

});
