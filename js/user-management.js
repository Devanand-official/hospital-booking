
document.addEventListener("DOMContentLoaded", function () {

    // 1. Check administrator access
    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    if (currentUser.role !== "admin") {
        const dashboardPaths = {
            receptionist: "dashboards/receptionist-dashboard.html",
            doctor: "dashboards/doctor-dashboard.html",
            patient: "dashboards/patient-dashboard.html",
            pharmacist: "dashboards/pharmacist-dashboard.html",
            laboratory: "dashboards/laboratory-dashboard.html",
            accountant: "dashboards/accountant-dashboard.html"
        };

        window.location.href =
            dashboardPaths[currentUser.role] || "login.html";
        return;
    }

    // 2. Demo accounts
    const demoUsers = [
        {
            name: "Administrator",
            email: "admin@semasacare.com",
            phone: "Not provided",
            role: "admin"
        },
        {
            name: "Receptionist",
            email: "reception@semasacare.com",
            phone: "Not provided",
            role: "receptionist"
        },
        {
            name: "Doctor",
            email: "doctor@semasacare.com",
            phone: "Not provided",
            role: "doctor"
        },
        {
            name: "Patient",
            email: "patient@semasacare.com",
            phone: "Not provided",
            role: "patient"
        },
        {
            name: "Pharmacist",
            email: "pharmacist@semasacare.com",
            phone: "Not provided",
            role: "pharmacist"
        },
        {
            name: "Laboratory Technician",
            email: "lab@semasacare.com",
            phone: "Not provided",
            role: "laboratory"
        },
        {
            name: "Accountant",
            email: "accountant@semasacare.com",
            phone: "Not provided",
            role: "accountant"
        }
    ];

    // 3. Safely load registered users
    function getRegisteredUsers() {
        try {
            const users = JSON.parse(
                localStorage.getItem("semasacareUsers") || "[]"
            );

            return Array.isArray(users) ? users : [];
        } catch (error) {
            console.error("Error loading users:", error);
            return [];
        }
    }

    function saveRegisteredUsers(users) {
        try {
            localStorage.setItem(
                "semasacareUsers",
                JSON.stringify(users)
            );
            return true;
        } catch (error) {
            console.error("Error saving users:", error);
            return false;
        }
    }

    // 4. Combine demo and registered accounts
    let registeredUsers = getRegisteredUsers();

    function getAllUsers() {
        return [
            ...demoUsers.map(user => ({
                ...user,
                accountType: "Demo Account"
            })),

            ...registeredUsers.map(user => ({
                name: user.name || "Unnamed User",
                email: user.email || "No email",
                phone: user.phone || "Not provided",
                role: user.role || "patient",
                accountType: "Registered Account"
            }))
        ];
    }

    // 5. HTML elements
    const usersTableBody = document.getElementById("usersTableBody");
    const searchUser = document.getElementById("searchUser");
    const roleFilter = document.getElementById("roleFilter");
    const userMessage = document.getElementById("userMessage");

    const totalUsers = document.getElementById("totalUsers");
    const totalPatients = document.getElementById("totalPatients");
    const totalStaff = document.getElementById("totalStaff");

    const createStaffForm = document.getElementById("createStaffForm");
    const staffMessage = document.getElementById("staffMessage");

    // 6. Update summary cards
    function updateSummary() {
        const allUsers = getAllUsers();

        totalUsers.textContent = allUsers.length;

        totalPatients.textContent = allUsers.filter(
            user => user.role === "patient"
        ).length;

        totalStaff.textContent = allUsers.filter(
            user => user.role !== "patient"
        ).length;
    }

    // 7. Display users
    function displayUsers(users) {
        usersTableBody.textContent = "";

        if (users.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 5;
            cell.textContent = "No users found.";
            cell.style.textAlign = "center";

            row.appendChild(cell);
            usersTableBody.appendChild(row);
            return;
        }

        users.forEach(user => {
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = user.name;

            const emailCell = document.createElement("td");
            emailCell.textContent = user.email;

            const phoneCell = document.createElement("td");
            phoneCell.textContent = user.phone;

            const roleCell = document.createElement("td");
            const roleBadge = document.createElement("span");

            roleBadge.className = "user-role";
            roleBadge.textContent = user.role;

            roleCell.appendChild(roleBadge);

            const accountCell = document.createElement("td");
            accountCell.className = "account-type";
            accountCell.textContent = user.accountType;

            row.append(
                nameCell,
                emailCell,
                phoneCell,
                roleCell,
                accountCell
            );

            usersTableBody.appendChild(row);
        });
    }

    // 8. Search and filter
    function filterUsers() {
        const allUsers = getAllUsers();

        const searchText = searchUser.value.trim().toLowerCase();
        const selectedRole = roleFilter.value;

        const filteredUsers = allUsers.filter(user => {
            const matchesSearch =
                user.name.toLowerCase().includes(searchText) ||
                user.email.toLowerCase().includes(searchText);

            const matchesRole =
                selectedRole === "all" ||
                user.role === selectedRole;

            return matchesSearch && matchesRole;
        });

        displayUsers(filteredUsers);

        if (userMessage) {
            userMessage.textContent =
                `Showing ${filteredUsers.length} of ${allUsers.length} users.`;
        }
    }

    searchUser.addEventListener("input", filterUsers);
    roleFilter.addEventListener("change", filterUsers);

    // 9. Create staff account
    createStaffForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("staffName").value.trim();
        const email = document.getElementById("staffEmail").value.trim().toLowerCase();
        const phone = document.getElementById("staffPhone").value.trim();
        const role = document.getElementById("staffRole").value;
        const password = document.getElementById("staffPassword").value;

        const allowedRoles = [
            "doctor",
            "receptionist",
            "pharmacist",
            "laboratory",
            "accountant"
        ];

        if (!name || !email || !phone || !role || !password) {
            staffMessage.textContent = "Please complete all fields.";
            staffMessage.style.color = "red";
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            staffMessage.textContent = "Please enter a valid email address.";
            staffMessage.style.color = "red";
            return;
        }

        if (!/^\d{10}$/.test(phone)) {
            staffMessage.textContent =
                "Enter a valid 10-digit phone number.";
            staffMessage.style.color = "red";
            return;
        }

        if (password.length < 8) {
            staffMessage.textContent =
                "Password must contain at least 8 characters.";
            staffMessage.style.color = "red";
            return;
        }

        if (!allowedRoles.includes(role)) {
            staffMessage.textContent = "Please select a valid staff role.";
            staffMessage.style.color = "red";
            return;
        }

        registeredUsers = getRegisteredUsers();

        // Prevent duplicate emails in demo and registered accounts
        const duplicateEmail = [
            ...demoUsers,
            ...registeredUsers
        ].some(user =>
            user.email.toLowerCase() === email
        );

        if (duplicateEmail) {
            staffMessage.textContent =
                "An account with this email already exists.";
            staffMessage.style.color = "red";
            return;
        }

        // Save the new staff account
        const newStaff = {
            id: Date.now().toString(),
            name: name,
            email: email,
            phone: phone,
            role: role,
            password: password,
            accountType: "Registered Account"
        };

        registeredUsers.push(newStaff);

        if (!saveRegisteredUsers(registeredUsers)) {
            registeredUsers.pop();

            staffMessage.textContent =
                "Unable to save the account. Check browser storage.";
            staffMessage.style.color = "red";
            return;
        }

        staffMessage.textContent =
            "Staff account created successfully!";
        staffMessage.style.color = "green";

        createStaffForm.reset();

        updateSummary();
        filterUsers();
    });

    // 10. Initial page display
    updateSummary();
    filterUsers();

});
