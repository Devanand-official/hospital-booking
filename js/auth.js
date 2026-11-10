const SemasaAuth = (() => {

    // Demo accounts for testing
    const demoUsers = [
        {
            id: 1,
            name: "Hospital Admin",
            email: "admin@semasacare.com",
            password: "Admin@123",
            role: "admin"
        },
        {
            id: 2,
            name: "Receptionist",
            email: "reception@semasacare.com",
            password: "Reception@123",
            role: "receptionist"
        },
        {
            id: 3,
            name: "Doctor",
            email: "doctor@semasacare.com",
            password: "Doctor@123",
            role: "doctor"
        },
        {
            id: 4,
            name: "Patient",
            email: "patient@semasacare.com",
            password: "Patient@123",
            role: "patient"
        },
        {
            id: 5,
            name: "Pharmacist",
            email: "pharmacist@semasacare.com",
            password: "Pharmacist@123",
            role: "pharmacist"
        },
        {
            id: 6,
            name: "Lab Technician",
            email: "lab@semasacare.com",
            password: "Lab@123",
            role: "laboratory"
        },
        {
            id: 7,
            name: "Accountant",
            email: "accountant@semasacare.com",
            password: "Accountant@123",
            role: "accountant"
        }
    ];

    // Dashboard pages for each role
    const roleDashboards = {
        admin: "admin-dashboard.html",
        receptionist: "receptionist-dashboard.html",
        doctor: "doctor-dashboard.html",
        patient: "patient-dashboard.html",
        pharmacist: "pharmacist-dashboard.html",
        laboratory: "laboratory-dashboard.html",
        accountant: "accountant-dashboard.html"
    };

    // Get registered users from localStorage
    function getRegisteredUsers() {
        try {
            const users = JSON.parse(
                localStorage.getItem("semasacareUsers")
            );

            return Array.isArray(users) ? users : [];
        } catch (error) {
            return [];
        }
    }

    // Save registered users
    function saveRegisteredUsers(users) {
        localStorage.setItem(
            "semasacareUsers",
            JSON.stringify(users)
        );
    }

    // Register a new patient
    function register(userData) {

        const users = getRegisteredUsers();

        const allUsers = [...demoUsers, ...users];

        const email = userData.email.trim().toLowerCase();

        // Check duplicate email
        const emailExists = allUsers.some(
            user => user.email.toLowerCase() === email
        );

        if (emailExists) {
            return {
                success: false,
                message: "This email address is already registered."
            };
        }

        // Create patient account
        const newUser = {
            id: Date.now(),
            name: userData.name.trim(),
            email: email,
            phone: userData.phone,
            dob: userData.dob,
            gender: userData.gender,
            address: userData.address,
            password: userData.password,
            role: "patient"
        };

        users.push(newUser);

        saveRegisteredUsers(users);

        return {
            success: true,
            message: "Patient account created successfully."
        };
    }

    // Login function
    function login(email, password) {

        const registeredUsers = getRegisteredUsers();

        const allUsers = [...demoUsers, ...registeredUsers];

        const user = allUsers.find(
            user =>
                user.email.toLowerCase() === email.trim().toLowerCase() &&
                user.password === password
        );

        if (!user) {
            return {
                success: false,
                message: "Invalid email address or password."
            };
        }

        // Create login session without storing password
        const session = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem(
            "semasacareSession",
            JSON.stringify(session)
        );

        return {
            success: true,
            user: session
        };
    }

    // Get current logged-in user
    function getCurrentUser() {
        try {
            return JSON.parse(
                localStorage.getItem("semasacareSession")
            );
        } catch (error) {
            return null;
        }
    }

    // Check login status
    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    // Redirect according to role
    function redirectByRole(role) {

        const dashboard = roleDashboards[role];

        if (!dashboard) {
            console.error("Invalid user role.");
            return;
        }

        window.location.href = "dashboards/" + dashboard;
    }

    // Logout
    function logout() {
        localStorage.removeItem("semasacareSession");
        window.location.href = "../login.html";
    }

    // Require login before accessing a page
    function requireLogin() {

        if (!isLoggedIn()) {
            window.location.href = "../login.html";
            return false;
        }

        return true;
    }

    // Restrict access by role
    function requireRole(allowedRoles) {

        const user = getCurrentUser();

        if (!user) {
            window.location.href = "../login.html";
            return false;
        }

        if (!allowedRoles.includes(user.role)) {
            alert("You are not authorized to access this page.");
            redirectByRole(user.role);
            return false;
        }

        return true;
    }

    return {
        register,
        login,
        logout,
        getCurrentUser,
        isLoggedIn,
        redirectByRole,
        requireLogin,
        requireRole
    };

})();