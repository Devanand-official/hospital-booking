
/* ==========================================
   SEMASACARE - DOCTOR PRESCRIPTIONS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

    if (currentUser.role !== "doctor") {
        window.location.href = "../login.html";
        return;
    }

    const doctorId = String(currentUser.id ?? "");
    const doctorEmail = String(currentUser.email || "")
        .trim().toLowerCase();

    const doctorNameValue = currentUser.name || "Doctor";

    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const doctorName = document.getElementById("doctorName");
    const headerName = document.getElementById("headerName");

    const formSection = document.getElementById("prescriptionFormSection");
    const prescriptionForm = document.getElementById("prescriptionForm");

    const patientSelect = document.getElementById("patientSelect");
    const prescriptionDate = document.getElementById("prescriptionDate");
    const diagnosis = document.getElementById("diagnosis");
    const generalInstructions = document.getElementById("generalInstructions");

    const prescriptionIdInput = document.getElementById("prescriptionId");
    const medicineList = document.getElementById("medicineList");

    const newPrescriptionBtn = document.getElementById("newPrescriptionBtn");
    const addMedicineBtn = document.getElementById("addMedicineBtn");
    const cancelPrescriptionBtn = document.getElementById("cancelPrescriptionBtn");

    const searchInput = document.getElementById("searchPrescriptions");
    const dateFromInput = document.getElementById("prescriptionDateFrom");
    const dateToInput = document.getElementById("prescriptionDateTo");
    const filterPrescriptionsBtn =
        document.getElementById("filterPrescriptionsBtn");
    const clearPrescriptionFiltersBtn =
        document.getElementById("clearPrescriptionFiltersBtn");
    const tableBody = document.getElementById("prescriptionsTableBody");

    const totalPrescriptions = document.getElementById("totalPrescriptions");
    const patientsPrescribed = document.getElementById("patientsPrescribed");
    const prescriptionCount = document.getElementById("prescriptionCount");

    const prescriptionDetails = document.getElementById("prescriptionDetails");
    const prescriptionDetailsContent =
        document.getElementById("prescriptionDetailsContent");

    const closeDetailsBtn = document.getElementById("closeDetailsBtn");
    const printPrescriptionBtn =
        document.getElementById("printPrescriptionBtn");

    const prescriptionMessage =
        document.getElementById("prescriptionMessage");

    let assignedPatients = [];
    let selectedPrescriptionId = null;

    // =====================================
    // 3. DISPLAY DOCTOR INFORMATION
    // =====================================

    if (doctorName) doctorName.textContent = doctorNameValue;
    if (headerName) headerName.textContent = doctorNameValue;

    // =====================================
    // 4. STORAGE FUNCTIONS
    // =====================================

    function getStorageData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Unable to read " + key, error);
            return [];
        }
    }

    function saveStorageData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getAppointments() {
        return getStorageData("semasacareAppointments");
    }

    function getPatients() {
        return getStorageData("semasacarePatients");
    }

    function getPrescriptions() {
        return getStorageData("semasacarePrescriptions");
    }

    // =====================================
    // 5. GET DOCTOR APPOINTMENTS
    // =====================================

    function getDoctorAppointments() {
        return getAppointments().filter((appointment) => {

            const appointmentDoctorId =
                String(appointment.doctorId ?? "");

            const appointmentDoctorEmail =
                String(appointment.doctorEmail || "")
                    .trim()
                    .toLowerCase();

            return (
                (doctorId && appointmentDoctorId === doctorId) ||
                (doctorEmail && appointmentDoctorEmail === doctorEmail)
            );
        });
    }

    // =====================================
    // 6. GET ASSIGNED PATIENTS
    // =====================================


    function getAssignedPatients() {
        const doctor = SemasaAuth.getCurrentUser();

        const appointments = JSON.parse(
            localStorage.getItem("semasacareAppointments") || "[]"
        );

        const registeredPatients = JSON.parse(
            localStorage.getItem("semasacarePatients") || "[]"
        );

        if (!doctor) return [];

        // Get appointments assigned to the logged-in doctor
        const doctorAppointments = appointments.filter(appointment => {
            const doctorIdMatches =
                String(appointment.doctorId || "") === String(doctor.id);

            const doctorEmailMatches =
                (appointment.doctorEmail || "").toLowerCase() ===
                (doctor.email || "").toLowerCase();

            return doctorIdMatches || doctorEmailMatches;
        });

        const patientsMap = new Map();

        doctorAppointments.forEach(appointment => {
            const email = (
                appointment.patientEmail || appointment.email || ""
            ).trim().toLowerCase();

            const phone = String(
                appointment.patientPhone || appointment.phone || ""
            ).trim();

            const patientId = appointment.patientId;

            // Find an existing registered patient
            const registeredPatient = registeredPatients.find(patient => {
                if (
                    patientId &&
                    String(patient.id) === String(patientId)
                ) {
                    return true;
                }

                const registeredEmail = (
                    patient.email || patient.patientEmail || ""
                ).trim().toLowerCase();

                const registeredPhone = String(
                    patient.phone || patient.patientPhone || ""
                ).trim();

                return (
                    (email && registeredEmail === email) ||
                    (phone && registeredPhone === phone)
                );
            });

            // Use registered patient details when available.
            // Otherwise, use the details stored in the appointment.
            const patient = registeredPatient || {
                id: patientId || `APPT-${appointment.id || email || phone}`,
                name: appointment.patientName || "Unknown Patient",
                email: email,
                phone: phone,
                age: appointment.age || "",
                gender: appointment.patientGender || appointment.gender || ""
            };

            const uniqueKey =
                patient.id ||
                email ||
                phone ||
                appointment.id;

            if (!uniqueKey) return;

            if (!patientsMap.has(uniqueKey)) {
                patientsMap.set(uniqueKey, {
                    ...patient,
                    id: patient.id || uniqueKey,
                    name: patient.name || patient.patientName ||
                        appointment.patientName || "Unknown Patient",
                    email: patient.email || patient.patientEmail || email,
                    phone: patient.phone || patient.patientPhone || phone
                });
            }
        });

        return Array.from(patientsMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }

    // =====================================
    // 7. POPULATE PATIENT DROPDOWN
    // =====================================

    function populatePatients() {

        assignedPatients = getAssignedPatients();

        patientSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select patient";

        patientSelect.appendChild(defaultOption);

        assignedPatients.forEach((patient) => {

            const option = document.createElement("option");

            option.value = String(patient.id);

            option.textContent =
                `${patient.name} (${patient.id})`;

            patientSelect.appendChild(option);
        });

        if (assignedPatients.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No assigned patients available";
            option.disabled = true;
            patientSelect.appendChild(option);
        }
    }

    // =====================================
    // 8. GENERATE PRESCRIPTION ID
    // =====================================

    function generatePrescriptionID() {

        const prescriptions = getPrescriptions();

        let id;

        do {
            id = "RX-" +
                Date.now().toString().slice(-8) +
                Math.floor(Math.random() * 100);
        } while (
            prescriptions.some((item) => item.id === id)
        );

        return id;
    }

    // =====================================
    // 9. DATE HELPERS
    // =====================================

    function getLocalDate() {

        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(date) {

        if (!date) return "N/A";

        const parts = String(date).split("-");

        if (parts.length !== 3) return date;

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // =====================================
    // 10. ADD MEDICINE ROW
    // =====================================

    function addMedicineRow(medicine = {}) {

        const row = document.createElement("div");
        row.className = "medicine-row";

        const fields = [
            {
                name: "medicineName",
                label: "Medicine Name",
                type: "text",
                placeholder: "Medicine name"
            },
            {
                name: "dosage",
                label: "Dosage",
                type: "text",
                placeholder: "e.g. 500 mg"
            },
            {
                name: "frequency",
                label: "Frequency",
                type: "select",
                options: [
                    "Once daily",
                    "Twice daily",
                    "Three times daily",
                    "Four times daily",
                    "As needed",
                    "Other"
                ]
            },
            {
                name: "duration",
                label: "Duration",
                type: "text",
                placeholder: "e.g. 5 days"
            },
            {
                name: "quantity",
                label: "Quantity",
                type: "number",
                placeholder: "e.g. 10"
            }
        ];

        fields.forEach((field) => {

            const wrapper = document.createElement("div");
            wrapper.className = "medicine-field";

            const label = document.createElement("label");
            label.textContent = field.label;

            const input = document.createElement(
                field.type === "select" ? "select" : "input"
            );

            input.dataset.field = field.name;

            if (field.type === "select") {

                const defaultOption = document.createElement("option");
                defaultOption.value = "";
                defaultOption.textContent = "Select frequency";
                input.appendChild(defaultOption);

                field.options.forEach((optionText) => {
                    const option = document.createElement("option");
                    option.value = optionText;
                    option.textContent = optionText;
                    input.appendChild(option);
                });

            } else {

                input.type = field.type;
                input.placeholder = field.placeholder;

                if (field.type === "number") {
                    input.min = "1";
                    input.step = "1";
                }
            }

            input.value = medicine[field.name] || "";

            wrapper.append(label, input);
            row.appendChild(wrapper);
        });

        const removeButton = document.createElement("button");

        removeButton.type = "button";
        removeButton.className = "remove-medicine-btn";
        removeButton.innerHTML = '<i class="fas fa-trash"></i>';
        removeButton.title = "Remove medicine";

        removeButton.addEventListener("click", () => {
            row.remove();
        });

        row.appendChild(removeButton);
        medicineList.appendChild(row);
    }

    // =====================================
    // 11. GET MEDICINES FROM FORM
    // =====================================

    function getMedicinesFromForm() {

        const rows = medicineList.querySelectorAll(".medicine-row");
        const medicines = [];

        rows.forEach((row) => {

            const medicine = {};

            row.querySelectorAll("[data-field]").forEach((input) => {
                medicine[input.dataset.field] = input.value.trim();
            });

            if (
                medicine.medicineName ||
                medicine.dosage ||
                medicine.frequency ||
                medicine.duration ||
                medicine.quantity
            ) {
                medicines.push(medicine);
            }
        });

        return medicines;
    }

    // =====================================
    // 12. SHOW FORM
    // =====================================

    function openForm() {

        prescriptionForm.reset();

        prescriptionIdInput.value = "";
        medicineList.replaceChildren();

        addMedicineRow();

        prescriptionDate.value = getLocalDate();
        prescriptionDate.max = getLocalDate();

        document.getElementById("followUpDate").value = "";

        document.getElementById("formTitle").textContent =
            "Create Prescription";

        prescriptionMessage.textContent = "";

        formSection.style.display = "block";

        prescriptionDetails.style.display = "none";

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 13. CLOSE FORM
    // =====================================

    function closeForm() {
        formSection.style.display = "none";
        prescriptionForm.reset();
        medicineList.replaceChildren();
        prescriptionMessage.textContent = "";
    }

    // =====================================
    // 14. VALIDATE FORM
    // =====================================

    function validateForm() {

        if (!patientSelect.value) {
            return "Please select a patient.";
        }

        if (!prescriptionDate.value) {
            return "Please select prescription date.";
        }

        if (!diagnosis.value.trim()) {
            return "Please enter diagnosis.";
        }

        const medicines = getMedicinesFromForm();

        if (medicines.length === 0) {
            return "Please add at least one medicine.";
        }

        for (const medicine of medicines) {

            if (
                !medicine.medicineName ||
                !medicine.dosage ||
                !medicine.frequency ||
                !medicine.duration ||
                !medicine.quantity
            ) {
                return "Please complete all medicine details.";
            }

            if (
                !Number.isInteger(Number(medicine.quantity)) ||
                Number(medicine.quantity) < 1
            ) {
                return "Medicine quantity must be a positive whole number.";
            }
        }

        return "";
    }

    // =====================================
    // 15. SAVE PRESCRIPTION
    // =====================================

    prescriptionForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const validationMessage = validateForm();

        if (validationMessage) {
            prescriptionMessage.textContent = validationMessage;
            prescriptionMessage.style.color = "#dc2626";
            return;
        }

        const patient = assignedPatients.find(
            (item) => String(item.id) === String(patientSelect.value)
        );

        if (!patient) {
            prescriptionMessage.textContent =
                "Selected patient could not be found.";

            prescriptionMessage.style.color = "#dc2626";
            return;
        }

        const prescriptions = getPrescriptions();

        const existingId = prescriptionIdInput.value;

        const existingRecord = existingId
            ? prescriptions.find(
                (item) =>
                    item.id === existingId &&
                    String(item.doctorId) === doctorId
            )
            : null;

        if (existingId && !existingRecord) {
            prescriptionMessage.textContent =
                "Prescription could not be found for editing.";

            prescriptionMessage.style.color = "#dc2626";
            return;
        }

        const prescription = {

            id: existingRecord
                ? existingRecord.id
                : generatePrescriptionID(),

            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email || "",
            patientPhone: patient.phone || "",

            doctorId: doctorId,
            doctorEmail: doctorEmail,
            doctorName: doctorNameValue,

            prescriptionDate: prescriptionDate.value,
            diagnosis: diagnosis.value.trim(),

            medicines: getMedicinesFromForm(),

            generalInstructions:
                generalInstructions.value.trim(),

            followUpDate:
                document.getElementById("followUpDate").value,

            createdAt: existingRecord
                ? existingRecord.createdAt
                : new Date().toISOString(),

            updatedAt: new Date().toISOString()
        };

        try {

            if (existingRecord) {

                const index = prescriptions.findIndex(
                    (item) => item.id === existingId
                );

                prescriptions[index] = prescription;

            } else {

                prescriptions.push(prescription);
            }

            saveStorageData("semasacarePrescriptions", prescriptions);

            alert(
                existingRecord
                    ? "Prescription updated successfully!"
                    : "Prescription saved successfully!"
            );

            closeForm();
            displayPrescriptions();

        } catch (error) {

            console.error("Unable to save prescription:", error);

            prescriptionMessage.textContent =
                "Unable to save prescription. Check browser storage.";

            prescriptionMessage.style.color = "#dc2626";
        }
    });

    // =====================================
    // 16. GET DOCTOR PRESCRIPTIONS
    // =====================================

    function getDoctorPrescriptions() {

        return getPrescriptions().filter((prescription) => {

            const savedDoctorId =
                String(prescription.doctorId ?? "");

            const savedDoctorEmail =
                String(prescription.doctorEmail || "")
                    .trim()
                    .toLowerCase();

            return (
                (doctorId && savedDoctorId === doctorId) ||
                (doctorEmail && savedDoctorEmail === doctorEmail)
            );
        });
    }

    // =====================================
    // 17. DISPLAY PRESCRIPTIONS
    // =====================================

    function displayPrescriptions(searchTerm = "") {

        const prescriptions = getDoctorPrescriptions();

        const searchText = searchTerm.trim().toLowerCase();
        const fromDate = dateFromInput ? dateFromInput.value : "";
        const toDate = dateToInput ? dateToInput.value : "";

        const filtered = prescriptions
            .filter((prescription) => {

                const prescriptionDate =
                    String(prescription.prescriptionDate || "");

                const matchesSearch = (
                    String(prescription.id || "")
                        .toLowerCase().includes(searchText) ||

                    String(prescription.patientName || "")
                        .toLowerCase().includes(searchText) ||

                    String(prescription.patientId || "")
                        .toLowerCase().includes(searchText) ||

                    String(prescription.diagnosis || "")
                        .toLowerCase().includes(searchText)
                );

                // ISO date strings (YYYY-MM-DD) can be compared directly.
                const matchesFromDate =
                    !fromDate || (prescriptionDate && prescriptionDate >= fromDate);

                const matchesToDate =
                    !toDate || (prescriptionDate && prescriptionDate <= toDate);

                return matchesSearch && matchesFromDate && matchesToDate;
            })
            .sort((a, b) =>
                String(b.prescriptionDate || "")
                    .localeCompare(String(a.prescriptionDate || ""))
            );

        totalPrescriptions.textContent = prescriptions.length;

        const uniquePatients = new Set(
            prescriptions.map((item) => String(item.patientId))
        );

        patientsPrescribed.textContent = uniquePatients.size;

        prescriptionCount.textContent =
            `Showing ${filtered.length} of ${prescriptions.length} prescription(s)`;

        tableBody.replaceChildren();

        if (filtered.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "empty-message";

            cell.textContent = prescriptions.length === 0
                ? "No prescriptions created yet."
                : "No matching prescriptions found.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        filtered.forEach((prescription) => {

            const row = document.createElement("tr");

            const values = [
                prescription.id,
                `${prescription.patientName || "Unknown"} (${prescription.patientId || "N/A"})`,
                formatDate(prescription.prescriptionDate),
                prescription.diagnosis,
                Array.isArray(prescription.medicines)
                    ? prescription.medicines.length
                    : 0
            ];

            values.forEach((value) => {

                const cell = document.createElement("td");
                cell.textContent = value || "N/A";

                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "prescription-view-btn";
            viewButton.textContent = "View";

            viewButton.addEventListener("click", () => {
                showPrescriptionDetails(prescription);
            });

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "prescription-edit-btn";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", () => {
                editPrescription(prescription);
            });

            actionCell.append(viewButton, editButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // =====================================
    // 18. CREATE DETAIL ELEMENT
    // =====================================

    function createDetailItem(label, value) {

        const item = document.createElement("div");
        item.className = "prescription-detail-item";

        const title = document.createElement("span");
        title.textContent = label;

        const content = document.createElement("strong");
        content.textContent = value || "N/A";

        item.append(title, content);

        return item;
    }

    // =====================================
    // 19. SHOW PRESCRIPTION DETAILS
    // =====================================

    function showPrescriptionDetails(prescription) {

        selectedPrescriptionId = prescription.id;

        prescriptionDetailsContent.replaceChildren();

        const grid = document.createElement("div");
        grid.className = "prescription-detail-grid";

        const details = [
            ["Prescription ID", prescription.id],
            ["Patient ID", prescription.patientId],
            ["Patient Name", prescription.patientName],
            ["Patient Email", prescription.patientEmail],
            ["Patient Phone", prescription.patientPhone],
            ["Doctor", prescription.doctorName],
            ["Prescription Date", formatDate(prescription.prescriptionDate)],
            ["Diagnosis", prescription.diagnosis],
            ["Follow-up Date", formatDate(prescription.followUpDate)]
        ];

        details.forEach(([label, value]) => {
            grid.appendChild(createDetailItem(label, value));
        });

        prescriptionDetailsContent.appendChild(grid);

        // Medicine table
        const medicineSection = document.createElement("div");
        medicineSection.className = "prescription-detail-medicines";

        const medicineHeading = document.createElement("h4");
        medicineHeading.textContent = "Prescribed Medicines";

        medicineSection.appendChild(medicineHeading);

        const tableWrapper = document.createElement("div");
        tableWrapper.className = "table-responsive";

        const table = document.createElement("table");
        table.className = "dashboard-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        [
            "Medicine",
            "Dosage",
            "Frequency",
            "Duration",
            "Quantity"
        ].forEach((heading) => {

            const th = document.createElement("th");
            th.textContent = heading;

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        (prescription.medicines || []).forEach((medicine) => {

            const row = document.createElement("tr");

            [
                medicine.medicineName,
                medicine.dosage,
                medicine.frequency,
                medicine.duration,
                medicine.quantity
            ].forEach((value) => {

                const cell = document.createElement("td");
                cell.textContent = value || "N/A";

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        medicineSection.appendChild(tableWrapper);

        prescriptionDetailsContent.appendChild(medicineSection);

        // Instructions
        const instructions = document.createElement("div");
        instructions.className = "prescription-instructions";

        const instructionHeading = document.createElement("h4");
        instructionHeading.textContent = "General Instructions";

        const instructionText = document.createElement("p");
        instructionText.textContent =
            prescription.generalInstructions || "No additional instructions.";

        instructions.append(instructionHeading, instructionText);

        prescriptionDetailsContent.appendChild(instructions);

        prescriptionDetails.style.display = "block";

        prescriptionDetails.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 20. EDIT PRESCRIPTION
    // =====================================

    function editPrescription(prescription) {

        const ownedPrescription = getDoctorPrescriptions().find(
            (item) => item.id === prescription.id
        );

        if (!ownedPrescription) {
            alert("Prescription not found.");
            return;
        }

        openForm();

        prescriptionIdInput.value = ownedPrescription.id;

        patientSelect.value = String(ownedPrescription.patientId);

        prescriptionDate.value =
            ownedPrescription.prescriptionDate || getLocalDate();

        diagnosis.value = ownedPrescription.diagnosis || "";

        generalInstructions.value =
            ownedPrescription.generalInstructions || "";

        document.getElementById("followUpDate").value =
            ownedPrescription.followUpDate || "";

        medicineList.replaceChildren();

        if (
            Array.isArray(ownedPrescription.medicines) &&
            ownedPrescription.medicines.length
        ) {
            ownedPrescription.medicines.forEach((medicine) => {
                addMedicineRow(medicine);
            });
        } else {
            addMedicineRow();
        }

        document.getElementById("formTitle").textContent =
            "Edit Prescription";

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 21. SEARCH
    // =====================================

    searchInput.addEventListener("input", () => {
        displayPrescriptions(searchInput.value);
    });

    if (filterPrescriptionsBtn) {
        filterPrescriptionsBtn.addEventListener("click", () => {
            if (
                dateFromInput.value &&
                dateToInput.value &&
                dateFromInput.value > dateToInput.value
            ) {
                alert("From Date cannot be later than To Date.");
                return;
            }

            displayPrescriptions(searchInput.value);
        });
    }

    if (clearPrescriptionFiltersBtn) {
        clearPrescriptionFiltersBtn.addEventListener("click", () => {
            dateFromInput.value = "";
            dateToInput.value = "";
            searchInput.value = "";
            displayPrescriptions();
        });
    }

    // =====================================
    // 22. BUTTON EVENTS
    // =====================================

    newPrescriptionBtn.addEventListener("click", openForm);

    addMedicineBtn.addEventListener("click", () => {
        addMedicineRow();
    });

    cancelPrescriptionBtn.addEventListener("click", closeForm);

    closeDetailsBtn.addEventListener("click", () => {
        prescriptionDetails.style.display = "none";
        selectedPrescriptionId = null;
    });

    // =====================================
    // 23. PRINT PRESCRIPTION
    // =====================================

    printPrescriptionBtn.addEventListener("click", () => {

        const prescription = getDoctorPrescriptions().find(
            (item) => item.id === selectedPrescriptionId
        );

        if (!prescription) {
            alert("Please select a prescription first.");
            return;
        }

        window.print();
    });

    // =====================================
    // 24. SIDEBAR
    // =====================================

    document.getElementById("menuToggle")
        ?.addEventListener("click", () => {

            document.getElementById("sidebar")
                ?.classList.toggle("active");
        });

    // =====================================
    // 25. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")
        ?.addEventListener("click", () => {

            localStorage.removeItem("semasacareSession");

            window.location.replace("../login.html");
        });

    // =====================================
    // 26. STORAGE REFRESH
    // =====================================

    window.addEventListener("storage", (event) => {

        if (
            event.key === "semasacareAppointments" ||
            event.key === "semasacarePatients" ||
            event.key === "semasacarePrescriptions"
        ) {
            populatePatients();
            displayPrescriptions(searchInput.value);
        }
    });

    // =====================================
    // 27. INITIALIZE
    // =====================================

    populatePatients();

    prescriptionDate.value = getLocalDate();
    prescriptionDate.max = getLocalDate();

    displayPrescriptions();

});
