
/* ==========================================
   SEMASACARE - PHARMACY PRESCRIPTION MANAGEMENT
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
    // 2. STORAGE KEYS
    // =====================================

    const PRESCRIPTION_KEY = "semasacarePrescriptions";
    const MEDICINE_KEY = "semasacareMedicines";
    const HISTORY_KEY = "semasacareDispensingHistory";

    const tableBody = document.getElementById("prescriptionsTableBody");
    const detailsSection = document.getElementById("prescriptionDetails");
    const infoContainer = document.getElementById("prescriptionInfo");
    const medicineContainer = document.getElementById("dispensingMedicineList");
    const messageBox = document.getElementById("dispenseMessage");
    const dispenseBtn = document.getElementById("dispenseBtn");

    let selectedPrescriptionId = null;

    // =====================================
    // 3. STORAGE HELPERS
    // =====================================

    function getArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value : [];
        } catch (error) {
            console.error("Storage read error:", key, error);
            return [];
        }
    }

    function saveArray(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getPrescriptions() {
        return getArray(PRESCRIPTION_KEY);
    }

    function getMedicines() {
        return getArray(MEDICINE_KEY);
    }

    function getHistory() {
        return getArray(HISTORY_KEY);
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

    function formatDate(value) {
        if (!value) return "N/A";

        const parts = String(value).split("-");

        if (parts.length !== 3) return value;

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    function getStock(medicine) {
        const value = Number(medicine.stockQuantity ?? 0);
        return Number.isFinite(value) ? value : 0;
    }

    function getLocalDate() {
        const date = new Date();

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function isExpired(medicine) {
        if (!medicine.expiryDate) return false;

        const parts = String(medicine.expiryDate).split("-");

        if (parts.length !== 3) return true;

        const [year, month, day] = parts.map(Number);

        const expiryTime = Date.UTC(year, month - 1, day);

        const expiryDate = new Date(expiryTime);

        if (
            !Number.isFinite(expiryTime) ||
            expiryDate.getUTCFullYear() !== year ||
            expiryDate.getUTCMonth() !== month - 1 ||
            expiryDate.getUTCDate() !== day
        ) {
            return true;
        }

        const today = getLocalDate().split("-").map(Number);

        const todayTime = Date.UTC(
            today[0],
            today[1] - 1,
            today[2]
        );

        return expiryTime < todayTime;
    }

    function getLineQuantity(line) {
        return Math.max(0, Number(line.quantity) || 0);
    }

    function getDispensedQuantity(line) {
        return Math.max(0, Number(line.dispensedQuantity) || 0);
    }

    function getRemainingQuantity(line) {
        return Math.max(
            0,
            getLineQuantity(line) - getDispensedQuantity(line)
        );
    }

    function getPrescriptionStatus(prescription) {
        const lines = Array.isArray(prescription.medicines)
            ? prescription.medicines
            : [];

        if (lines.length === 0) return "pending";

        const remaining = lines.reduce(
            (total, line) => total + getRemainingQuantity(line),
            0
        );

        const dispensed = lines.reduce(
            (total, line) => total + getDispensedQuantity(line),
            0
        );

        if (remaining === 0 && dispensed > 0) {
            return "dispensed";
        }

        if (dispensed > 0) {
            return "partial";
        }

        return "pending";
    }

    function getStatusLabel(status) {
        const labels = {
            pending: "Pending",
            partial: "Partially Dispensed",
            dispensed: "Dispensed"
        };

        return labels[status] || "Pending";
    }

    function showMessage(message, success = false) {
        messageBox.textContent = message;
        messageBox.style.color = success ? "#15803d" : "#dc2626";
    }

    // =====================================
    // 5. STATISTICS
    // =====================================

    function updateStatistics() {
        const prescriptions = getPrescriptions();

        const pending = prescriptions.filter(
            item => getPrescriptionStatus(item) === "pending"
        ).length;

        const partial = prescriptions.filter(
            item => getPrescriptionStatus(item) === "partial"
        ).length;

        const dispensed = prescriptions.filter(
            item => getPrescriptionStatus(item) === "dispensed"
        ).length;

        document.getElementById("totalRx").textContent =
            prescriptions.length;

        document.getElementById("pendingRx").textContent = pending;
        document.getElementById("partialRx").textContent = partial;
        document.getElementById("dispensedRx").textContent = dispensed;
    }

    // =====================================
    // 6. DISPLAY PRESCRIPTIONS
    // =====================================

    function displayPrescriptions() {
        const prescriptions = getPrescriptions();

        const searchText = document.getElementById("searchPrescriptions")
            .value.trim().toLowerCase();

        const statusFilter = document.getElementById("statusFilter").value;

        const filtered = prescriptions
            .filter(prescription => {

                const searchContent = [
                    prescription.id,
                    prescription.patientName,
                    prescription.patientId,
                    prescription.doctorName,
                    prescription.diagnosis
                ].join(" ").toLowerCase();

                const matchesSearch = searchContent.includes(searchText);

                const status = getPrescriptionStatus(prescription);

                const matchesStatus =
                    statusFilter === "all" || status === statusFilter;

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) =>
                String(b.prescriptionDate || "")
                    .localeCompare(String(a.prescriptionDate || ""))
            );

        document.getElementById("prescriptionCount").textContent =
            `Showing ${filtered.length} of ${prescriptions.length} prescriptions`;

        tableBody.replaceChildren();

        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        No prescriptions found.
                    </td>
                </tr>
            `;
        } else {
            filtered.forEach(prescription => {
                const row = document.createElement("tr");

                const values = [
                    prescription.id,
                    `${prescription.patientName || "Unknown"} (${prescription.patientId || "N/A"})`,
                    prescription.doctorName || "N/A",
                    formatDate(prescription.prescriptionDate),
                    Array.isArray(prescription.medicines)
                        ? prescription.medicines.length
                        : 0
                ];

                values.forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                const statusCell = document.createElement("td");
                const status = getPrescriptionStatus(prescription);

                const badge = document.createElement("span");
                badge.className = `rx-status ${status}`;
                badge.textContent = getStatusLabel(status);

                statusCell.appendChild(badge);
                row.appendChild(statusCell);

                const actionCell = document.createElement("td");

                const viewButton = document.createElement("button");
                viewButton.type = "button";
                viewButton.className = "rx-view-btn";
                viewButton.textContent = "View";

                viewButton.addEventListener("click", () => {
                    showPrescriptionDetails(prescription.id);
                });

                actionCell.appendChild(viewButton);
                row.appendChild(actionCell);

                tableBody.appendChild(row);
            });
        }

        updateStatistics();
    }

    // =====================================
    // 7. DISPLAY PRESCRIPTION INFORMATION
    // =====================================

    function addInfoItem(label, value) {
        const item = document.createElement("div");
        item.className = "rx-info-item";

        const title = document.createElement("span");
        title.textContent = label;

        const content = document.createElement("strong");
        content.textContent = value || "N/A";

        item.append(title, content);
        infoContainer.appendChild(item);
    }

    // =====================================
    // 8. INVENTORY DROPDOWN
    // =====================================

    function getEligibleMedicines() {
        return getMedicines()
            .filter(medicine =>
                medicine.id &&
                medicine.name &&
                !isExpired(medicine)
            )
            .sort((a, b) =>
                String(a.name).localeCompare(String(b.name))
            );
    }

    function populateInventorySelect(select, prescribedName) {
        const medicines = getEligibleMedicines();

        select.innerHTML =
            '<option value="">Select inventory medicine</option>';

        medicines.forEach(medicine => {
            const option = document.createElement("option");

            option.value = String(medicine.id);

            option.textContent =
                `${medicine.name} | ${medicine.strength || "Strength N/A"} | Stock: ${getStock(medicine)}`;

            // Preselect only an exact name match.
            if (
                String(medicine.name).trim().toLowerCase() ===
                String(prescribedName).trim().toLowerCase()
            ) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    }

    // =====================================
    // 9. DISPLAY MEDICINE DISPENSING ROWS
    // =====================================

    function displayMedicineRows(prescription) {
        medicineContainer.replaceChildren();

        const medicines = Array.isArray(prescription.medicines)
            ? prescription.medicines
            : [];

        const inventory = getMedicines();

        medicines.forEach((line, index) => {

            const row = document.createElement("div");
            row.className = "rx-dispense-row";

            const remaining = getRemainingQuantity(line);
            const dispensed = getDispensedQuantity(line);

            // Prescribed medicine information
            const prescribedInfo = document.createElement("div");
            prescribedInfo.className = "rx-prescribed-info";

            const name = document.createElement("strong");
            name.textContent = line.medicineName || "Unnamed Medicine";

            const details = document.createElement("span");
            details.textContent =
                `Dosage: ${line.dosage || "N/A"} | ${line.frequency || "N/A"} | ${line.duration || "N/A"}`;

            const quantity = document.createElement("span");
            quantity.textContent =
                `Prescribed: ${getLineQuantity(line)} | Dispensed: ${dispensed} | Remaining: ${remaining}`;

            prescribedInfo.append(name, details, quantity);

            const selectionWrapper = document.createElement("div");

            const selectionLabel = document.createElement("label");
            selectionLabel.textContent = "Inventory Medicine";

            const select = document.createElement("select");
            select.dataset.lineIndex = index;

            populateInventorySelect(select, line.medicineName);

            const stockNote = document.createElement("div");
            stockNote.className = "rx-stock-note";
            stockNote.textContent = "Select a medicine to see available stock.";

            select.addEventListener("change", () => {
                updateStockNote(select, stockNote);
            });

            selectionWrapper.append(selectionLabel, select, stockNote);

            // Quantity input
            const quantityWrapper = document.createElement("div");

            const quantityLabel = document.createElement("label");
            quantityLabel.textContent = "Dispense Quantity";

            const quantityInput = document.createElement("input");
            quantityInput.type = "number";
            quantityInput.min = "0";
            quantityInput.step = "1";
            quantityInput.max = String(remaining);
            quantityInput.value = String(remaining);
            quantityInput.dataset.lineIndex = index;
            quantityInput.disabled = remaining === 0;

            quantityWrapper.append(quantityLabel, quantityInput);

            // Line status
            const statusWrapper = document.createElement("div");

            const statusLabel = document.createElement("label");
            statusLabel.textContent = "Dispensing Status";

            const status = document.createElement("div");
            status.className = "rx-line-status";

            if (remaining === 0) {
                status.classList.add("done");
                status.textContent = "Fully dispensed";
            } else if (dispensed > 0) {
                status.classList.add("remaining");
                status.textContent = "Partially dispensed";
            } else {
                status.classList.add("remaining");
                status.textContent = "Pending";
            }

            statusWrapper.append(statusLabel, status);

            row.append(
                prescribedInfo,
                selectionWrapper,
                quantityWrapper,
                statusWrapper
            );

            medicineContainer.appendChild(row);

            // Update stock note for exact preselected medicine.
            if (select.value) {
                updateStockNote(select, stockNote);
            }
        });

        if (medicines.length === 0) {
            medicineContainer.textContent =
                "This prescription has no medicine entries.";
        }

        const allCompleted = medicines.length > 0 &&
            medicines.every(line => getRemainingQuantity(line) === 0);

        dispenseBtn.disabled = allCompleted;
        dispenseBtn.style.display = allCompleted ? "none" : "inline-block";
    }

    function updateStockNote(select, note) {
        const selected = getMedicines().find(
            medicine => String(medicine.id) === String(select.value)
        );

        note.className = "rx-stock-note";

        if (!selected) {
            note.textContent = "Select a medicine to see available stock.";
            return;
        }

        if (isExpired(selected)) {
            note.textContent = "This medicine has expired.";
            note.classList.add("insufficient");
            return;
        }

        note.textContent = `Available stock: ${getStock(selected)}`;

        if (getStock(selected) <= 0) {
            note.textContent += " - Out of stock";
            note.classList.add("insufficient");
        }
    }

    // =====================================
    // 10. OPEN PRESCRIPTION
    // =====================================

    function showPrescriptionDetails(prescriptionId) {
        const prescription = getPrescriptions().find(
            item => String(item.id) === String(prescriptionId)
        );

        if (!prescription) {
            alert("Prescription not found.");
            return;
        }

        selectedPrescriptionId = prescription.id;

        document.getElementById("selectedPrescriptionLabel").textContent =
            prescription.id;

        infoContainer.replaceChildren();

        addInfoItem("Prescription ID", prescription.id);
        addInfoItem("Patient Name", prescription.patientName);
        addInfoItem("Patient ID", prescription.patientId);
        addInfoItem("Doctor", prescription.doctorName);
        addInfoItem("Prescription Date", formatDate(prescription.prescriptionDate));
        addInfoItem("Diagnosis", prescription.diagnosis);
        addInfoItem("Follow-up Date", formatDate(prescription.followUpDate));
        addInfoItem(
            "Instructions",
            prescription.generalInstructions || "No additional instructions"
        );

        displayMedicineRows(prescription);

        messageBox.textContent = "";

        detailsSection.style.display = "block";

        detailsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 11. DISPENSE PRESCRIPTION
    // =====================================

    dispenseBtn.addEventListener("click", function () {

        if (!selectedPrescriptionId) {
            showMessage("Please select a prescription.");
            return;
        }

        const prescriptions = getPrescriptions();

        const prescriptionIndex = prescriptions.findIndex(
            item => String(item.id) === String(selectedPrescriptionId)
        );

        if (prescriptionIndex === -1) {
            showMessage("Prescription could not be found.");
            return;
        }

        const prescription = prescriptions[prescriptionIndex];

        if (!Array.isArray(prescription.medicines)) {
            showMessage("Prescription has no valid medicine list.");
            return;
        }

        const selects = [
            ...medicineContainer.querySelectorAll("select[data-line-index]")
        ];

        const inputs = [
            ...medicineContainer.querySelectorAll("input[data-line-index]")
        ];

        const medicineUpdates = getMedicines();
        const plannedLines = [];
        const totalByMedicine = new Map();

        // Validate each medicine line before changing stock.
        for (let index = 0; index < prescription.medicines.length; index++) {

            const line = prescription.medicines[index];
            const remaining = getRemainingQuantity(line);

            const input = inputs.find(
                item => Number(item.dataset.lineIndex) === index
            );

            const select = selects.find(
                item => Number(item.dataset.lineIndex) === index
            );

            if (!input || !select) {
                showMessage("Unable to read medicine dispensing details.");
                return;
            }

            const quantity = Number(input.value);

            if (remaining === 0) {
                continue;
            }

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0 ||
                quantity > remaining
            ) {
                showMessage(
                    `Enter a valid quantity for ${line.medicineName}. Maximum remaining quantity: ${remaining}.`
                );
                return;
            }

            if (!select.value) {
                showMessage(
                    `Please select an inventory medicine for ${line.medicineName}.`
                );
                return;
            }

            const inventoryIndex = medicineUpdates.findIndex(
                medicine => String(medicine.id) === String(select.value)
            );

            if (inventoryIndex === -1) {
                showMessage("Selected inventory medicine was not found.");
                return;
            }

            const inventoryMedicine = medicineUpdates[inventoryIndex];

            if (isExpired(inventoryMedicine)) {
                showMessage(
                    `${inventoryMedicine.name} has expired and cannot be dispensed.`
                );
                return;
            }

            totalByMedicine.set(
                String(inventoryMedicine.id),
                (totalByMedicine.get(String(inventoryMedicine.id)) || 0) + quantity
            );

            plannedLines.push({
                lineIndex: index,
                inventoryIndex: inventoryIndex,
                medicine: inventoryMedicine,
                quantity: quantity
            });
        }

        if (plannedLines.length === 0) {
            showMessage("There are no remaining quantities to dispense.");
            return;
        }

        // Check combined stock when multiple prescription lines
        // use the same inventory medicine.
        for (const [medicineId, requiredQuantity] of totalByMedicine) {
            const medicine = medicineUpdates.find(
                item => String(item.id) === medicineId
            );

            if (getStock(medicine) < requiredQuantity) {
                showMessage(
                    `Insufficient stock for ${medicine.name}. Available: ${getStock(medicine)}, required: ${requiredQuantity}.`
                );
                return;
            }
        }

        if (!confirm("Confirm dispensing the selected medicine quantities?")) {
            return;
        }

        try {
            const now = new Date().toISOString();
            const transactions = getHistory();

            const newHistoryRecords = [];

            // Deduct stock and update prescription lines.
            plannedLines.forEach(item => {

                const medicine = medicineUpdates[item.inventoryIndex];

                const previousStock = getStock(medicine);
                const newStock = previousStock - item.quantity;

                medicineUpdates[item.inventoryIndex] = {
                    ...medicine,
                    stockQuantity: newStock,
                    updatedAt: now
                };

                const prescriptionLine =
                    prescription.medicines[item.lineIndex];

                prescriptionLine.dispensedQuantity =
                    getDispensedQuantity(prescriptionLine) + item.quantity;

                prescriptionLine.inventoryMedicineId = medicine.id;
                prescriptionLine.inventoryMedicineName = medicine.name;

                newHistoryRecords.push({
                    id: "DSP-" + Date.now() + "-" +
                        Math.floor(Math.random() * 100000),

                    prescriptionId: prescription.id,
                    patientId: prescription.patientId,
                    patientName: prescription.patientName,

                    medicineId: medicine.id,
                    medicineName: medicine.name,

                    prescribedMedicineName:
                        prescriptionLine.medicineName,

                    quantity: item.quantity,
                    previousStock: previousStock,
                    newStock: newStock,

                    dispensedBy: pharmacistName,
                    dispensedByEmail: currentUser.email || "",

                    date: now
                });
            });

            prescription.status = getPrescriptionStatus(prescription);
            prescription.lastDispensedAt = now;
            prescription.lastDispensedBy = pharmacistName;

            // Persist updated data.
            saveArray(MEDICINE_KEY, medicineUpdates);
            saveArray(PRESCRIPTION_KEY, prescriptions);
            saveArray(HISTORY_KEY, [
                ...newHistoryRecords,
                ...transactions
            ]);

            showMessage("Medicine dispensed successfully!", true);

            displayPrescriptions();

            // Reload the latest saved prescription details.
            showPrescriptionDetails(selectedPrescriptionId);

        } catch (error) {
            console.error("Dispensing error:", error);
            showMessage(
                "Unable to complete dispensing. Please check browser storage."
            );
        }
    });

    // =====================================
    // 12. SEARCH AND FILTER
    // =====================================

    document.getElementById("searchPrescriptions")
        .addEventListener("input", displayPrescriptions);

    document.getElementById("statusFilter")
        .addEventListener("change", displayPrescriptions);

    // =====================================
    // 13. CLOSE DETAILS
    // =====================================

    document.getElementById("closeDetailsBtn")
        .addEventListener("click", function () {
            detailsSection.style.display = "none";
            selectedPrescriptionId = null;
            messageBox.textContent = "";
        });

    // =====================================
    // 14. SIDEBAR
    // =====================================

    document.getElementById("menuToggle")
        .addEventListener("click", function () {
            document.getElementById("sidebar")
                .classList.toggle("active");
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
    // 16. STORAGE REFRESH
    // =====================================

    window.addEventListener("storage", function (event) {
        if (
            event.key === PRESCRIPTION_KEY ||
            event.key === MEDICINE_KEY
        ) {
            displayPrescriptions();

            if (selectedPrescriptionId) {
                showPrescriptionDetails(selectedPrescriptionId);
            }
        }
    });

    // =====================================
    // 17. INITIALIZE
    // =====================================

    detailsSection.style.display = "none";

    displayPrescriptions();

});
