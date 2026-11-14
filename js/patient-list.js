
document.addEventListener("DOMContentLoaded", function () {
    const currentUser = SemasaAuth.getCurrentUser();

    // Only admin and receptionist can access patient records.
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    const allowedRoles = ["admin", "receptionist"];

    if (!allowedRoles.includes(currentUser.role)) {
        window.location.href = "login.html";
        return;
    }



// Display consistent staff details.
const isAdmin = currentUser.role === "admin";

const roleNames = {
    admin: "System Admin",
    receptionist: "Receptionist",
    doctor: "Doctor",
    pharmacist: "Pharmacist",
    laboratory: "Laboratory Technician",
    accountant: "Accountant"
};

const displayName = isAdmin ? "Administrator" : currentUser.name;
const displayRole = roleNames[currentUser.role] || currentUser.role;

// Sidebar profile
document.getElementById("staffName").textContent = displayName;
document.getElementById("staffRole").textContent = displayRole;

// Switch sidebar icon based on role
const profileIcon = document.querySelector(".profile-icon i");

if (profileIcon) {
    profileIcon.className = isAdmin
        ? "fas fa-user-shield"
        : "fas fa-user-tie";
}

// Header profile
document.getElementById("headerName").textContent =
    isAdmin ? "Hospital Admin" : currentUser.name;

const headerRoleElement = document.getElementById("headerRole");

if (headerRoleElement) {
    headerRoleElement.textContent = displayRole;
}
// Switch navbar icon based on role
const headerIcon = document.querySelector(".header-avatar i");

if (headerIcon) {
    headerIcon.className = isAdmin
        ? "fas fa-user-shield"
        : "fas fa-user-tie";
}

// Only replace the sidebar menu for Admin.
// Receptionist keeps the original dashboard sidebar.
const sidebarMenu = document.querySelector(".sidebar-menu");

if (currentUser.role === "admin") {
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

        <a href="patient-list.html" class="menu-item active">
            <i class="fas fa-user-injured"></i>
            <span>Patient Records</span>
        </a>

        <a href="#" class="menu-item">
                    <i class="fas fa-user-doctor"></i>
                    <span>Doctors</span>
                </a>

                <a href="#" class="menu-item">
                    <i class="fas fa-hospital"></i>
                    <span>Departments</span>
                </a>

                <p class="menu-heading">HOSPITAL SERVICES</p>

                <a href="#" class="menu-item">
                    <i class="fas fa-pills"></i>
                    <span>Pharmacy</span>
                </a>

                <a href="#" class="menu-item">
                    <i class="fas fa-flask"></i>
                    <span>Laboratory</span>
                </a>

                <a href="#" class="menu-item">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <span>Billing & Payments</span>
                </a>

                <p class="menu-heading">SYSTEM</p>

                <a href="reports-analytics.html" class="menu-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Reports & Analytics</span>
                </a>

                <a href="hospital-settings.html" class="menu-item">
                    <i class="fas fa-cog"></i>
                    <span>Hospital Settings</span>
                </a>
    `;
}



// Patient records page elements.
const tableBody = document.getElementById("patientsTableBody");
const searchInput = document.getElementById("searchPatient");
const recordsCount = document.getElementById("recordsCount");
const recordDetails = document.getElementById("recordDetails");


    // Read records from the same storage key used by registration.
    function getPatients() {
        try {
            return JSON.parse(localStorage.getItem("semasacarePatients")) || [];
        } catch (error) {
            console.error("Unable to read patient records:", error);
            return [];
        }
    }

    function displayPatients(searchTerm = "") {
        const patients = getPatients();

        const filteredPatients = patients.filter(function (patient) {
            const searchText = searchTerm.toLowerCase();

            return (
                (patient.name || "").toLowerCase().includes(searchText) ||
                (patient.email || "").toLowerCase().includes(searchText) ||
                (patient.phone || "").toLowerCase().includes(searchText) ||
                (patient.id || "").toLowerCase().includes(searchText)
            );
        });

        recordsCount.textContent =
            `Showing ${filteredPatients.length} of ${patients.length} patient(s)`;

        tableBody.innerHTML = "";

        if (filteredPatients.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        ${patients.length === 0
                            ? "No patient records found. Register a patient first."
                            : "No matching patients found."}
                    </td>
                </tr>
            `;
            return;
        }

        filteredPatients.forEach(function (patient) {
            const row = document.createElement("tr");

            const values = [
                patient.id || "N/A",
                patient.name || "N/A",
                patient.email || "N/A",
                patient.phone || "N/A",
                patient.gender || "N/A"
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            const viewButton = document.createElement("button");

            viewButton.type = "button";
            viewButton.className = "view-btn";
            viewButton.textContent = "View";

            viewButton.addEventListener("click", function () {
                showPatientDetails(patient);
            });

            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);
            tableBody.appendChild(row);
        });
    }

    function showPatientDetails(patient) {
        recordDetails.style.display = "block";

        const details = [
            ["Patient ID", patient.id],
            ["Full Name", patient.name],
            ["Email", patient.email],
            ["Phone", patient.phone],
            ["Date of Birth", patient.dob],
            ["Gender", patient.gender],
            ["Blood Group", patient.bloodGroup],
            ["Address", patient.address],
            ["Emergency Contact", patient.emergencyContact],
            ["Registered By", patient.registeredBy],
            ["Registration Date", patient.registrationDate
                ? new Date(patient.registrationDate).toLocaleString()
                : "N/A"]
        ];

        recordDetails.innerHTML = "<h3>Patient Details</h3>";

        details.forEach(function ([label, value]) {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = label + ": ";
            paragraph.appendChild(strong);
            paragraph.appendChild(
                document.createTextNode(value || "N/A")
            );

            recordDetails.appendChild(paragraph);
        });

        recordDetails.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }

    // Search patients as the user types.
    searchInput.addEventListener("input", function () {
        recordDetails.style.display = "none";
        displayPatients(searchInput.value.trim());
    });

    // Sidebar mobile menu.
    document.getElementById("menuToggle").addEventListener("click", function () {
        document.querySelector(".sidebar").classList.toggle("active");
    });

    // Logout.
    document.getElementById("logoutBtn").addEventListener("click", function () {
        SemasaAuth.logout();
    });

    // Initial display.
    displayPatients();
});
