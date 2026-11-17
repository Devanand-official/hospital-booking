
/* ==========================================
   SEMASACARE - INVENTORY MANAGEMENT
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
    // 2. ELEMENTS AND STORAGE
    // =====================================

    const MEDICINE_KEY = "semasacareMedicines";
    const TRANSACTION_KEY = "semasacareStockTransactions";

    const stockFormSection = document.getElementById("stockFormSection");
    const stockForm = document.getElementById("stockForm");
    const stockMedicine = document.getElementById("stockMedicine");
    const stockMessage = document.getElementById("stockMessage");
    const inventoryTableBody = document.getElementById("inventoryTableBody");
    const stockHistoryBody = document.getElementById("stockHistoryBody");

    function getArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return [];
        }
    }

    function getMedicines() {
        return getArray(MEDICINE_KEY);
    }

    function getTransactions() {
        return getArray(TRANSACTION_KEY);
    }

    function saveMedicines(items) {
        localStorage.setItem(MEDICINE_KEY, JSON.stringify(items));
    }

    function saveTransactions(items) {
        localStorage.setItem(TRANSACTION_KEY, JSON.stringify(items));
    }

    // =====================================
    // 3. HELPERS
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

    function formatDate(value) {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-IN");
    }

    function formatDateTime(value) {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleString("en-IN");
    }

    function getStock(medicine) {
        const quantity = Number(medicine.stockQuantity ?? 0);
        return Number.isFinite(quantity) ? quantity : 0;
    }

    function getMinimumStock(medicine) {
        const value = Number(medicine.reorderLevel ?? 10);
        return Number.isFinite(value) ? value : 10;
    }


    function getExpiryState(medicine) {
        if (!medicine.expiryDate) return "none";

        // Parse YYYY-MM-DD as a date-only value to avoid timezone issues.
        const parts = String(medicine.expiryDate).split("-");

        if (parts.length !== 3) return "none";

        const [year, month, day] = parts.map(Number);

        const expiryTime = Date.UTC(year, month - 1, day);

        const expiry = new Date(expiryTime);

        if (
            !Number.isFinite(expiryTime) ||
            expiry.getUTCFullYear() !== year ||
            expiry.getUTCMonth() !== month - 1 ||
            expiry.getUTCDate() !== day
        ) {
            return "none";
        }

        const now = new Date();

        const todayTime = Date.UTC(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const daysRemaining = Math.round(
            (expiryTime - todayTime) / (1000 * 60 * 60 * 24)
        );

        if (daysRemaining < 0) return "expired";
        if (daysRemaining <= 30) return "expiring";

        return "valid";
    }


    function getStockStatus(medicine) {
        const expiryState = getExpiryState(medicine);

        if (expiryState === "expired") {
            return { label: "Expired", className: "expired" };
        }

        const stock = getStock(medicine);

        if (stock <= 0) {
            return { label: "Out of Stock", className: "out" };
        }

        if (stock <= getMinimumStock(medicine)) {
            return { label: "Low Stock", className: "low" };
        }

        if (expiryState === "expiring") {
            return { label: "Expiring Soon", className: "expiring" };
        }

        return { label: "Available", className: "available" };
    }

    function showMessage(message, success = false) {
        stockMessage.textContent = message;
        stockMessage.style.color = success ? "#15803d" : "#dc2626";
    }

    function resetStockForm() {
        stockForm.reset();
        stockMessage.textContent = "";
    }

    function openStockForm() {
        populateMedicineDropdown();
        stockFormSection.style.display = "block";

        stockFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function closeStockForm() {
        stockFormSection.style.display = "none";
        resetStockForm();
    }

    // =====================================
    // 4. MEDICINE DROPDOWN
    // =====================================

    function populateMedicineDropdown() {
        const medicines = getMedicines();

        stockMedicine.innerHTML =
            '<option value="">Select medicine</option>';

        medicines
            .slice()
            .sort((a, b) =>
                String(a.name).localeCompare(String(b.name))
            )
            .forEach(medicine => {
                const option = document.createElement("option");
                option.value = medicine.id;
                option.textContent =
                    `${medicine.name} (${medicine.medicineCode}) - Stock: ${getStock(medicine)}`;
                stockMedicine.appendChild(option);
            });
    }

    // =====================================
    // 5. STATISTICS
    // =====================================

    function updateStatistics() {
        const medicines = getMedicines();

        const totalStock = medicines.reduce(
            (total, medicine) => total + getStock(medicine),
            0
        );

        const lowStock = medicines.filter(medicine =>
            getStock(medicine) > 0 &&
            getStock(medicine) <= getMinimumStock(medicine) &&
            getExpiryState(medicine) !== "expired"
        );

        const outOfStock = medicines.filter(
            medicine => getStock(medicine) <= 0
        );

        document.getElementById("totalStockUnits").textContent =
            totalStock.toLocaleString("en-IN");

        document.getElementById("medicineTypes").textContent =
            medicines.length;

        document.getElementById("lowStockItems").textContent =
            lowStock.length;

        document.getElementById("outOfStockItems").textContent =
            outOfStock.length;
    }

    // =====================================
    // 6. DISPLAY INVENTORY
    // =====================================

    function displayInventory() {
        const medicines = getMedicines();

        const searchText = document.getElementById("searchInventory")
            .value.trim().toLowerCase();

        const filter = document.getElementById("inventoryFilter").value;

        const filtered = medicines.filter(medicine => {
            const searchContent = [
                medicine.name,
                medicine.medicineCode,
                medicine.genericName,
                medicine.batchNumber,
                medicine.manufacturer
            ].join(" ").toLowerCase();

            const matchesSearch = searchContent.includes(searchText);
            const status = getStockStatus(medicine);

            let matchesFilter = true;

            if (filter === "available") {
                matchesFilter = status.className === "available";
            } else if (filter === "low") {
                matchesFilter = status.className === "low";
            } else if (filter === "out") {
                matchesFilter = status.className === "out";
            } else if (filter === "expired") {
                matchesFilter = status.className === "expired";
            } else if (filter === "expiring") {
                matchesFilter = getExpiryState(medicine) === "expiring";
            }

            return matchesSearch && matchesFilter;
        });

        filtered.sort((a, b) =>
            String(a.name).localeCompare(String(b.name))
        );

        document.getElementById("inventoryCount").textContent =
            `Showing ${filtered.length} of ${medicines.length} medicines`;

        if (filtered.length === 0) {
            inventoryTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        No inventory records found.
                    </td>
                </tr>
            `;
            return;
        }

        inventoryTableBody.innerHTML = filtered.map(medicine => {
            const status = getStockStatus(medicine);

            return `
                <tr>
                    <td class="inventory-medicine-name">
                        <strong>${escapeHTML(medicine.name)}</strong>
                        <span>${escapeHTML(medicine.medicineCode)}</span>
                    </td>

                    <td>${escapeHTML(medicine.batchNumber || "N/A")}</td>

                    <td>${getStock(medicine)}</td>

                    <td>${getMinimumStock(medicine)}</td>

                    <td>${formatDate(medicine.expiryDate)}</td>

                    <td>
                        <span class="inventory-status ${status.className}">
                            ${status.label}
                        </span>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 7. STOCK UPDATE
    // =====================================

    stockForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const medicineId = stockMedicine.value;
        const action = document.getElementById("stockAction").value;
        const quantity = Number(
            document.getElementById("stockQuantity").value
        );
        const reason = document.getElementById("stockReason").value;
        const reference = document.getElementById("stockReference")
            .value.trim();

        if (!medicineId) {
            showMessage("Please select a medicine.");
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            showMessage("Enter a valid whole-number quantity greater than zero.");
            return;
        }

        if (!reason) {
            showMessage("Please select a transaction reason.");
            return;
        }

        const medicines = getMedicines();

        const medicineIndex = medicines.findIndex(
            medicine => medicine.id === medicineId
        );

        if (medicineIndex === -1) {
            showMessage("Selected medicine could not be found.");
            return;
        }

        const medicine = medicines[medicineIndex];
        const previousStock = getStock(medicine);

        if (action === "out" && quantity > previousStock) {
            showMessage(
                `Insufficient stock. Only ${previousStock} units are available.`
            );
            return;
        }

        const newStock = action === "in"
            ? previousStock + quantity
            : previousStock - quantity;

        const transaction = {
            id: "STK-" + Date.now() +
                "-" + Math.floor(Math.random() * 1000),

            medicineId: medicine.id,
            medicineCode: medicine.medicineCode,
            medicineName: medicine.name,

            type: action,
            quantity: quantity,

            previousStock: previousStock,
            newStock: newStock,

            reason: reason,
            reference: reference,

            updatedBy: pharmacistName,
            updatedByEmail: currentUser.email || "",

            date: new Date().toISOString()
        };

        try {
            // Update medicine quantity.
            medicines[medicineIndex] = {
                ...medicine,
                stockQuantity: newStock,
                updatedAt: new Date().toISOString()
            };

            // Save both records.
            const transactions = getTransactions();

            saveMedicines(medicines);
            saveTransactions([transaction, ...transactions]);

            showMessage("Stock updated successfully.", true);

            refreshInventory();
            populateMedicineDropdown();

            setTimeout(closeStockForm, 800);

        } catch (error) {
            console.error("Stock update failed:", error);
            showMessage("Unable to update stock. Please try again.");
        }
    });

    // =====================================
    // 8. STOCK MOVEMENT HISTORY
    // =====================================

    function displayStockHistory() {
        const transactions = getTransactions();

        const sorted = transactions
            .slice()
            .sort((a, b) =>
                new Date(b.date || 0) - new Date(a.date || 0)
            )
            .slice(0, 50);

        if (sorted.length === 0) {
            stockHistoryBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        No stock movements recorded.
                    </td>
                </tr>
            `;
            return;
        }

        stockHistoryBody.innerHTML = sorted.map(item => `
            <tr>
                <td>${escapeHTML(item.id)}</td>

                <td>${escapeHTML(item.medicineName)}</td>

                <td>
                    <span class="transaction-type ${item.type === "in" ? "in" : "out"}">
                        ${item.type === "in" ? "Stock In" : "Stock Out"}
                    </span>
                </td>

                <td>
                    ${item.type === "in" ? "+" : "-"}${Number(item.quantity)}
                </td>

                <td>${escapeHTML(item.reason)}</td>

                <td>${formatDateTime(item.date)}</td>

                <td>${escapeHTML(item.updatedBy || "N/A")}</td>
            </tr>
        `).join("");
    }

    // =====================================
    // 9. REFRESH
    // =====================================

    function refreshInventory() {
        updateStatistics();
        displayInventory();
        displayStockHistory();
    }

    // =====================================
    // 10. SEARCH AND FILTER
    // =====================================

    document.getElementById("searchInventory")
        .addEventListener("input", displayInventory);

    document.getElementById("inventoryFilter")
        .addEventListener("change", displayInventory);

    // =====================================
    // 11. BUTTON EVENTS
    // =====================================

    document.getElementById("openStockFormBtn")
        .addEventListener("click", openStockForm);

    document.getElementById("cancelStockBtn")
        .addEventListener("click", closeStockForm);

    // =====================================
    // 12. SIDEBAR
    // =====================================

    const sidebar = document.getElementById("sidebar");

    document.getElementById("menuToggle")
        .addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

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
    // 14. INITIALIZE
    // =====================================

    stockFormSection.style.display = "none";

    populateMedicineDropdown();
    refreshInventory();

});
