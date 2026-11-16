
/* ==========================================
   SemasaCare - Doctor Appointment Management
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

    if (currentUser.role !== "doctor") {
        const dashboardPaths = {
            admin: "../admin-dashboard.html",
            receptionist: "../dashboards/receptionist-dashboard.html",
            patient: "../patient-dashboard.html",
            pharmacist: "../pharmacist-dashboard.html",
            laboratory: "../laboratory-dashboard.html",
            accountant: "../accountant-dashboard.html"
        };

        window.location.href =
            dashboardPaths[currentUser.role] || "../login.html";

        return;
    }

    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const doctorName = document.getElementById("doctorName");
    const headerName = document.getElementById("headerName");
    const currentDate = document.getElementById("currentDate");

    const tableBody = document.getElementById("appointmentsTableBody");

    const searchPatient = document.getElementById("searchPatient");
    const dateFilter = document.getElementById("dateFilter");
    const statusFilter = document.getElementById("statusFilter");
    const resetFilters = document.getElementById("resetFilters");

    const totalAppointments = document.getElementById("totalAppointments");
    const pendingAppointments = document.getElementById("pendingAppointments");
    const completedAppointments = document.getElementById("completedAppointments");
    const cancelledAppointments = document.getElementById("cancelledAppointments");
    const showingCount = document.getElementById("showingCount");

    // =====================================
    // 3. DOCTOR INFORMATION
    // =====================================

    const name = currentUser.name || "Doctor";

    if (doctorName) doctorName.textContent = name;
    if (headerName) headerName.textContent = name;

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    // =====================================
    // 4. LOAD APPOINTMENTS
    // =====================================

    function getAppointments() {
        try {
            const data = JSON.parse(
                localStorage.getItem("semasacareAppointments") || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to load appointments:", error);
            return [];
        }
    }

    function saveAppointments(appointments) {
        try {
            localStorage.setItem(
                "semasacareAppointments",
                JSON.stringify(appointments)
            );

            return true;

        } catch (error) {
            console.error("Unable to save appointments:", error);
            alert("Unable to update appointment.");
            return false;
        }
    }

    // =====================================
    // 5. MATCH LOGGED-IN DOCTOR
    // =====================================

    function getDoctorAppointments() {
        const appointments = getAppointments();

        const doctorId = String(currentUser.id ?? "");

        const doctorEmail = String(currentUser.email || "")
            .trim()
            .toLowerCase();

        return appointments.filter((appointment) => {

            const appointmentDoctorId =
                String(appointment.doctorId ?? "");

            const appointmentDoctorEmail =
                String(appointment.doctorEmail || "")
                    .trim()
                    .toLowerCase();

            return (
                (doctorId && appointmentDoctorId === doctorId) ||
                (doctorEmail && appointmentDoctorEmail === doctorEmail)
            );
        });
    }

    // =====================================
    // 6. DATE FORMATTING
    // =====================================

    function normalizeDate(value) {
        const date = String(value || "").trim();

        // YYYY-MM-DD
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
            const [year, month, day] = date.split("-").map(Number);

            return [
                year,
                String(month).padStart(2, "0"),
                String(day).padStart(2, "0")
            ].join("-");
        }

        // DD-MM-YYYY or DD/MM/YYYY
        if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {
            const [day, month, year] = date.split(/[-/]/).map(Number);

            return [
                year,
                String(month).padStart(2, "0"),
                String(day).padStart(2, "0")
            ].join("-");
        }

        return "";
    }

    function formatDate(value) {
        const normalized = normalizeDate(value);

        if (!normalized) return value || "N/A";

        const [year, month, day] = normalized.split("-").map(Number);

        return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    // =====================================
    // 7. APPOINTMENT DATE AND TIME SORTING
    // =====================================

    function getAppointmentTimestamp(appointment) {

        const date = normalizeDate(appointment.date);

        if (!date) return Number.MAX_SAFE_INTEGER;

        const time = String(appointment.time || "").trim();

        let hours = 0;
        let minutes = 0;

        const match = time.match(
            /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
        );

        if (match) {
            hours = Number(match[1]);
            minutes = Number(match[2]);

            const period = match[3]?.toUpperCase();

            if (period === "PM" && hours < 12) {
                hours += 12;
            }

            if (period === "AM" && hours === 12) {
                hours = 0;
            }
        }

        const [year, month, day] = date.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day,
            hours,
            minutes
        ).getTime();
    }

    // =====================================
    // 8. STATUS BADGE
    // =====================================

    function createStatusBadge(status) {
        const badge = document.createElement("span");

        const safeStatus = String(status || "Pending");

        badge.className = "doctor-appointment-status";

        const normalized = safeStatus.toLowerCase();

        if (normalized === "completed") {
            badge.classList.add("completed");

        } else if (normalized === "cancelled") {
            badge.classList.add("cancelled");

        } else {
            badge.classList.add("pending");
        }

        badge.textContent = safeStatus;

        return badge;
    }

    // =====================================
    // 9. UPDATE STATISTICS
    // =====================================

    function updateStatistics(appointments) {

        if (totalAppointments) {
            totalAppointments.textContent = appointments.length;
        }

        if (pendingAppointments) {
            pendingAppointments.textContent = appointments.filter(
                (item) =>
                    String(item.status || "Pending").toLowerCase() === "pending"
            ).length;
        }

        if (completedAppointments) {
            completedAppointments.textContent = appointments.filter(
                (item) =>
                    String(item.status || "").toLowerCase() === "completed"
            ).length;
        }

        if (cancelledAppointments) {
            cancelledAppointments.textContent = appointments.filter(
                (item) =>
                    String(item.status || "").toLowerCase() === "cancelled"
            ).length;
        }
    }

    // =====================================
    // 10. RENDER APPOINTMENT TABLE
    // =====================================

    function renderAppointments() {

        if (!tableBody || !searchPatient || !dateFilter ||
            !statusFilter || !showingCount) {
            console.error("Appointment table elements are missing.");
            return;
        }

        const appointments = getDoctorAppointments();

        const searchText = searchPatient.value.trim().toLowerCase();
        const selectedDate = dateFilter.value;
        const selectedStatus = statusFilter.value;

        const filteredAppointments = appointments.filter((appointment) => {

            const patientName = String(
                appointment.patientName || ""
            ).toLowerCase();

            const appointmentDate = normalizeDate(appointment.date);

            const appointmentStatus = String(
                appointment.status || "Pending"
            );

            const matchesSearch = patientName.includes(searchText);

            const matchesDate =
                !selectedDate || appointmentDate === selectedDate;

            const matchesStatus =
                selectedStatus === "all" ||
                appointmentStatus.toLowerCase() ===
                selectedStatus.toLowerCase();

            return matchesSearch && matchesDate && matchesStatus;
        });

        // SORT BY DATE AND TIME - EARLIEST FIRST
        filteredAppointments.sort((a, b) => {
            return (
                getAppointmentTimestamp(a) -
                getAppointmentTimestamp(b)
            );
        });

        tableBody.replaceChildren();

        showingCount.textContent = filteredAppointments.length;

        if (filteredAppointments.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.className = "empty-message";

            cell.textContent =
                appointments.length === 0
                    ? "No appointments assigned to you yet."
                    : "No appointments match your filters.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        filteredAppointments.forEach((appointment) => {

            const row = document.createElement("tr");

            const values = [
                appointment.id || "N/A",
                appointment.patientName || "N/A",
                appointment.phone || "N/A",
                formatDate(appointment.date),
                appointment.time || "N/A"
            ];

            values.forEach((value) => {

                const cell = document.createElement("td");

                cell.textContent = value;

                row.appendChild(cell);
            });

            // STATUS
            const statusCell = document.createElement("td");

            statusCell.appendChild(
                createStatusBadge(appointment.status)
            );

            row.appendChild(statusCell);

            // ACTION - STATUS DROPDOWN
            const actionCell = document.createElement("td");

            const statusSelect = document.createElement("select");

            statusSelect.className = "appointment-status-select";

            statusSelect.dataset.appointmentId = appointment.id;

            const statuses = ["Pending", "Completed", "Cancelled"];

            statuses.forEach((status) => {

                const option = document.createElement("option");

                option.value = status;
                option.textContent = status;

                if (
                    status.toLowerCase() ===
                    String(appointment.status || "Pending").toLowerCase()
                ) {
                    option.selected = true;
                }

                statusSelect.appendChild(option);
            });

            actionCell.appendChild(statusSelect);

            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // =====================================
    // 11. UPDATE APPOINTMENT STATUS
    // =====================================

    function updateAppointmentStatus(appointmentId, newStatus) {

        const appointments = getAppointments();

        const appointment = appointments.find(
            (item) => String(item.id) === String(appointmentId)
        );

        if (!appointment) {
            alert("Appointment not found.");
            return;
        }

        const belongsToDoctor =
            String(appointment.doctorId ?? "") ===
                String(currentUser.id ?? "") ||
            String(appointment.doctorEmail || "").toLowerCase() ===
                String(currentUser.email || "").toLowerCase();

        if (!belongsToDoctor) {
            alert("You cannot update another doctor's appointment.");
            return;
        }

        const validStatuses = ["Pending", "Completed", "Cancelled"];

        const matchedStatus = validStatuses.find(
            (status) => status.toLowerCase() === newStatus.toLowerCase()
        );

        if (!matchedStatus) {
            alert("Invalid appointment status.");
            return;
        }

        appointment.status = matchedStatus;

        if (saveAppointments(appointments)) {
            refreshDashboard();
        }
    }

    // =====================================
    // 12. TABLE ACTION EVENTS
    // =====================================

    if (tableBody) {
        tableBody.addEventListener("change", (event) => {

            const select = event.target.closest(
                ".appointment-status-select"
            );

            if (!select) return;

            updateAppointmentStatus(
                select.dataset.appointmentId,
                select.value
            );
        });
    }

    // =====================================
    // 13. SEARCH AND FILTER EVENTS
    // =====================================

    searchPatient?.addEventListener("input", renderAppointments);

    dateFilter?.addEventListener("change", renderAppointments);

    statusFilter?.addEventListener("change", renderAppointments);

    resetFilters?.addEventListener("click", () => {

        if (searchPatient) searchPatient.value = "";
        if (dateFilter) dateFilter.value = "";
        if (statusFilter) statusFilter.value = "all";

        renderAppointments();
    });

    // =====================================
    // 14. SIDEBAR
    // =====================================

    document.getElementById("menuToggle")?.addEventListener("click", () => {
        document.getElementById("sidebar")?.classList.toggle("active");
    });

    // =====================================
    // 15. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")?.addEventListener("click", () => {

        localStorage.removeItem("semasacareSession");

        window.location.replace("../login.html");
    });

    // =====================================
    // 16. REFRESH DASHBOARD
    // =====================================

    function refreshDashboard() {

        const appointments = getDoctorAppointments();

        updateStatistics(appointments);

        renderAppointments();
    }

    // Refresh when appointments change in another browser tab
    window.addEventListener("storage", (event) => {

        if (event.key === "semasacareAppointments") {
            refreshDashboard();
        }
    });

    // =====================================
    // 17. INITIALIZE
    // =====================================

    refreshDashboard();

});
