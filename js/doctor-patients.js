
/* ==========================================
   SemasaCare - Doctor My Patients
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

    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const doctorName = document.getElementById("doctorName");
    const headerName = document.getElementById("headerName");

    const tableBody = document.getElementById("patientsTableBody");
    const searchInput = document.getElementById("searchPatient");

    const totalPatients = document.getElementById("totalPatients");
    const totalAppointments = document.getElementById("totalAppointments");

    const recordsCount = document.getElementById("recordsCount");

    const patientDetails = document.getElementById("patientDetails");
    const patientDetailsContent =
        document.getElementById("patientDetailsContent");

    const closeDetails = document.getElementById("closeDetails");

    // =====================================
    // 3. DOCTOR INFORMATION
    // =====================================

    const name = currentUser.name || "Doctor";

    doctorName.textContent = name;
    headerName.textContent = name;

    // =====================================
    // 4. STORAGE FUNCTIONS
    // =====================================

    function getStorageData(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Unable to load " + key, error);
            return [];
        }
    }

    function getAppointments() {
        return getStorageData("semasacareAppointments");
    }

    function getPatients() {
        return getStorageData("semasacarePatients");
    }

    // =====================================
    // 5. GET DOCTOR'S APPOINTMENTS
    // =====================================

    function getDoctorAppointments() {

        const appointments = getAppointments();

        const doctorId = String(currentUser.id ?? "");

        const doctorEmail = String(currentUser.email || "")
            .trim()
            .toLowerCase();

        return appointments.filter((appointment) => {

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

        const appointments = getDoctorAppointments();
        const registeredPatients = getPatients();
        const patientMap = new Map();

        appointments.forEach((appointment) => {
            const patientId = String(appointment.patientId || "").trim();
            const patientEmail = String(
                appointment.patientEmail || appointment.email || ""
            ).trim().toLowerCase();
            const patientPhone = String(
                appointment.patientPhone || appointment.phone || ""
            ).trim();
            const appointmentPatientName = String(
                appointment.patientName || "Unknown Patient"
            ).trim();

            // Use the permanent ID first; use email/phone only for older records.
            let patient = patientId
                ? registeredPatients.find((item) => String(item.id) === patientId)
                : null;

            if (!patient && patientEmail) {
                patient = registeredPatients.find((item) =>
                    String(item.email || "").trim().toLowerCase() === patientEmail
                );
            }

            if (!patient && patientPhone) {
                patient = registeredPatients.find((item) =>
                    String(item.phone || "").trim() === patientPhone &&
                    String(item.name || "").trim().toLowerCase() === appointmentPatientName.toLowerCase()
                );
            }

            // Stable fallback keys let older appointments group by email/phone.
            // If neither exists, keep the appointment separate rather than merging
            // unrelated people under a shared "N/A" ID.
            const uniqueKey = patient
                ? String(patient.id)
                : patientId
                    ? patientId
                    : patientEmail
                        ? "EMAIL:" + patientEmail
                        : patientPhone
                            ? "PHONE:" + patientPhone + "|NAME:" + appointmentPatientName.toLowerCase()
                            : "APPOINTMENT:" + String(appointment.id || Math.random());

            if (!patientMap.has(uniqueKey)) {
                patientMap.set(uniqueKey, {
                    id: patient?.id || patientId || "N/A",
                    name: patient?.name || appointmentPatientName,
                    email: patient?.email || patientEmail || "N/A",
                    phone: patient?.phone || patientPhone || "N/A",
                    gender: patient?.gender || appointment.patientGender || appointment.gender || "N/A",
                    dob: patient?.dob || "",
                    bloodGroup: patient?.bloodGroup || "N/A",
                    address: patient?.address || "N/A",
                    emergencyContact: patient?.emergencyContact || "N/A",
                    appointmentCount: 0,
                    appointments: []
                });
            }

            const patientRecord = patientMap.get(uniqueKey);
            patientRecord.appointmentCount += 1;
            patientRecord.appointments.push(appointment);
        });

        return Array.from(patientMap.values());
    }

    // =====================================
    // 7. DISPLAY PATIENTS
    // =====================================

    function displayPatients(searchTerm = "") {

        const patients = getAssignedPatients();

        const searchText = searchTerm.trim().toLowerCase();

        const filteredPatients = patients.filter((patient) => {

            return (
                String(patient.name || "").toLowerCase().includes(searchText) ||
                String(patient.id || "").toLowerCase().includes(searchText) ||
                String(patient.email || "").toLowerCase().includes(searchText) ||
                String(patient.phone || "").toLowerCase().includes(searchText)
            );
        });

        totalPatients.textContent = patients.length;

        totalAppointments.textContent =
            getDoctorAppointments().length;

        recordsCount.textContent =
            `Showing ${filteredPatients.length} of ${patients.length} patient(s)`;

        tableBody.replaceChildren();

        if (filteredPatients.length === 0) {

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 7;
            cell.className = "empty-message";

            cell.textContent = patients.length === 0
                ? "No patients assigned to you yet."
                : "No matching patients found.";

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;
        }

        filteredPatients.forEach((patient) => {

            const row = document.createElement("tr");

            const values = [
                patient.id || "N/A",
                patient.name || "N/A",
                patient.phone || "N/A",
                patient.email || "N/A",
                patient.gender || "N/A",
                patient.appointmentCount
            ];

            values.forEach((value) => {

                const cell = document.createElement("td");

                cell.textContent = value;

                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");

            viewButton.type = "button";
            viewButton.className = "patient-view-btn";
            viewButton.textContent = "View";

            viewButton.addEventListener("click", () => {
                showPatientDetails(patient);
            });

            actionCell.appendChild(viewButton);
            row.appendChild(actionCell);

            tableBody.appendChild(row);
        });
    }

    // =====================================
    // 8. SHOW PATIENT DETAILS
    // =====================================

    function showPatientDetails(patient) {

        patientDetails.style.display = "block";

        patientDetailsContent.replaceChildren();

        const details = [
            ["Patient ID", patient.id],
            ["Full Name", patient.name],
            ["Email", patient.email],
            ["Phone", patient.phone],
            ["Date of Birth", patient.dob],
            ["Gender", patient.gender],
            ["Blood Group", patient.bloodGroup],
            ["Address", patient.address],
            ["Emergency Contact", patient.emergencyContact]
        ];

        const detailsGrid = document.createElement("div");
        detailsGrid.className = "patient-details-grid";

        details.forEach(([label, value]) => {

            const item = document.createElement("div");
            item.className = "patient-detail-item";

            const title = document.createElement("span");
            title.textContent = label;

            const content = document.createElement("strong");
            content.textContent = value || "N/A";

            item.appendChild(title);
            item.appendChild(content);

            detailsGrid.appendChild(item);
        });

        patientDetailsContent.appendChild(detailsGrid);

        // Appointment history
        const historySection = document.createElement("div");
        historySection.className = "patient-history";

        const historyTitle = document.createElement("h4");
        historyTitle.textContent = "Appointment History";

        historySection.appendChild(historyTitle);

        const historyTable = document.createElement("table");
        historyTable.className = "dashboard-table";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        ["Appointment Date", "Time", "Status"].forEach((heading) => {

            const th = document.createElement("th");
            th.textContent = heading;

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        historyTable.appendChild(thead);

        const tbody = document.createElement("tbody");

        patient.appointments.forEach((appointment) => {

            const row = document.createElement("tr");

            const dateCell = document.createElement("td");
            dateCell.textContent = appointment.date || "N/A";

            const timeCell = document.createElement("td");
            timeCell.textContent = appointment.time || "N/A";

            const statusCell = document.createElement("td");
            statusCell.textContent = appointment.status || "Pending";

            row.appendChild(dateCell);
            row.appendChild(timeCell);
            row.appendChild(statusCell);

            tbody.appendChild(row);
        });

        historyTable.appendChild(tbody);

        historySection.appendChild(historyTable);

        patientDetailsContent.appendChild(historySection);

        patientDetails.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // =====================================
    // 9. SEARCH
    // =====================================

    searchInput.addEventListener("input", () => {
        displayPatients(searchInput.value);
    });

    // =====================================
    // 10. CLOSE DETAILS
    // =====================================

    closeDetails.addEventListener("click", () => {
        patientDetails.style.display = "none";
    });

    // =====================================
    // 11. SIDEBAR
    // =====================================

    document.getElementById("menuToggle")?.addEventListener("click", () => {
        document.getElementById("sidebar")?.classList.toggle("active");
    });

    // =====================================
    // 12. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")?.addEventListener("click", () => {

        localStorage.removeItem("semasacareSession");

        window.location.replace("../login.html");
    });

    // =====================================
    // 13. STORAGE REFRESH
    // =====================================

    window.addEventListener("storage", (event) => {

        if (
            event.key === "semasacareAppointments" ||
            event.key === "semasacarePatients"
        ) {
            displayPatients(searchInput.value);
        }
    });

    // =====================================
    // 14. INITIALIZE
    // =====================================

    displayPatients();

});
