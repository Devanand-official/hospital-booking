
/* ==========================================
   SEMASACARE - PHARMACY REPORTS
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
    // 2. STORAGE
    // =====================================

    const MEDICINE_KEY = "semasacareMedicines";
    const PRESCRIPTION_KEY = "semasacarePrescriptions";
    const DISPENSING_KEY = "semasacareDispensingHistory";
    const TRANSACTION_KEY = "semasacareStockTransactions";

    function getStorageArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return [];
        }
    }

    function getMedicines() {
        return getStorageArray(MEDICINE_KEY);
    }

    function getPrescriptions() {
        return getStorageArray(PRESCRIPTION_KEY);
    }

    function getDispensingHistory() {
        return getStorageArray(DISPENSING_KEY);
    }

    function getTransactions() {
        return getStorageArray(TRANSACTION_KEY);
    }

    // =====================================
    // 3. COMMON HELPERS
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

    function getStock(medicine) {
        const value = Number(
            medicine.stockQuantity ??
            medicine.quantity ??
            medicine.stock ??
            0
        );

        return Number.isFinite(value) ? value : 0;
    }

    function getMinimumStock(medicine) {
        const value = Number(
            medicine.reorderLevel ??
            medicine.minimumStock ??
            10
        );

        return Number.isFinite(value) ? value : 10;
    }

    function getMedicineName(medicine) {
        return (
            medicine.name ||
            medicine.medicineName ||
            medicine.medicine ||
            "Unnamed Medicine"
        );
    }

    function formatDate(value) {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-IN");
    }

    function getLocalDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDate(value) {
        if (!value) return null;

        // Handle date-only strings without UTC timezone shifting.
        const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));

        if (dateOnly) {
            const date = new Date(
                Number(dateOnly[1]),
                Number(dateOnly[2]) - 1,
                Number(dateOnly[3])
            );

            if (
                date.getFullYear() !== Number(dateOnly[1]) ||
                date.getMonth() !== Number(dateOnly[2]) - 1 ||
                date.getDate() !== Number(dateOnly[3])
            ) {
                return null;
            }

            return date;
        }

        const date = new Date(value);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    function getExpiryInfo(medicine) {
        const expiryDate = parseDate(
            medicine.expiryDate || medicine.expiry
        );

        if (!expiryDate) {
            return { days: null, status: "Unknown" };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        expiryDate.setHours(0, 0, 0, 0);

        const days = Math.round(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        if (days < 0) {
            return { days, status: "Expired" };
        }

        if (days <= 30) {
            return { days, status: "Expiring Soon" };
        }

        return { days, status: "Valid" };
    }

    function getStockStatus(medicine) {
        const expiry = getExpiryInfo(medicine);
        const stock = getStock(medicine);

        if (expiry.status === "Expired") {
            return { label: "Expired", className: "expired" };
        }

        if (stock <= 0) {
            return { label: "Out of Stock", className: "out" };
        }

        if (stock <= getMinimumStock(medicine)) {
            return { label: "Low Stock", className: "low" };
        }

        if (expiry.status === "Expiring Soon") {
            return { label: "Expiring Soon", className: "expiring" };
        }

        return { label: "Available", className: "available" };
    }

    function getActivityDate(item) {
        return parseDate(
            item.dispensedAt ||
            item.date ||
            item.createdAt
        );
    }

    // =====================================
    // 4. DATE FILTER
    // =====================================

    const reportPeriod = document.getElementById("reportPeriod");
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");

    const customDateFilters =
        document.getElementById("customDateFilters");

    const customEndDateFilter =
        document.getElementById("customEndDateFilter");

    let selectedStartDate = null;
    let selectedEndDate = null;

    function updateCustomDateVisibility() {
        const isCustom = reportPeriod.value === "custom";

        customDateFilters.hidden = !isCustom;
        customEndDateFilter.hidden = !isCustom;
    }

    function getDateRange() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const period = reportPeriod.value;

        let start = null;
        let end = new Date(today);

        if (period === "today") {
            start = new Date(today);
        }

        else if (period === "week") {
            start = new Date(today);

            const day = (start.getDay() + 6) % 7;
            start.setDate(start.getDate() - day);
        }

        else if (period === "month") {
            start = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );
        }

        else if (period === "year") {
            start = new Date(today.getFullYear(), 0, 1);
        }

        else if (period === "custom") {
            if (!startDateInput.value || !endDateInput.value) {
                return { error: "Please select both start and end dates." };
            }

            start = parseDate(startDateInput.value);
            end = parseDate(endDateInput.value);

            if (!start || !end) {
                return { error: "Please enter valid dates." };
            }

            if (start > end) {
                return { error: "Start date cannot be after end date." };
            }

            end.setHours(23, 59, 59, 999);
        }

        else if (period === "all") {
            return { start: null, end: null };
        }

        if (start) {
            start.setHours(0, 0, 0, 0);
        }

        return { start, end };
    }

    function isWithinRange(value, range) {
        const date = parseDate(value);

        if (!date) return false;

        if (range.start && date < range.start) return false;
        if (range.end && date > range.end) return false;

        return true;
    }

    function getPeriodLabel() {
        const labels = {
            today: "Today",
            week: "This Week",
            month: "This Month",
            year: "This Year",
            custom: "Custom Date Range",
            all: "All Time"
        };

        if (reportPeriod.value === "custom") {
            return `${startDateInput.value} to ${endDateInput.value}`;
        }

        return labels[reportPeriod.value] || "Selected Period";
    }

    // =====================================
    // 5. SUMMARY STATISTICS
    // =====================================

    function updateStatistics(range) {
        const medicines = getMedicines();

        const totalStock = medicines.reduce(
            (total, medicine) => total + getStock(medicine),
            0
        );

        const lowStock = medicines.filter(medicine =>
            getStock(medicine) > 0 &&
            getStock(medicine) <= getMinimumStock(medicine) &&
            getExpiryInfo(medicine).status !== "Expired"
        );

        const dispensing = getDispensingHistory();

        const filteredDispensing = dispensing.filter(item =>
            isWithinRange(
                item.dispensedAt || item.date || item.createdAt,
                range
            )
        );

        document.getElementById("reportTotalMedicines").textContent =
            medicines.length;

        document.getElementById("reportTotalStock").textContent =
            totalStock.toLocaleString("en-IN");

        document.getElementById("reportLowStock").textContent =
            lowStock.length;

        document.getElementById("reportDispensed").textContent =
            filteredDispensing.length;
    }

    // =====================================
    // 6. STOCK REPORT
    // =====================================

    function displayStockReport() {
        const medicines = getMedicines();
        const tbody = document.getElementById("stockReportBody");

        if (!medicines.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="report-empty">
                        No medicine records available.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = medicines.map(medicine => {
            const status = getStockStatus(medicine);

            return `
                <tr>
                    <td>${escapeHTML(medicine.id || "N/A")}</td>
                    <td>${escapeHTML(getMedicineName(medicine))}</td>
                    <td>${escapeHTML(medicine.category || "N/A")}</td>
                    <td>${getStock(medicine)}</td>
                    <td>${getMinimumStock(medicine)}</td>
                    <td>
                        <span class="report-status ${status.className}">
                            ${status.label}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 7. DISPENSING REPORT
    // =====================================

    function displayDispensingReport(range) {
        const history = getDispensingHistory();

        const filtered = history
            .filter(item =>
                isWithinRange(
                    item.dispensedAt || item.date || item.createdAt,
                    range
                )
            )
            .sort((a, b) => {
                return (
                    (getActivityDate(b)?.getTime() || 0) -
                    (getActivityDate(a)?.getTime() || 0)
                );
            });

        const tbody = document.getElementById("dispensingReportBody");

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="report-empty">
                        No dispensing records found for this period.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const date = getActivityDate(item);

            const medicine = (
                item.medicineName ||
                item.medicine ||
                item.name ||
                "N/A"
            );

            const quantity = (
                item.quantity ??
                item.dispensedQuantity ??
                item.totalQuantity ??
                "N/A"
            );

            const status = item.status || "Dispensed";

            const statusClass =
                String(status).toLowerCase() === "cancelled"
                    ? "cancelled"
                    : String(status).toLowerCase() === "pending"
                        ? "pending"
                        : "dispensed";

            return `
                <tr>
                    <td>${escapeHTML(item.id || item.transactionId || "N/A")}</td>
                    <td>${escapeHTML(item.patientName || "N/A")}</td>
                    <td>${escapeHTML(item.prescriptionId || "N/A")}</td>
                    <td>${escapeHTML(medicine)}</td>
                    <td>${escapeHTML(quantity)}</td>
                    <td>${date ? date.toLocaleDateString("en-IN") : "N/A"}</td>
                    <td>
                        <span class="report-status ${statusClass}">
                            ${escapeHTML(status)}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 8. EXPIRY REPORT
    // =====================================

    function displayExpiryReport() {
        const medicines = getMedicines();

        const filtered = medicines
            .filter(medicine => {
                return Boolean(medicine.expiryDate || medicine.expiry);
            })
            .sort((a, b) => {
                const dateA = parseDate(a.expiryDate || a.expiry);
                const dateB = parseDate(b.expiryDate || b.expiry);

                return (dateA?.getTime() || 0) -
                    (dateB?.getTime() || 0);
            });

        const tbody = document.getElementById("expiryReportBody");

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="report-empty">
                        No expiry records available.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(medicine => {
            const expiry = getExpiryInfo(medicine);

            let statusClass = "valid";

            if (expiry.status === "Expired") {
                statusClass = "expired";
            } else if (expiry.status === "Expiring Soon") {
                statusClass = "expiring";
            } else if (expiry.status === "Unknown") {
                statusClass = "neutral";
            }

            return `
                <tr>
                    <td>${escapeHTML(getMedicineName(medicine))}</td>
                    <td>${escapeHTML(medicine.batchNumber || "N/A")}</td>
                    <td>${getStock(medicine)}</td>
                    <td>${formatDate(medicine.expiryDate || medicine.expiry)}</td>
                    <td>
                        ${expiry.days === null
                    ? "N/A"
                    : expiry.days < 0
                        ? `${Math.abs(expiry.days)} days ago`
                        : `${expiry.days} days`}
                    </td>
                    <td>
                        <span class="report-status ${statusClass}">
                            ${expiry.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 9. STOCK TRANSACTION REPORT
    // =====================================

    function displayStockTransactions(range) {
        const transactions = getTransactions();

        const filtered = transactions
            .filter(item => isWithinRange(item.date, range))
            .sort((a, b) =>
                new Date(b.date || 0) - new Date(a.date || 0)
            );

        const tbody = document.getElementById("stockTransactionBody");

        if (!filtered.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="report-empty">
                        No stock transactions found for this period.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const isStockIn = item.type === "in";

            return `
                <tr>
                    <td>${escapeHTML(item.id || "N/A")}</td>
                    <td>${escapeHTML(item.medicineName || "N/A")}</td>
                    <td>
                        <span class="report-status ${isStockIn ? "available" : "neutral"}">
                            ${isStockIn ? "Stock In" : "Stock Out"}
                        </span>
                    </td>
                    <td>
                        <span class="${isStockIn ? "transaction-in" : "transaction-out"}">
                            ${isStockIn ? "+" : "-"}${Number(item.quantity) || 0}
                        </span>
                    </td>
                    <td>${formatDate(item.date)}</td>
                    <td>${escapeHTML(item.reason || "N/A")}</td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 10. REFRESH REPORTS
    // =====================================

    function generateReports() {
        const range = getDateRange();

        if (range.error) {
            alert(range.error);
            return;
        }

        selectedStartDate = range.start;
        selectedEndDate = range.end;

        document.getElementById("reportPeriodLabel").textContent =
            `Showing reports for: ${getPeriodLabel()}`;

        updateStatistics(range);
        displayStockReport();
        displayDispensingReport(range);
        displayExpiryReport();
        displayStockTransactions(range);
    }

    // =====================================
    // 11. CSV EXPORT
    // =====================================

    function exportCSV() {
        const range = getDateRange();

        if (range.error) {
            alert(range.error);
            return;
        }

        const rows = [];

        function addSection(title, headers, data) {
            rows.push([title]);
            rows.push(headers);
            data.forEach(row => rows.push(row));
            rows.push([]);
        }

        const medicines = getMedicines();

        addSection(
            "STOCK REPORT",
            ["Medicine ID", "Medicine Name", "Category", "Stock", "Reorder Level", "Status"],
            medicines.map(medicine => [
                medicine.id || "",
                getMedicineName(medicine),
                medicine.category || "",
                getStock(medicine),
                getMinimumStock(medicine),
                getStockStatus(medicine).label
            ])
        );

        const dispensing = getDispensingHistory().filter(item =>
            isWithinRange(
                item.dispensedAt || item.date || item.createdAt,
                range
            )
        );

        addSection(
            "DISPENSING REPORT",
            ["Transaction ID", "Patient", "Prescription ID", "Medicine", "Quantity", "Date", "Status"],
            dispensing.map(item => [
                item.id || item.transactionId || "",
                item.patientName || "",
                item.prescriptionId || "",
                item.medicineName || item.medicine || item.name || "",
                item.quantity ?? item.dispensedQuantity ?? "",
                item.dispensedAt || item.date || "",
                item.status || "Dispensed"
            ])
        );

        addSection(
            "EXPIRY REPORT",
            ["Medicine", "Batch Number", "Stock", "Expiry Date", "Days Remaining", "Status"],
            medicines
                .filter(medicine => medicine.expiryDate || medicine.expiry)
                .map(medicine => {
                    const expiry = getExpiryInfo(medicine);

                    return [
                        getMedicineName(medicine),
                        medicine.batchNumber || "",
                        getStock(medicine),
                        medicine.expiryDate || medicine.expiry,
                        expiry.days ?? "",
                        expiry.status
                    ];
                })
        );

        const transactions = getTransactions().filter(item =>
            isWithinRange(item.date, range)
        );

        addSection(
            "STOCK TRANSACTIONS",
            ["Transaction ID", "Medicine", "Type", "Quantity", "Date", "Reason"],
            transactions.map(item => [
                item.id || "",
                item.medicineName || "",
                item.type || "",
                item.quantity || 0,
                item.date || "",
                item.reason || ""
            ])
        );

        function escapeCSV(value) {
            return `"${String(value ?? "").replace(/"/g, '""')}"`;
        }

        const csv = "\uFEFF" + rows
            .map(row => row.map(escapeCSV).join(","))
            .join("\r\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
            `SemasaCare_Pharmacy_Report_${getLocalDateString(new Date())}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    }

    // =====================================
    // 12. SIDEBAR
    // =====================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    // =====================================
    // 13. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {

            if (confirm("Are you sure you want to logout?")) {
                SemasaAuth.logout();
                window.location.href = "../login.html";
            }
        });

    // =====================================
    // 14. EVENT LISTENERS
    // =====================================

    reportPeriod.addEventListener("change", function () {
        updateCustomDateVisibility();
    });

    document.getElementById("applyFilterBtn")
        .addEventListener("click", generateReports);

    document.getElementById("exportReportBtn")
        .addEventListener("click", exportCSV);

    document.getElementById("printReportBtn")
        .addEventListener("click", function () {
            window.print();
        });

    // =====================================
    // 15. INITIALIZE
    // =====================================

    updateCustomDateVisibility();
    generateReports();

});
