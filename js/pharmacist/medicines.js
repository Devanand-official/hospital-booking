
/* ==========================================
   SEMASACARE - MEDICINE MANAGEMENT
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

    document.getElementById("pharmacistName").textContent =
        pharmacistName;

    document.getElementById("headerName").textContent =
        pharmacistName;

    // =====================================
    // 2. ELEMENTS
    // =====================================

    const medicineFormSection =
        document.getElementById("medicineFormSection");

    const medicineForm =
        document.getElementById("medicineForm");

    const medicineTableBody =
        document.getElementById("medicineTableBody");

    const searchInput =
        document.getElementById("searchMedicines");

    const stockFilter =
        document.getElementById("stockFilter");

    const medicineMessage =
        document.getElementById("medicineMessage");

    // =====================================
    // 3. STORAGE
    // =====================================

    const STORAGE_KEY = "semasacareMedicines";

    function getMedicines() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to read medicines:", error);
            return [];
        }
    }

    function saveMedicines(medicines) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(medicines)
        );
    }

    // =====================================
    // 4. HELPERS
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

    function getMedicineStatus(medicine) {

        const stock = Number(medicine.stockQuantity || 0);
        const minimum = Number(medicine.reorderLevel || 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiry = new Date(medicine.expiryDate);
        expiry.setHours(0, 0, 0, 0);

        if (!Number.isNaN(expiry.getTime()) && expiry < today) {
            return {
                label: "Expired",
                className: "expired"
            };
        }

        if (stock <= 0) {
            return {
                label: "Out of Stock",
                className: "out"
            };
        }

        if (stock <= minimum) {
            return {
                label: "Low Stock",
                className: "low"
            };
        }

        return {
            label: "Available",
            className: "available"
        };
    }

    function formatDate(dateValue) {
        if (!dateValue) return "N/A";

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-IN");
    }

    function generateMedicineId() {
        return "MED-" + Date.now() +
            "-" + Math.floor(Math.random() * 1000);
    }

    function getValue(id) {
        return document.getElementById(id).value.trim();
    }

    function showMessage(message, success = false) {
        medicineMessage.textContent = message;
        medicineMessage.style.color =
            success ? "#15803d" : "#dc2626";
    }

    // =====================================
    // 5. FORM RESET
    // =====================================

    function resetMedicineForm() {

        medicineForm.reset();

        document.getElementById("medicineId").value = "";

        document.getElementById("reorderLevel").value = 10;

        document.getElementById("medicineFormTitle").textContent =
            "Add New Medicine";

        medicineMessage.textContent = "";
    }

    function hideMedicineForm() {
        medicineFormSection.style.display = "none";
        resetMedicineForm();
    }

    function showMedicineForm() {
        medicineFormSection.style.display = "block";

        medicineFormSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 6. STATISTICS
    // =====================================

    function updateStatistics() {

        const medicines = getMedicines();

        const totalStock = medicines.reduce(
            (total, medicine) =>
                total + Number(medicine.stockQuantity || 0),
            0
        );

        const lowStock = medicines.filter(medicine => {
            const status = getMedicineStatus(medicine);
            return status.className === "low" ||
                status.className === "out";
        });

        document.getElementById("totalMedicines").textContent =
            medicines.length;

        document.getElementById("totalStock").textContent =
            totalStock.toLocaleString("en-IN");

        document.getElementById("lowStockCount").textContent =
            lowStock.length;
    }

    // =====================================
    // 7. DISPLAY MEDICINES
    // =====================================

    function displayMedicines() {

        const medicines = getMedicines();

        const searchText = searchInput.value.trim().toLowerCase();

        const filterValue = stockFilter.value;

        const filteredMedicines = medicines.filter(medicine => {

            const searchableText = [
                medicine.medicineCode,
                medicine.name,
                medicine.genericName,
                medicine.manufacturer,
                medicine.strength,
                medicine.batchNumber
            ].join(" ").toLowerCase();

            const matchesSearch =
                searchableText.includes(searchText);

            const status = getMedicineStatus(medicine);

            let matchesFilter = true;

            if (filterValue === "available") {
                matchesFilter = status.className === "available";
            } else if (filterValue === "low") {
                matchesFilter = status.className === "low";
            } else if (filterValue === "out") {
                matchesFilter = status.className === "out";
            }

            return matchesSearch && matchesFilter;
        });

        filteredMedicines.sort((a, b) =>
            String(a.name).localeCompare(String(b.name))
        );

        document.getElementById("medicineCount").textContent =
            `Showing ${filteredMedicines.length} of ${medicines.length} medicines`;

        if (filteredMedicines.length === 0) {

            medicineTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-message">
                        No medicines found.
                    </td>
                </tr>
            `;

            return;
        }

        medicineTableBody.innerHTML =
            filteredMedicines.map(medicine => {

                const status = getMedicineStatus(medicine);

                return `
                    <tr>

                        <td>
                            ${escapeHTML(medicine.medicineCode)}
                        </td>

                        <td class="medicine-name-cell">
                            <strong>${escapeHTML(medicine.name)}</strong>
                            <span>${escapeHTML(medicine.genericName || "N/A")}</span>
                        </td>

                        <td>${escapeHTML(medicine.strength)}</td>

                        <td>${escapeHTML(medicine.dosageForm)}</td>

                        <td>${Number(medicine.stockQuantity || 0)}</td>

                        <td>${formatDate(medicine.expiryDate)}</td>

                        <td>₹${Number(medicine.unitPrice || 0).toFixed(2)}</td>

                        <td>
                            <span class="medicine-status ${status.className}">
                                ${status.label}
                            </span>
                        </td>

                        <td>
                            <button type="button"
                                class="medicine-action-btn medicine-edit-btn"
                                data-action="edit"
                                data-id="${escapeHTML(medicine.id)}"
                                title="Edit medicine">
                                <i class="fas fa-pen"></i>
                            </button>

                            <button type="button"
                                class="medicine-action-btn medicine-delete-btn"
                                data-action="delete"
                                data-id="${escapeHTML(medicine.id)}"
                                title="Delete medicine">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>

                    </tr>
                `;
            }).join("");
    }

    // =====================================
    // 8. ADD / UPDATE MEDICINE
    // =====================================

    medicineForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const medicines = getMedicines();

        const medicineId = getValue("medicineId");
        const medicineCode = getValue("medicineCode").toUpperCase();

        const stockQuantity =
            Number(getValue("stockQuantity"));

        const reorderLevel =
            Number(getValue("reorderLevel"));

        const unitPrice =
            Number(getValue("unitPrice"));

        if (
            stockQuantity < 0 ||
            reorderLevel < 0 ||
            unitPrice < 0
        ) {
            showMessage("Stock, minimum level and price cannot be negative.");
            return;
        }

        const duplicateCode = medicines.find(medicine =>
            String(medicine.medicineCode).toUpperCase() === medicineCode &&
            medicine.id !== medicineId
        );

        if (duplicateCode) {
            showMessage("This medicine code already exists.");
            return;
        }

        const expiryDate = getValue("expiryDate");

        if (!expiryDate) {
            showMessage("Please select an expiry date.");
            return;
        }

        const medicineData = {

            id: medicineId || generateMedicineId(),

            medicineCode: medicineCode,

            name: getValue("medicineName"),

            genericName: getValue("genericName"),

            strength: getValue("strength"),

            dosageForm: getValue("dosageForm"),

            manufacturer: getValue("manufacturer"),

            batchNumber: getValue("batchNumber"),

            expiryDate: expiryDate,

            stockQuantity: stockQuantity,

            reorderLevel: reorderLevel,

            unitPrice: unitPrice,

            description: getValue("medicineDescription"),

            updatedAt: new Date().toISOString()
        };

        if (medicineId) {

            const index = medicines.findIndex(
                medicine => medicine.id === medicineId
            );

            if (index === -1) {
                showMessage("Medicine record not found.");
                return;
            }

            // Preserve original creation date.
            medicineData.createdAt =
                medicines[index].createdAt || new Date().toISOString();

            medicines[index] = {
                ...medicines[index],
                ...medicineData
            };

        } else {

            medicineData.createdAt = new Date().toISOString();

            medicines.push(medicineData);
        }

        try {

            saveMedicines(medicines);

            showMessage(
                medicineId
                    ? "Medicine updated successfully."
                    : "Medicine added successfully.",
                true
            );

            updateStatistics();
            displayMedicines();

            setTimeout(() => {
                hideMedicineForm();
            }, 700);

        } catch (error) {

            console.error("Unable to save medicine:", error);

            showMessage("Unable to save medicine. Please try again.");
        }
    });

    // =====================================
    // 9. EDIT MEDICINE
    // =====================================

    function editMedicine(id) {

        const medicines = getMedicines();

        const medicine = medicines.find(
            item => item.id === id
        );

        if (!medicine) {
            alert("Medicine record not found.");
            return;
        }

        document.getElementById("medicineId").value =
            medicine.id;

        document.getElementById("medicineCode").value =
            medicine.medicineCode || "";

        document.getElementById("medicineName").value =
            medicine.name || "";

        document.getElementById("genericName").value =
            medicine.genericName || "";

        document.getElementById("strength").value =
            medicine.strength || "";

        document.getElementById("dosageForm").value =
            medicine.dosageForm || "";

        document.getElementById("manufacturer").value =
            medicine.manufacturer || "";

        document.getElementById("batchNumber").value =
            medicine.batchNumber || "";

        document.getElementById("expiryDate").value =
            medicine.expiryDate || "";

        document.getElementById("stockQuantity").value =
            medicine.stockQuantity ?? 0;

        document.getElementById("reorderLevel").value =
            medicine.reorderLevel ?? 10;

        document.getElementById("unitPrice").value =
            medicine.unitPrice ?? 0;

        document.getElementById("medicineDescription").value =
            medicine.description || "";

        document.getElementById("medicineFormTitle").textContent =
            "Edit Medicine";

        showMessage("");

        showMedicineForm();
    }

    // =====================================
    // 10. DELETE MEDICINE
    // =====================================

    function deleteMedicine(id) {

        const medicines = getMedicines();

        const medicine = medicines.find(
            item => item.id === id
        );

        if (!medicine) return;

        const confirmed = confirm(
            `Are you sure you want to delete ${medicine.name}?`
        );

        if (!confirmed) return;

        const updatedMedicines = medicines.filter(
            item => item.id !== id
        );

        try {

            saveMedicines(updatedMedicines);

            updateStatistics();
            displayMedicines();

        } catch (error) {

            console.error("Unable to delete medicine:", error);

            alert("Unable to delete medicine.");
        }
    }

    // =====================================
    // 11. TABLE ACTION EVENTS
    // =====================================

    medicineTableBody.addEventListener("click", function (event) {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        if (action === "edit") {
            editMedicine(id);
        }

        if (action === "delete") {
            deleteMedicine(id);
        }
    });

    // =====================================
    // 12. SEARCH AND FILTER
    // =====================================

    searchInput.addEventListener("input", displayMedicines);

    stockFilter.addEventListener("change", displayMedicines);

    // =====================================
    // 13. BUTTON EVENTS
    // =====================================

    document.getElementById("addMedicineBtn")
        .addEventListener("click", function () {

            resetMedicineForm();

            showMedicineForm();
        });

    document.getElementById("cancelMedicineBtn")
        .addEventListener("click", hideMedicineForm);

    // =====================================
    // 14. SIDEBAR
    // =====================================

    const sidebar = document.getElementById("sidebar");

    document.getElementById("menuToggle")
        .addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

    // =====================================
    // 15. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {

            if (confirm("Are you sure you want to logout?")) {
                SemasaAuth.logout();
                window.location.href = "../login.html";
            }
        });

    // =====================================
    // 16. INITIALIZE
    // =====================================

    updateStatistics();
    displayMedicines();

});
