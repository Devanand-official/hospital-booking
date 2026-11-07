
/* =========================================
   SEMASACARE - AUTHENTICATION MODULE
   Frontend demonstration only
========================================= */

const SemasaAuth = (() => {

    // Demo accounts for frontend testing only.
    // Replace with server-side authentication in production.
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

    // Dashboard locations
    const roleDashboards = {
        admin: "admin-dashboard.html",
        receptionist: "receptionist-dashboard.html",
        doctor: "doctor-dashboard.html",
        patient: "patient-dashboard.html",
        pharmacist: "pharmacist-dashboard.html",
        laboratory: "laboratory-dashboard.html",
        accountant: "accountant-dashboard.html"
    };


    // Authenticate user
    function login(email, password) {

        const user = demoUsers.find((item) =>
            item.email.toLowerCase() === email.toLowerCase() &&
            item.password === password
        );

        if (!user) {
            return {
                success: false,
                message: "Invalid email address or password."
            };
        }

        // Store session information
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

        const session = localStorage.getItem("semasacareSession");

        if (!session) {
            return null;
        }

        try {
            return JSON.parse(session);
        } catch (error) {
            localStorage.removeItem("semasacareSession");
            return null;
        }
    }


    // Check whether user is logged in
    function isLoggedIn() {
        return getCurrentUser() !== null;
    }


    // Redirect according to assigned role
    function redirectByRole(role) {

        const dashboard = roleDashboards[role];

        if (!dashboard) {
            alert("Dashboard not available for this role.");
            return;
        }

        window.location.href = "dashboards/" + dashboard;
    }


    // Logout user
    function logout() {

        localStorage.removeItem("semasacareSession");

        window.location.href = "../login.html";
    }


    // Protect pages from unauthenticated access
    function requireLogin() {

        if (!isLoggedIn()) {
            window.location.href = "../login.html";
            return false;
        }

        return true;
    }


    // Check whether the logged-in user has a required role
    function requireRole(allowedRoles) {

        const user = getCurrentUser();

        if (!user) {
            window.location.href = "../login.html";
            return false;
        }

        if (!allowedRoles.includes(user.role)) {
            alert("You do not have permission to access this page.");
            redirectByRole(user.role);
            return false;
        }

        return true;
    }


    // Public authentication functions
    return {
        login,
        logout,
        getCurrentUser,
        isLoggedIn,
        redirectByRole,
        requireLogin,
        requireRole
    };

})();
