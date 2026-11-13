
// ==========================================
// SEMASACARE - MANAGE APPOINTMENTS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // 1. AUTHENTICATION AND ROLE ACCESS

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const allowedRoles = ["admin", "receptionist"];

    if (!allowedRoles.includes(currentUser.role)) {
        SemasaAuth.redirectByRole(currentUser.role);
        return;
    }

    const isAdmin = currentUser.role === "admin";


    // 2. ROLE DISPLAY

    const roleNames = {
        admin: "System Admin",
        receptionist: "Receptionist",
        doctor: "Doctor",
        pharmacist: "Pharmacist",
        laboratory: "Laboratory Technician",
        accountant: "Accountant"
    };

    const displayName = isAdmin
        ? "Administrator"
        : currentUser.name;

    const displayRole =
        roleNames[currentUser.role] || currentUser.role;

    // Sidebar profile
    const staffName = document.getElementById("staffName");
    const staffRole = document.getElementById("staffRole");

    if (staffName) staffName.textContent = displayName;
    if (staffRole) staffRole.textContent = displayRole;

    // Sidebar icon
    const profileIcon = document.querySelector(".profile-icon i");

    if (profileIcon) {
        profileIcon.className = isAdmin
            ? "fas fa-user-shield"
            : "fas fa-user-tie";
    }

    // Navbar profile
    const headerName = document.getElementById("headerName");
    const headerRole = document.getElementById("headerRole");

    if (headerName) {
        headerName.textContent = isAdmin
            ? "Hospital Admin"
            : currentUser.name;
    }

    if (headerRole) {
        headerRole.textContent = displayRole;
    }

    // Navbar icon
    const headerIcon = document.querySelector(".header-avatar i");

    if (headerIcon) {
        headerIcon.className = isAdmin
            ? "fas fa-user-shield"
            : "fas fa-user-tie";
    }


    // 3. ADMIN SIDEBAR

    if (isAdmin) {

        const sidebarMenu = document.querySelector(".sidebar-menu");

        if (sidebarMenu) {
            sidebarMenu.innerHTML = `
                <p class="menu-heading">MAIN MENU</p>

                <a href="dashboards/admin-dashboard.html" class="menu-item">
                    <i class="fas fa-chart-pie"></i>
                    <span>Dashboard</span>
                </a>

                <a href="user-management.html" class="menu-item">
                    <i class="fas fa-users"></i>
                    <span>User Management</span>
                </a>

                <a href="manage-appointments.html" class="menu-item active">
                    <i class="fas fa-calendar-check"></i>
                    <span>Manage Appointments</span>
                </a>

                <a href="patient-list.html" class="menu-item">
                    <i class="fas fa-file-medical"></i>
                    <span>Patient Records</span>
                </a>

                <a href="doctors.html" class="menu-item">
                    <i class="fas fa-user-doctor"></i>
                    <span>Doctors</span>
                </a>

                <p class="menu-heading">HOSPITAL SERVICES</p>

                <a href="appointments.html" class="menu-item">
                    <i class="fas fa-calendar-plus"></i>
                    <span>New Appointment</span>
                </a>
            `;
        }
    }


    // 4. GET HTML ELEMENTS

    const appointmentsTableBody =
        document.getElementById("appointmentsTableBody");

    const searchInput =
        document.getElementById("searchAppointment");

    const statusFilter =
        document.getElementById("statusFilter");

    const dateFilter =
        document.getElementById("dateFilter");

    const appointmentCount =
        document.getElementById("appointmentCount");

    const totalAppointments =
        document.getElementById("totalAppointments");

    const pendingAppointments =
        document.getElementById("pendingAppointments");

    const confirmedAppointments =
        document.getElementById("confirmedAppointments");

    const completedAppointments =
        document.getElementById("completedAppointments");

    const appointmentDetails =
        document.getElementById("appointmentDetails");

    const appointmentDetailsContent =
        document.getElementById("appointmentDetailsContent");

    const closeDetails =
        document.getElementById("closeDetails");


    // 5. GET SAVED APPOINTMENTS

    const STORAGE_KEY = "semasacareAppointments";

    function getAppointments() {

        try {
            const savedData = localStorage.getItem(STORAGE_KEY);

            const appointments = savedData
                ? JSON.parse(savedData)
                : [];

            return Array.isArray(appointments)
                ? appointments
                : [];

        } catch (error) {
            console.error("Unable to load appointments:", error);
            return [];
        }
    }


    // 6. SAVE APPOINTMENTS

    function saveAppointments(appointments) {

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(appointments)
            );

            return true;

        } catch (error) {
            console.error("Unable to save appointments:", error);
            alert("Unable to save changes. Please check browser storage.");
            return false;
        }
    }


    // 7. FORMAT DATE

    function formatDate(dateString) {

        if (!dateString) return "N/A";

        const date = new Date(dateString + "T00:00:00");

        if (Number.isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    // 8. CREATE TABLE CELL

    function createCell(text) {

        const td = document.createElement("td");
        td.textContent = text || "N/A";

        return td;
    }


    // 9. CREATE STATUS LABEL

    function createStatusLabel(status) {

        const span = document.createElement("span");

        const validStatuses = [
            "Pending",
            "Confirmed",
            "Cancelled",
            "Completed"
        ];

        const safeStatus = validStatuses.includes(status)
            ? status
            : "Pending";

        span.className =
            "status status-" + safeStatus.toLowerCase();

        span.textContent = safeStatus;

        return span;
    }


    // 10. UPDATE SUMMARY CARDS

    function updateSummary(appointments) {

        totalAppointments.textContent = appointments.length;

        pendingAppointments.textContent =
            appointments.filter(a => a.status === "Pending").length;

        confirmedAppointments.textContent =
            appointments.filter(a => a.status === "Confirmed").length;

        completedAppointments.textContent =
            appointments.filter(a => a.status === "Completed").length;
    }


    // 11. CREATE ACTION BUTTON

    function createActionButton(label, action, className, id) {

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = label;
        button.className = "appointment-action-btn " + className;

        button.dataset.action = action;
        button.dataset.id = id;

        return button;
    }


    // 12. DISPLAY APPOINTMENTS

    function displayAppointments() {

        const appointments = getAppointments();

        const searchText = searchInput.value
            .trim()
            .toLowerCase();

        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;

        const filteredAppointments = appointments.filter(a => {

            const matchesSearch = [
                a.id,
                a.patientName,
                a.doctorName,
                a.specialty
            ].some(value =>
                String(value || "")
                    .toLowerCase()
                    .includes(searchText)
            );

            const matchesStatus =
                selectedStatus === "all" ||
                a.status === selectedStatus;

            const matchesDate =
                !selectedDate || a.date === selectedDate;

            return matchesSearch && matchesStatus && matchesDate;

        });

        appointmentsTableBody.replaceChildren();

        updateSummary(appointments);

        appointmentCount.textContent =
            "Showing " + filteredAppointments.length +
            " of " + appointments.length + " appointments";


        if (filteredAppointments.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 8;
            cell.className = "empty-message";
            cell.textContent = appointments.length === 0
                ? "No appointments have been booked yet."
                : "No matching appointments found.";

            row.appendChild(cell);
            appointmentsTableBody.appendChild(row);

            return;
        }


        filteredAppointments.forEach(appointment => {

            const row = document.createElement("tr");

            row.appendChild(createCell(appointment.id));
            row.appendChild(createCell(appointment.patientName));
            row.appendChild(createCell(appointment.doctorName));
            row.appendChild(createCell(appointment.specialty));
            row.appendChild(createCell(formatDate(appointment.date)));
            row.appendChild(createCell(appointment.time));

            // Status
            const statusCell = document.createElement("td");

            statusCell.appendChild(
                createStatusLabel(appointment.status)
            );

            row.appendChild(statusCell);


            // Action buttons
            const actionCell = document.createElement("td");

            actionCell.appendChild(
                createActionButton(
                    "View",
                    "view",
                    "view-appointment-btn",
                    appointment.id
                )
            );

            if (appointment.status === "Pending") {

                actionCell.appendChild(
                    createActionButton(
                        "Confirm",
                        "confirm",
                        "confirm-appointment-btn",
                        appointment.id
                    )
                );

            }

            if (
                appointment.status === "Pending" ||
                appointment.status === "Confirmed"
            ) {

                actionCell.appendChild(
                    createActionButton(
                        "Cancel",
                        "cancel",
                        "cancel-appointment-btn",
                        appointment.id
                    )
                );

            }

            if (appointment.status === "Confirmed") {

                actionCell.appendChild(
                    createActionButton(
                        "Complete",
                        "complete",
                        "complete-appointment-btn",
                        appointment.id
                    )
                );

            }

            row.appendChild(actionCell);

            appointmentsTableBody.appendChild(row);

        });
    }


    // 13. VIEW APPOINTMENT DETAILS

    function viewAppointment(id) {

        const appointment = getAppointments().find(
            a => String(a.id) === String(id)
        );

        if (!appointment) return;

        appointmentDetailsContent.replaceChildren();

        const details = [
            ["Appointment ID", appointment.id],
            ["Patient Name", appointment.patientName],
            ["Age", appointment.age],
            ["Email", appointment.email],
            ["Phone", appointment.phone],
            ["Gender", appointment.gender],
            ["Doctor", appointment.doctorName],
            ["Specialty", appointment.specialty],
            ["Date", formatDate(appointment.date)],
            ["Time", appointment.time],
            ["Reason", appointment.reason],
            ["Status", appointment.status],
            ["Booked At", appointment.bookedAt
                ? new Date(appointment.bookedAt).toLocaleString("en-IN")
                : "N/A"]
        ];

        details.forEach(([label, value]) => {

            const paragraph = document.createElement("p");

            const strong = document.createElement("strong");

            strong.textContent = label + ": ";

            paragraph.append(
                strong,
                document.createTextNode(String(value || "N/A"))
            );

            appointmentDetailsContent.appendChild(paragraph);

        });

        appointmentDetails.style.display = "block";

        appointmentDetails.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }


    // 14. CHANGE APPOINTMENT STATUS

    function changeAppointmentStatus(id, newStatus) {

        const appointments = getAppointments();

        const index = appointments.findIndex(
            a => String(a.id) === String(id)
        );

        if (index === -1) {
            alert("Appointment not found.");
            return;
        }

        const appointment = appointments[index];

        const allowedTransitions = {
            Pending: ["Confirmed", "Cancelled"],
            Confirmed: ["Completed", "Cancelled"],
            Cancelled: [],
            Completed: []
        };

        if (
            !allowedTransitions[appointment.status] ||
            !allowedTransitions[appointment.status].includes(newStatus)
        ) {
            alert("This status change is not allowed.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to change the appointment status to " +
            newStatus + "?"
        );

        if (!confirmed) return;

        appointment.status = newStatus;

        appointment.updatedAt = new Date().toISOString();

        if (!saveAppointments(appointments)) return;

        if (appointmentDetails.style.display === "block") {
            viewAppointment(id);
        }

        displayAppointments();

        alert("Appointment status updated successfully.");
    }


    // 15. HANDLE TABLE ACTIONS

    appointmentsTableBody.addEventListener("click", function(event) {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "view") {
            viewAppointment(id);
        }

        if (action === "confirm") {
            changeAppointmentStatus(id, "Confirmed");
        }

        if (action === "cancel") {
            changeAppointmentStatus(id, "Cancelled");
        }

        if (action === "complete") {
            changeAppointmentStatus(id, "Completed");
        }

    });


    // 16. SEARCH AND FILTER EVENTS

    searchInput.addEventListener("input", displayAppointments);

    statusFilter.addEventListener("change", displayAppointments);

    dateFilter.addEventListener("change", displayAppointments);


    // 17. CLOSE APPOINTMENT DETAILS

    closeDetails.addEventListener("click", function() {

        appointmentDetails.style.display = "none";

    });


    // 18. MOBILE SIDEBAR

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", function() {
            sidebar.classList.toggle("active");
        });

    }


    // 19. LOGOUT

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", function() {
            SemasaAuth.logout();
        });

    }


    // 20. INITIAL DISPLAY

    displayAppointments();

});
