
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


// Display logged-in staff details.
document.getElementById("staffName").textContent = currentUser.name;
document.getElementById("headerName").textContent = currentUser.name;

const staffRoleElement = document.getElementById("staffRole");
if (staffRoleElement) {
    staffRoleElement.textContent =
        currentUser.role === "admin" ? "System Admin" : "Receptionist";
}

// Show the correct sidebar based on the logged-in role.

// Update sidebar profile.
document.getElementById("staffName").textContent = currentUser.name;

document.getElementById("staffRole").textContent =
    currentUser.role === "admin" ? "System Admin" : "Receptionist";

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

        <a href="appointments.html" class="menu-item">
            <i class="fas fa-calendar-check"></i>
            <span>Appointments</span>
        </a>

        <a href="doctors.html" class="menu-item">
            <i class="fas fa-user-md"></i>
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

        <a href="#" class="menu-item">
            <i class="fas fa-chart-line"></i>
            <span>Reports</span>
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
