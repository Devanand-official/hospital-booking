
/* ==========================================
   SEMASACARE - DOCTOR MEDICAL RECORDS
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
        SemasaAuth.redirectByRole(currentUser.role);
        return;
    }

    const doctorId = String(currentUser.id ?? "");
    const doctorEmail = String(currentUser.email || "").trim().toLowerCase();

    // =====================================
    // 2. ELEMENTS
    // =====================================

    const formSection = document.getElementById("recordFormSection");
    const recordForm = document.getElementById("medicalRecordForm");
    const tableBody = document.getElementById("medicalRecordsTable");

    const patientSelect = document.getElementById("patientSelect");
    const searchInput = document.getElementById("searchRecords");
    const dateFromInput = document.getElementById("recordDateFrom");
    const dateToInput = document.getElementById("recordDateTo");

    const recordDetails = document.getElementById("recordDetails");
    const recordDetailsContent =
        document.getElementById("recordDetailsContent");

    const formMessage = document.getElementById("formMessage");

    // Medical record fields
    const diagnosisInput = document.getElementById("diagnosis");
    const symptomsInput = document.getElementById("symptoms");

    // Laboratory order elements
    const sendLabRequestBtn =
        document.getElementById("sendLabRequestBtn");

    const labPriority =
        document.getElementById("labPriority");

    const labClinicalNotes =
        document.getElementById("labClinicalNotes");

    const labRequestMessage =
        document.getElementById("labRequestMessage");

    // Patient history elements
    const patientHistorySection =
        document.getElementById("patientHistorySection");

    const patientHistoryContent =
        document.getElementById("patientHistoryContent");

    let selectedPrintRecord = null;

    let assignedPatients = [];
    let medicalRecords = [];

    document.getElementById("doctorName").textContent =
        currentUser.name || "Doctor";

    document.getElementById("headerName").textContent =
        currentUser.name || "Doctor";


    // =====================================
    // 3. STORAGE
    // =====================================

    const RECORDS_KEY = "semasacareMedicalRecords";
    const LAB_REQUESTS_KEY = "semasacareLabRequests";

    function readStorage(key) {

        try {

            const data = JSON.parse(
                localStorage.getItem(key) || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {

            console.error("Storage read error:", key, error);
            return [];
        }
    }


    function saveRecords() {

        try {

            localStorage.setItem(
                RECORDS_KEY,
                JSON.stringify(medicalRecords)
            );

            return true;

        } catch (error) {

            console.error("Unable to save medical records:", error);

            alert("Unable to save. Check browser storage.");

            return false;
        }
    }


    function getLabRequests() {
        return readStorage(LAB_REQUESTS_KEY);
    }


    function saveLabRequests(requests) {

        try {

            localStorage.setItem(
                LAB_REQUESTS_KEY,
                JSON.stringify(requests)
            );

            return true;

        } catch (error) {

            console.error(
                "Unable to save laboratory request:",
                error
            );

            return false;
        }
    }


    function generateLabRequestId() {

        const requests = getLabRequests();

        let requestId;

        do {

            requestId =
                "LAB-" +
                Date.now().toString().slice(-8) +
                Math.floor(Math.random() * 100);

        } while (
            requests.some(item =>
                String(item.requestId || item.id) === requestId
            )
        );

        return requestId;
    }


    function getLocalDateString() {

        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    // =====================================
    // 4. DOCTOR APPOINTMENTS
    // =====================================

    function getDoctorAppointments() {

        return readStorage("semasacareAppointments").filter(
            appointment => {

                const appointmentDoctorId =
                    String(appointment.doctorId ?? "");

                const appointmentDoctorEmail =
                    String(appointment.doctorEmail || "")
                        .trim()
                        .toLowerCase();

                return (
                    (doctorId &&
                        appointmentDoctorId === doctorId) ||

                    (doctorEmail &&
                        appointmentDoctorEmail === doctorEmail)
                );
            }
        );
    }


    // =====================================
    // 5. ASSIGNED PATIENTS
    // =====================================

    function loadAssignedPatients() {

        const appointments = getDoctorAppointments();

        const registeredPatients =
            readStorage("semasacarePatients");

        const patients = [];

        appointments.forEach(appointment => {

            const patientId =
                String(appointment.patientId ?? "");

            const email =
                String(appointment.patientEmail || "")
                    .trim()
                    .toLowerCase();

            const phone =
                String(
                    appointment.patientPhone ||
                    appointment.phone ||
                    ""
                ).trim();

            const name =
                String(appointment.patientName || "")
                    .trim()
                    .toLowerCase();

            let patient = registeredPatients.find(item =>
                patientId &&
                String(item.id) === patientId
            );

            if (!patient && email) {

                patient = registeredPatients.find(item =>
                    String(item.email || "")
                        .trim()
                        .toLowerCase() === email
                );
            }

            if (!patient && phone) {

                patient = registeredPatients.find(item =>
                    String(item.phone || "").trim() === phone
                );
            }

            if (!patient && name) {

                patient = registeredPatients.find(item =>
                    String(item.name || "")
                        .trim()
                        .toLowerCase() === name
                );
            }

            const patientRecord = patient || {

                id: patientId || "",

                name: appointment.patientName ||
                    "Unknown Patient",

                email: email,

                phone: phone
            };

            const uniqueKey = patientRecord.id
                ? String(patientRecord.id)
                : String(
                    patientRecord.email ||
                    patientRecord.phone ||
                    patientRecord.name
                ).toLowerCase();

            if (!patients.some(item => item._key === uniqueKey)) {

                patients.push({
                    ...patientRecord,
                    _key: uniqueKey
                });
            }

        });

        return patients;
    }


    // =====================================
    // 6. LOAD RECORDS BELONGING TO DOCTOR
    // =====================================

    function loadMedicalRecords() {

        medicalRecords = readStorage(RECORDS_KEY).filter(record => {

            return (

                (doctorId &&
                    String(record.doctorId) === doctorId) ||

                (
                    doctorEmail &&
                    String(record.doctorEmail || "")
                        .trim()
                        .toLowerCase() === doctorEmail
                )

            );
        });
    }


    // =====================================
    // 7. PATIENT DROPDOWN
    // =====================================

    function populatePatientSelect(selectedId = "") {

        patientSelect.replaceChildren();

        const defaultOption = document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent = "Select patient";

        patientSelect.appendChild(defaultOption);

        assignedPatients.forEach(patient => {

            const option = document.createElement("option");

            option.value = patient._key;

            option.textContent =
                `${patient.name} (${patient.id || patient.email || "Patient"})`;

            patientSelect.appendChild(option);
        });

        patientSelect.value = selectedId;
    }


    // =====================================
    // 8. FORM HELPERS
    // =====================================

    function resetForm() {

        recordForm.reset();

        document.getElementById("recordId").value = "";

        document.getElementById("formTitle").textContent =
            "Create Medical Record";

        document.querySelector(".medical-save-btn").innerHTML =
            '<i class="fas fa-save"></i> Save Record';

        formMessage.textContent = "";

        // Reset laboratory order fields
        document.querySelectorAll(
            'input[name="labTest"]'
        ).forEach(input => {
            input.checked = false;
        });

        if (labPriority) {
            labPriority.value = "Routine";
        }

        if (labClinicalNotes) {
            labClinicalNotes.value = "";
        }

        if (labRequestMessage) {
            labRequestMessage.textContent = "";
        }

        document.getElementById("visitDate").value =
            getLocalDateString();
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


    // =====================================
    // 9. SAVE OR UPDATE MEDICAL RECORD
    // =====================================

    recordForm.addEventListener("submit", event => {

        event.preventDefault();

        const recordId =
            document.getElementById("recordId").value;

        const selectedPatient = assignedPatients.find(
            patient => patient._key === patientSelect.value
        );

        if (!selectedPatient) {

            formMessage.textContent =
                "Please select a valid patient.";

            formMessage.style.color = "#dc2626";

            return;
        }

        const visitDate =
            document.getElementById("visitDate").value;

        const followUpDate =
            document.getElementById("followUpDate").value;

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

            symptoms: symptomsInput.value.trim(),

            diagnosis: diagnosisInput.value.trim(),

            treatment:
                document.getElementById("treatment").value.trim(),

            notes:
                document.getElementById("notes").value.trim(),

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
                record => record.id === recordId
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

        alert(
            recordId
                ? "Medical record updated successfully."
                : "Medical record saved successfully."
        );

        closeForm();

        refreshPage();
    });


    // =====================================
    // 10. SEND LABORATORY REQUEST
    // =====================================

    sendLabRequestBtn?.addEventListener("click", function () {

        if (labRequestMessage) {
            labRequestMessage.textContent = "";
            labRequestMessage.style.color = "#dc2626";
        }

        // Validate patient
        const selectedPatient = assignedPatients.find(
            patient =>
                String(patient._key) ===
                String(patientSelect.value)
        );

        if (!selectedPatient) {

            if (labRequestMessage) {
                labRequestMessage.textContent =
                    "Please select a valid patient first.";
            }

            return;
        }

        // Get selected tests
        const selectedTests = Array.from(
            document.querySelectorAll(
                'input[name="labTest"]:checked'
            )
        ).map(input => input.value);

        if (selectedTests.length === 0) {

            if (labRequestMessage) {
                labRequestMessage.textContent =
                    "Please select at least one laboratory test.";
            }

            return;
        }

        // Validate diagnosis
        const diagnosis = diagnosisInput.value.trim();

        if (!diagnosis) {

            if (labRequestMessage) {
                labRequestMessage.textContent =
                    "Please enter the diagnosis before sending the lab request.";
            }

            return;
        }

        const requests = getLabRequests();

        const requestId = generateLabRequestId();

        const currentDate = getLocalDateString();

        const currentTimestamp = new Date().toISOString();

        const symptoms = symptomsInput.value.trim();

        const additionalNotes =
            labClinicalNotes?.value.trim() || "";

        // Build laboratory request
        const labRequest = {

            id: requestId,

            requestId: requestId,

            patientId: selectedPatient.id || "",

            patientName:
                selectedPatient.name || "Unknown Patient",

            patientEmail:
                selectedPatient.email || "",

            patientPhone:
                selectedPatient.phone || "",

            doctorId: doctorId,

            doctorEmail: doctorEmail,

            doctorName: currentUser.name || "Doctor",

            tests: selectedTests,

            testName: selectedTests.join(", "),

            priority: labPriority?.value || "Routine",

            clinicalNotes: [

                "Symptoms: " +
                (symptoms || "Not specified"),

                "Diagnosis: " + diagnosis,

                "Additional notes: " +
                (additionalNotes || "None")

            ].join("\n"),

            requestDate: currentDate,

            requestedAt: currentTimestamp,

            createdAt: currentTimestamp,

            medicalRecordId:
                document.getElementById("recordId").value || "",

            status: "Awaiting Sample",

            source: "Doctor Medical Records"
        };

        try {

            requests.push(labRequest);

            if (!saveLabRequests(requests)) {

                throw new Error(
                    "Unable to save laboratory request."
                );
            }

            // Notify scripts in the same browser tab
            window.dispatchEvent(
                new CustomEvent(
                    "semasacare:labRequestsUpdated",
                    {
                        detail: {
                            requestId: requestId
                        }
                    }
                )
            );

            // Clear selected tests
            document.querySelectorAll(
                'input[name="labTest"]:checked'
            ).forEach(input => {
                input.checked = false;
            });

            if (labPriority) {
                labPriority.value = "Routine";
            }

            if (labClinicalNotes) {
                labClinicalNotes.value = "";
            }

            if (labRequestMessage) {

                labRequestMessage.style.color = "#078b8c";

                labRequestMessage.textContent =
                    `Lab request ${requestId} sent successfully.`;
            }

            alert(
                "Laboratory request sent successfully!\n" +
                "Request ID: " + requestId
            );

        } catch (error) {

            console.error(
                "Laboratory request error:",
                error
            );

            if (labRequestMessage) {

                labRequestMessage.style.color = "#dc2626";

                labRequestMessage.textContent =
                    "Unable to send the laboratory request. Please try again.";
            }
        }

    });


    // =====================================
    // 11. DISPLAY MEDICAL RECORDS
    // =====================================

    function displayRecords(searchTerm = "") {

        const search = searchTerm.trim().toLowerCase();

        const fromDate = dateFromInput.value;

        const toDate = dateToInput.value;

        const filtered = medicalRecords

            .filter(record => {

                const matchesSearch = (

                    String(record.patientName || "")
                        .toLowerCase()
                        .includes(search) ||

                    String(record.id || "")
                        .toLowerCase()
                        .includes(search) ||

                    String(record.diagnosis || "")
                        .toLowerCase()
                        .includes(search)

                );

                const visitDate =
                    String(record.visitDate || "").slice(0, 10);

                const matchesFrom =
                    !fromDate || visitDate >= fromDate;

                const matchesTo =
                    !toDate || visitDate <= toDate;

                return (
                    matchesSearch &&
                    matchesFrom &&
                    matchesTo
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
            new Set(
                medicalRecords.map(record =>
                    record.patientId ||
                    record.patientEmail ||
                    record.patientName
                )
            ).size;

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

        filtered.forEach(record => {

            const row = document.createElement("tr");

            const values = [

                record.id,

                record.patientName,

                record.visitDate,

                record.diagnosis,

                record.followUpDate || "Not scheduled"

            ];

            values.forEach(value => {

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


            const historyButton = document.createElement("button");

            historyButton.type = "button";

            historyButton.className = "medical-history-btn";

            historyButton.textContent = "History";

            historyButton.addEventListener("click", () => {
                showPatientHistory(record);
            });

            actionCell.append(
                viewButton,
                editButton,
                historyButton
            );

            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }


    // =====================================
    // 12. VIEW RECORD DETAILS
    // =====================================

    function showRecordDetails(record) {

        selectedPrintRecord = record;

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

            [
                "Follow-up Date",
                record.followUpDate || "Not scheduled"
            ]

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


    // =====================================
    // 13. PATIENT HISTORY
    // =====================================

    function isSamePatient(a, b) {

        if (a.patientId && b.patientId) {

            return String(a.patientId) ===
                String(b.patientId);
        }

        if (a.patientEmail && b.patientEmail) {

            return String(a.patientEmail).toLowerCase() ===
                String(b.patientEmail).toLowerCase();
        }

        return String(a.patientName || "")
            .trim()
            .toLowerCase() ===
            String(b.patientName || "")
                .trim()
                .toLowerCase();
    }


    function showPatientHistory(record) {

        const history = medicalRecords

            .filter(item =>
                isSamePatient(item, record)
            )

            .sort((a, b) =>
                String(b.visitDate || "").localeCompare(
                    String(a.visitDate || "")
                )
            );

        document.getElementById("patientHistoryTitle").textContent =
            `${record.patientName || "Patient"} - Consultation History`;

        document.getElementById("patientHistorySubtitle").textContent =
            `${history.length} consultation record(s)`;

        patientHistoryContent.replaceChildren();

        if (!history.length) {

            patientHistoryContent.textContent =
                "No consultation history found.";

        } else {

            const table = document.createElement("table");

            table.className = "dashboard-table";

            const thead = document.createElement("thead");

            const headRow = document.createElement("tr");

            [
                "Date",
                "Record ID",
                "Diagnosis",
                "Doctor",
                "Action"
            ].forEach(label => {

                const th = document.createElement("th");

                th.textContent = label;

                headRow.appendChild(th);
            });

            thead.appendChild(headRow);

            table.appendChild(thead);

            const tbody = document.createElement("tbody");

            history.forEach(item => {

                const tr = document.createElement("tr");

                [
                    item.visitDate || "N/A",
                    item.id || "N/A",
                    item.diagnosis || "N/A",
                    item.doctorName || "N/A"
                ].forEach(value => {

                    const td = document.createElement("td");

                    td.textContent = value;

                    tr.appendChild(td);
                });

                const action = document.createElement("td");

                const view = document.createElement("button");

                view.type = "button";

                view.className = "medical-view-btn";

                view.textContent = "View";

                view.addEventListener("click", () => {
                    showRecordDetails(item);
                });

                action.appendChild(view);

                tr.appendChild(action);

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);

            patientHistoryContent.appendChild(table);
        }

        patientHistorySection.style.display = "block";

        patientHistorySection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    // =====================================
    // 14. PRINT SELECTED RECORD
    // =====================================

    function printSelectedRecord() {

        if (!selectedPrintRecord) {

            alert("Open a medical record before printing.");

            return;
        }

        const record = selectedPrintRecord;

        const escapeHtml = value =>
            String(value ?? "N/A").replace(
                /[&<>"']/g,
                char => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;"
                })[char]
            );

        const fields = [

            ["Record ID", record.id],

            ["Patient Name", record.patientName],

            ["Patient ID", record.patientId],

            ["Consultation Date", record.visitDate],

            ["Doctor", record.doctorName],

            ["Symptoms", record.symptoms],

            ["Diagnosis", record.diagnosis],

            ["Treatment / Advice", record.treatment],

            ["Doctor's Notes", record.notes],

            [
                "Follow-up Date",
                record.followUpDate || "Not scheduled"
            ]

        ];

        const rows = fields.map(([label, value]) => `
            <section>
                <h3>${escapeHtml(label)}</h3>
                <p>${escapeHtml(value || "N/A")}</p>
            </section>
        `).join("");

        const printWindow = window.open(
            "",
            "_blank",
            "width=850,height=700"
        );

        if (!printWindow) {

            alert("Please allow pop-ups to print this record.");

            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Medical Record ${escapeHtml(record.id)}</title>

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #173f4d;
                        padding: 32px;
                        max-width: 850px;
                        margin: auto;
                    }

                    h1 {
                        border-bottom: 2px solid #078b8c;
                        padding-bottom: 12px;
                    }

                    section {
                        padding: 10px 0;
                        border-bottom: 1px solid #dbe5e8;
                    }

                    h3 {
                        font-size: 13px;
                        color: #078b8c;
                        margin: 0 0 6px;
                    }

                    p {
                        white-space: pre-wrap;
                        margin: 0;
                        line-height: 1.5;
                    }

                    .print-date {
                        color: #64748b;
                        font-size: 12px;
                        margin-bottom: 24px;
                    }

                    @media print {
                        button {
                            display: none;
                        }
                    }
                </style>
            </head>

            <body>

                <h1>SemasaCare - Medical Record</h1>

                <p class="print-date">
                    Printed on ${escapeHtml(new Date().toLocaleString())}
                </p>

                ${rows}

                <script>
                    window.onload = () => {
                        window.print();
                    };
                <\/script>

            </body>
            </html>
        `);

        printWindow.document.close();
    }


    // =====================================
    // 15. EDIT RECORD
    // =====================================

    function editRecord(record) {

        const patient = assignedPatients.find(item =>

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

            alert(
                "This patient is no longer in your assigned patient list."
            );

            return;
        }

        populatePatientSelect(patient._key);

        document.getElementById("recordId").value =
            record.id;

        document.getElementById("visitDate").value =
            record.visitDate || "";

        symptomsInput.value =
            record.symptoms || "";

        diagnosisInput.value =
            record.diagnosis || "";

        document.getElementById("treatment").value =
            record.treatment || "";

        document.getElementById("notes").value =
            record.notes || "";

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


    // =====================================
    // 16. EVENTS
    // =====================================

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


    document.getElementById("applyRecordDateFilter")
        .addEventListener("click", () => {

            if (
                dateFromInput.value &&
                dateToInput.value &&
                dateFromInput.value > dateToInput.value
            ) {

                alert(
                    "From date cannot be later than To date."
                );

                return;
            }

            displayRecords(searchInput.value);
        });


    document.getElementById("clearRecordDateFilter")
        .addEventListener("click", () => {

            dateFromInput.value = "";

            dateToInput.value = "";

            displayRecords(searchInput.value);
        });


    document.getElementById("printRecordBtn")
        .addEventListener("click", printSelectedRecord);


    document.getElementById("closePatientHistoryBtn")
        .addEventListener("click", () => {

            patientHistorySection.style.display = "none";
        });


    document.getElementById("menuToggle")
        ?.addEventListener("click", () => {

            document.getElementById("sidebar")
                ?.classList.toggle("active");
        });


    document.getElementById("logoutBtn")
        ?.addEventListener("click", () => {

            SemasaAuth.logout();
        });


    // =====================================
    // 17. REFRESH
    // =====================================

    function refreshPage() {

        assignedPatients = loadAssignedPatients();

        loadMedicalRecords();

        populatePatientSelect();

        displayRecords(searchInput.value);
    }


    // Refresh when appointments, patients or records change
    window.addEventListener("storage", event => {

        if (
            event.key === "semasacareAppointments" ||
            event.key === "semasacarePatients" ||
            event.key === RECORDS_KEY
        ) {

            refreshPage();
        }
    });


    // =====================================
    // 18. INITIALIZE
    // =====================================

    refreshPage();

});
