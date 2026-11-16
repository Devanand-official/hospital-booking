
/* ==========================================
   SEMASACARE - DOCTOR MEDICAL RECORDS
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // 1. AUTHENTICATION

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser) {
        window.location.href = "../login.html";
        return;
    }

    if (currentUser.role !== "doctor") {
        SemasaAuth.redirectByRole(currentUser.role);
        return;
    }

    const doctorId = String(currentUser.id ?? "");
    const doctorEmail = String(currentUser.email || "").toLowerCase();

    // 2. ELEMENTS

    const formSection = document.getElementById("recordFormSection");
    const recordForm = document.getElementById("medicalRecordForm");
    const tableBody = document.getElementById("medicalRecordsTable");

    const patientSelect = document.getElementById("patientSelect");
    const searchInput = document.getElementById("searchRecords");

    const recordDetails = document.getElementById("recordDetails");
    const recordDetailsContent =
        document.getElementById("recordDetailsContent");

    const formMessage = document.getElementById("formMessage");

    let assignedPatients = [];
    let medicalRecords = [];

    document.getElementById("doctorName").textContent =
        currentUser.name || "Doctor";

    document.getElementById("headerName").textContent =
        currentUser.name || "Doctor";

    // 3. STORAGE

    const RECORDS_KEY = "semasacareMedicalRecords";

    function readStorage(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Storage read error:", key, error);
            return [];
        }
    }

    function saveRecords() {
        try {
            localStorage.setItem(RECORDS_KEY, JSON.stringify(medicalRecords));
            return true;
        } catch (error) {
            console.error("Unable to save medical records:", error);
            alert("Unable to save. Check browser storage.");
            return false;
        }
    }

    // 4. DOCTOR APPOINTMENTS

    function getDoctorAppointments() {

        return readStorage("semasacareAppointments").filter((appointment) => {

            const appointmentDoctorId =
                String(appointment.doctorId ?? "");

            const appointmentDoctorEmail =
                String(appointment.doctorEmail || "").toLowerCase();

            return (
                (doctorId && appointmentDoctorId === doctorId) ||
                (doctorEmail && appointmentDoctorEmail === doctorEmail)
            );
        });
    }

    // 5. ASSIGNED PATIENTS

    function loadAssignedPatients() {

        const appointments = getDoctorAppointments();
        const registeredPatients = readStorage("semasacarePatients");

        const patients = [];

        appointments.forEach((appointment) => {

            const patientId = String(appointment.patientId ?? "");
            const email = String(appointment.patientEmail || "")
                .trim().toLowerCase();

            const phone = String(
                appointment.patientPhone || appointment.phone || ""
            ).trim();

            const name = String(appointment.patientName || "")
                .trim().toLowerCase();

            let patient = registeredPatients.find((item) =>
                patientId && String(item.id) === patientId
            );

            if (!patient && email) {
                patient = registeredPatients.find((item) =>
                    String(item.email || "").toLowerCase() === email
                );
            }

            if (!patient && phone) {
                patient = registeredPatients.find((item) =>
                    String(item.phone || "") === phone
                );
            }

            if (!patient && name) {
                patient = registeredPatients.find((item) =>
                    String(item.name || "").trim().toLowerCase() === name
                );
            }

            const patientRecord = patient || {
                id: patientId || "",
                name: appointment.patientName || "Unknown Patient",
                email: email,
                phone: phone
            };

            const uniqueKey = patientRecord.id
                ? String(patientRecord.id)
                : String(patientRecord.email || patientRecord.phone ||
                    patientRecord.name).toLowerCase();

            if (!patients.some((item) => item._key === uniqueKey)) {
                patients.push({
                    ...patientRecord,
                    _key: uniqueKey
                });
            }
        });

        return patients;
    }

    // 6. LOAD RECORDS BELONGING TO THIS DOCTOR

    function loadMedicalRecords() {

        medicalRecords = readStorage(RECORDS_KEY).filter((record) => {

            return (
                (doctorId && String(record.doctorId) === doctorId) ||
                (
                    doctorEmail &&
                    String(record.doctorEmail || "").toLowerCase() === doctorEmail
                )
            );
        });
    }

    // 7. PATIENT DROPDOWN

    function populatePatientSelect(selectedId = "") {

        patientSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select patient";

        patientSelect.appendChild(defaultOption);

        assignedPatients.forEach((patient) => {

            const option = document.createElement("option");

            option.value = patient._key;
            option.textContent =
                `${patient.name} (${patient.id || patient.email || "Patient"})`;

            patientSelect.appendChild(option);
        });

        patientSelect.value = selectedId;
    }

    // 8. FORM HELPERS

    function resetForm() {

        recordForm.reset();

        document.getElementById("recordId").value = "";

        document.getElementById("formTitle").textContent =
            "Create Medical Record";

        document.querySelector(".medical-save-btn").innerHTML =
            '<i class="fas fa-save"></i> Save Record';

        formMessage.textContent = "";

        document.getElementById("visitDate").value =
            new Date().toLocaleDateString("en-CA");
    }

    function openForm() {

        resetForm();

        populatePatientSelect();

        formSection.style.display = "block";

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function closeForm() {
        formSection.style.display = "none";
        resetForm();
    }

    // 9. SAVE OR UPDATE RECORD

    recordForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const recordId = document.getElementById("recordId").value;
        const selectedPatient = assignedPatients.find(
            (patient) => patient._key === patientSelect.value
        );

        if (!selectedPatient) {
            formMessage.textContent = "Please select a valid patient.";
            formMessage.style.color = "#dc2626";
            return;
        }

        const visitDate = document.getElementById("visitDate").value;
        const followUpDate = document.getElementById("followUpDate").value;

        if (followUpDate && followUpDate < visitDate) {
            formMessage.textContent =
                "Follow-up date cannot be earlier than consultation date.";
            formMessage.style.color = "#dc2626";
            return;
        }

        const recordData = {

            id: recordId || `MR-${Date.now()}`,

            patientId: selectedPatient.id || "",
            patientName: selectedPatient.name,
            patientEmail: selectedPatient.email || "",

            doctorId: doctorId,
            doctorEmail: doctorEmail,
            doctorName: currentUser.name || "Doctor",

            visitDate: visitDate,

            symptoms: document.getElementById("symptoms").value.trim(),
            diagnosis: document.getElementById("diagnosis").value.trim(),
            treatment: document.getElementById("treatment").value.trim(),
            notes: document.getElementById("notes").value.trim(),

            followUpDate: followUpDate,

            updatedAt: new Date().toISOString()
        };

        if (!recordData.symptoms || !recordData.diagnosis) {
            formMessage.textContent =
                "Please complete the required fields.";
            formMessage.style.color = "#dc2626";
            return;
        }

        if (recordId) {

            const index = medicalRecords.findIndex(
                (record) => record.id === recordId
            );

            if (index === -1) {
                formMessage.textContent = "Record not found.";
                formMessage.style.color = "#dc2626";
                return;
            }

            medicalRecords[index] = {
                ...medicalRecords[index],
                ...recordData
            };

        } else {

            recordData.createdAt = new Date().toISOString();
            medicalRecords.push(recordData);
        }

        if (!saveRecords()) return;

        alert(recordId
            ? "Medical record updated successfully."
            : "Medical record saved successfully.");

        closeForm();
        refreshPage();
    });

    // 10. DISPLAY RECORDS

    function displayRecords(searchTerm = "") {

        const search = searchTerm.trim().toLowerCase();

        const filtered = medicalRecords
            .filter((record) => {

                return (
                    String(record.patientName || "").toLowerCase().includes(search) ||
                    String(record.id || "").toLowerCase().includes(search) ||
                    String(record.diagnosis || "").toLowerCase().includes(search)
                );
            })
            .sort((a, b) =>
                String(b.visitDate || "").localeCompare(
                    String(a.visitDate || "")
                )
            );

        tableBody.replaceChildren();

        document.getElementById("totalRecords").textContent =
            medicalRecords.length;

        document.getElementById("recordedPatients").textContent =
            new Set(medicalRecords.map((record) =>
                record.patientId || record.patientEmail || record.patientName
            )).size;

        document.getElementById("recordCount").textContent =
            `${filtered.length} record(s)`;

        if (!filtered.length) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "empty-message";
            cell.textContent = medicalRecords.length
                ? "No matching records found."
                : "No medical records have been created yet.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        filtered.forEach((record) => {

            const row = document.createElement("tr");

            const values = [
                record.id,
                record.patientName,
                record.visitDate,
                record.diagnosis,
                record.followUpDate || "Not scheduled"
            ];

            values.forEach((value) => {

                const cell = document.createElement("td");
                cell.textContent = value || "N/A";
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "medical-view-btn";
            viewButton.textContent = "View";

            viewButton.addEventListener("click", () => {
                showRecordDetails(record);
            });

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.className = "medical-edit-btn";
            editButton.textContent = "Edit";

            editButton.addEventListener("click", () => {
                editRecord(record);
            });

            actionCell.append(viewButton, editButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // 11. VIEW RECORD DETAILS

    function showRecordDetails(record) {

        recordDetails.style.display = "block";
        recordDetailsContent.replaceChildren();

        const fields = [
            ["Record ID", record.id],
            ["Patient Name", record.patientName],
            ["Consultation Date", record.visitDate],
            ["Doctor", record.doctorName],
            ["Symptoms", record.symptoms],
            ["Diagnosis", record.diagnosis],
            ["Treatment / Advice", record.treatment],
            ["Doctor's Notes", record.notes],
            ["Follow-up Date", record.followUpDate || "Not scheduled"]
        ];

        const grid = document.createElement("div");
        grid.className = "record-detail-grid";

        fields.forEach(([label, value]) => {

            const item = document.createElement("div");
            item.className = "record-detail-item";

            const title = document.createElement("span");
            title.textContent = label;

            const content = document.createElement("strong");
            content.textContent = value || "N/A";

            item.append(title, content);
            grid.appendChild(item);
        });

        recordDetailsContent.appendChild(grid);

        recordDetails.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // 12. EDIT RECORD

    function editRecord(record) {

        const patient = assignedPatients.find((item) =>
            String(item.id) === String(record.patientId) ||
            (
                record.patientEmail &&
                String(item.email || "").toLowerCase() ===
                String(record.patientEmail).toLowerCase()
            ) ||
            (
                !record.patientId &&
                !record.patientEmail &&
                item.name === record.patientName
            )
        );

        if (!patient) {
            alert("This patient is no longer in your assigned patient list.");
            return;
        }

        populatePatientSelect(patient._key);

        document.getElementById("recordId").value = record.id;
        document.getElementById("visitDate").value = record.visitDate || "";
        document.getElementById("symptoms").value = record.symptoms || "";
        document.getElementById("diagnosis").value = record.diagnosis || "";
        document.getElementById("treatment").value = record.treatment || "";
        document.getElementById("notes").value = record.notes || "";
        document.getElementById("followUpDate").value =
            record.followUpDate || "";

        document.getElementById("formTitle").textContent =
            "Edit Medical Record";

        document.querySelector(".medical-save-btn").innerHTML =
            '<i class="fas fa-save"></i> Update Record';

        formMessage.textContent = "";

        formSection.style.display = "block";

        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // 13. EVENTS

    document.getElementById("newRecordBtn")
        .addEventListener("click", openForm);

    document.getElementById("cancelRecordBtn")
        .addEventListener("click", closeForm);

    document.getElementById("closeDetailsBtn")
        .addEventListener("click", () => {
            recordDetails.style.display = "none";
        });

    searchInput.addEventListener("input", () => {
        displayRecords(searchInput.value);
    });

    document.getElementById("menuToggle")
        ?.addEventListener("click", () => {
            document.getElementById("sidebar")
                ?.classList.toggle("active");
        });

    document.getElementById("logoutBtn")
        ?.addEventListener("click", () => {
            localStorage.removeItem("semasacareSession");
            window.location.replace("../login.html");
        });

    // 14. REFRESH

    function refreshPage() {

        assignedPatients = loadAssignedPatients();
        loadMedicalRecords();

        populatePatientSelect();
        displayRecords(searchInput.value);
    }

    window.addEventListener("storage", (event) => {

        if (
            event.key === "semasacareAppointments" ||
            event.key === "semasacarePatients" ||
            event.key === RECORDS_KEY
        ) {
            refreshPage();
        }
    });

    // INITIALIZE
    refreshPage();
});
