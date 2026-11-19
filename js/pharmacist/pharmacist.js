
/* ==========================================
   SEMASACARE - PHARMACIST DASHBOARD
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "pharmacist") {
        window.location.href = "../login.html";
        return;
    }

    const pharmacistName =
        currentUser.name || currentUser.fullName || "Pharmacist";

    document.getElementById("pharmacistName").textContent = pharmacistName;
    document.getElementById("headerName").textContent = pharmacistName;

    // =====================================
    // 2. LOCAL STORAGE HELPERS
    // =====================================

    function getStorageArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return [];
        }
    }

    // =====================================
    // 3. DATE
    // =====================================

    function displayDashboardDate() {
        const dateElement = document.querySelector("#dashboardDate span");

        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    // =====================================
    // 4. MEDICINE DATA
    // =====================================

    function getMedicines() {
        return getStorageArray("semasacareMedicines");
    }

    function getStock(medicine) {
        const value =
            medicine.stockQuantity ??
            medicine.quantity ??
            medicine.stock ??
            0;

        const quantity = Number(value);

        return Number.isFinite(quantity) ? quantity : 0;
    }

    function getMedicineName(medicine) {
        return (
            medicine.name ||
            medicine.medicineName ||
            medicine.medicine ||
            "Unnamed Medicine"
        );
    }

    // =====================================
    // 5. PRESCRIPTION DATA
    // =====================================

    function getPrescriptions() {
        return getStorageArray("semasacarePrescriptions");
    }

    function isPendingPrescription(prescription) {
        const status = String(prescription.status || "Pending")
            .trim()
            .toLowerCase();

        return status === "pending" ||
            status === "partially dispensed";
    }

    // =====================================
    // 6. UPDATE STATISTICS
    // =====================================

    function updateStatistics() {

        const medicines = getMedicines();
        const prescriptions = getPrescriptions();

        const totalStock = medicines.reduce(
            (total, medicine) => total + getStock(medicine),
            0
        );

        const lowStock = medicines.filter(
            medicine => getStock(medicine) <=
                Number(medicine.reorderLevel ?? medicine.minimumStock ?? 10)
        );

        const pendingPrescriptions = prescriptions.filter(
            isPendingPrescription
        );

        document.getElementById("totalMedicines").textContent =
            medicines.length;

        document.getElementById("totalStock").textContent =
            totalStock.toLocaleString("en-IN");

        document.getElementById("lowStockCount").textContent =
            lowStock.length;

        document.getElementById("pendingPrescriptions").textContent =
            pendingPrescriptions.length;

        document.getElementById("pendingPrescriptionBadge").textContent =
            pendingPrescriptions.length;
    }

    // =====================================
    // 7. LOW STOCK ALERTS
    // =====================================

    function displayLowStock() {

        const medicines = getMedicines();

        const lowStock = medicines.filter(medicine => {
            const minimumStock = Number(
                medicine.reorderLevel ??
                medicine.minimumStock ??
                10
            );

            return getStock(medicine) <= minimumStock;
        });

        const container = document.getElementById("lowStockList");

        if (lowStock.length === 0) {
            container.innerHTML =
                `<p class="empty-message">No low-stock medicines.</p>`;
            return;
        }

        container.innerHTML = lowStock.slice(0, 5).map(medicine => `
            <div class="pharmacy-alert-item">
                <div>
                    <strong>${escapeHTML(getMedicineName(medicine))}</strong>
                    <span>Minimum stock: ${Number(medicine.reorderLevel ??
            medicine.minimumStock ?? 10)
            }</span>
                </div>

                <span class="alert-quantity">
                    ${getStock(medicine)} left
                </span>
            </div>
        `).join("");
    }

    // =====================================
    // 8. EXPIRY ALERTS
    // =====================================

    function displayExpiringMedicines() {

        const medicines = getMedicines();
        const container =
            document.getElementById("expiringMedicineList");

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const limit = new Date(today);
        limit.setDate(limit.getDate() + 30);

        const expiringMedicines = medicines
            .filter(medicine => {

                const expiryValue =
                    medicine.expiryDate || medicine.expiry;

                if (!expiryValue) return false;

                const expiryDate = new Date(expiryValue);

                if (Number.isNaN(expiryDate.getTime())) return false;

                expiryDate.setHours(0, 0, 0, 0);

                return expiryDate >= today && expiryDate <= limit;
            })
            .sort((a, b) => {
                const dateA = new Date(a.expiryDate || a.expiry);
                const dateB = new Date(b.expiryDate || b.expiry);
                return dateA - dateB;
            });

        if (expiringMedicines.length === 0) {
            container.innerHTML =
                `<p class="empty-message">No expiry alerts.</p>`;
            return;
        }

        container.innerHTML = expiringMedicines.slice(0, 5)
            .map(medicine => {

                const expiryDate = new Date(
                    medicine.expiryDate || medicine.expiry
                );

                return `
                    <div class="pharmacy-alert-item">
                        <div>
                            <strong>${escapeHTML(getMedicineName(medicine))}</strong>
                            <span>Expiry date: ${expiryDate.toLocaleDateString("en-IN")
                    }</span>
                        </div>

                        <span class="alert-expiry">
                            Expiring soon
                        </span>
                    </div>
                `;
            }).join("");
    }

    // =====================================
    // 9. RECENT DISPENSING ACTIVITY
    // =====================================

    function displayRecentActivity() {

        const history = getStorageArray(
            "semasacareDispensingHistory"
        );

        const tableBody =
            document.getElementById("recentActivityBody");

        if (history.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">
                        No dispensing activity available.
                    </td>
                </tr>
            `;
            return;
        }

        const recentHistory = [...history]
            .sort((a, b) => {
                return new Date(b.dispensedAt || b.date || 0) -
                    new Date(a.dispensedAt || a.date || 0);
            })
            .slice(0, 5);

        tableBody.innerHTML = recentHistory.map(item => {

            const activityDate = new Date(
                item.dispensedAt || item.date
            );

            const formattedDate = Number.isNaN(activityDate.getTime())
                ? "N/A"
                : activityDate.toLocaleDateString("en-IN");

            return `
                <tr>
                    <td>${escapeHTML(item.id || item.transactionId || "N/A")}</td>
                    <td>${escapeHTML(item.patientName || "N/A")}</td>
                    <td>${escapeHTML(item.prescriptionId || "N/A")}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <span class="activity-status">
                            ${escapeHTML(item.status || "Dispensed")}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 10. HTML ESCAPE HELPER
    // =====================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    // =====================================
    // 11. SIDEBAR MENU
    // =====================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    // =====================================
    // 12. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {

            // if (confirm("Are you sure you want to logout?")) {
            SemasaAuth.logout();
            // window.location.href = "../login.html";
        }
        );

    // =====================================
    // 13. INITIALIZE DASHBOARD
    // =====================================

    function initializeDashboard() {
        displayDashboardDate();
        updateStatistics();
        displayLowStock();
        displayExpiringMedicines();
        displayRecentActivity();
    }

    initializeDashboard();

});
