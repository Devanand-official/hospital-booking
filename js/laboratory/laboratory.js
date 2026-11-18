/* ==========================================
   SEMASACARE - LABORATORY DASHBOARD
========================================== */

document.addEventListener("DOMContentLoaded", function () {

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    if (typeof SemasaAuth === "undefined") {
        window.location.href = "../login.html";
        return;
    }

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "laboratory") {
        window.location.href = "../login.html";
        return;
    }

    const technicianName =
        currentUser.name || currentUser.fullName || "Lab Technician";

    const laboratoryNameElement = document.getElementById("laboratoryName");
    const headerNameElement = document.getElementById("headerName");

    if (laboratoryNameElement) {
        laboratoryNameElement.textContent = technicianName;
    }

    if (headerNameElement) {
        headerNameElement.textContent = technicianName;
    }

    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const totalLabRequestsElement = document.getElementById("totalLabRequests");
    const awaitingSamplesElement = document.getElementById("awaitingSamples");
    const samplesCollectedElement = document.getElementById("samplesCollected");
    const testsInProgressElement = document.getElementById("testsInProgress");
    const completedLabReportsElement = document.getElementById("completedLabReports");
    const pendingLabBadge = document.getElementById("pendingLabBadge");

    const requestsTableBody = document.getElementById("labRequestsTableBody");
    const samplesTableBody = document.getElementById("recentSamplesBody");
    const reportsTableBody = document.getElementById("recentReportsBody");

    const requestSearch = document.getElementById("requestSearch");
    const requestStatusFilter = document.getElementById("requestStatusFilter");
    const requestTableNote = document.getElementById("requestTableNote");

    // =====================================
    // 3. LOCAL STORAGE HELPERS
    // =====================================

    function getStorageArray(key) {
        try {
            const storedValue = localStorage.getItem(key);
            const data = JSON.parse(storedValue || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Unable to read " + key + ":", error);
            return [];
        }
    }

    function getLabRequests() {
        return getStorageArray("semasacareLabRequests");
    }

    function getLabSamples() {
        return getStorageArray("semasacareLabSamples");
    }

    function getLabReports() {
        return getStorageArray("semasacareLabReports");
    }

    function getPatients() {
        return getStorageArray("semasacarePatients");
    }

    // =====================================
    // 4. GENERAL HELPERS
    // =====================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];
        });
    }

    function firstAvailableValue(record, keys, fallback = "") {
        for (const key of keys) {
            const value = record && record[key];

            if (value !== undefined && value !== null && value !== "") {
                return value;
            }
        }

        return fallback;
    }

    function formatDate(value) {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "N/A";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getRecordDate(record) {
        return firstAvailableValue(record, [
            "reportDate",
            "verifiedAt",
            "releasedAt",
            "collectionDate",
            "collectedAt",
            "sampleDate",
            "requestedAt",
            "requestDate",
            "orderDate",
            "createdAt",
            "createdDate",
            "date"
        ], "");
    }

    function sortNewestFirst(records) {
        return [...records].sort(function (a, b) {
            const dateA = new Date(getRecordDate(a) || 0).getTime();
            const dateB = new Date(getRecordDate(b) || 0).getTime();

            return (Number.isNaN(dateB) ? 0 : dateB) -
                (Number.isNaN(dateA) ? 0 : dateA);
        });
    }

    function displayDashboardDate() {
        const dateElement = document.querySelector("#dashboardDate span");

        if (!dateElement) return;

        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    // =====================================
    // 5. PATIENT / TEST / DOCTOR DETAILS
    // =====================================

    function getPatientName(record) {
        const nestedPatient = record.patient;

        if (nestedPatient && typeof nestedPatient === "object") {
            const nestedName = firstAvailableValue(nestedPatient, [
                "name", "fullName", "patientName"
            ]);

            if (nestedName) return nestedName;
        }

        const directName = firstAvailableValue(record, [
            "patientName", "patientFullName"
        ]);

        if (directName) return directName;

        const patientId = firstAvailableValue(record, [
            "patientId", "patientID", "patient_id"
        ], nestedPatient && typeof nestedPatient !== "object" ? nestedPatient : "");

        if (patientId !== "") {
            const patient = getPatients().find(function (item) {
                const possibleIds = [item.id, item.patientId, item.patientID]
                    .filter(value => value !== undefined && value !== null)
                    .map(String);

                return possibleIds.includes(String(patientId));
            });

            if (patient) {
                return firstAvailableValue(patient, ["name", "fullName", "patientName"], "Unknown Patient");
            }
        }

        return "Unknown Patient";
    }

    function getTestName(record) {
        const directTest = firstAvailableValue(record, [
            "testName", "test", "testType", "investigation", "testTitle"
        ]);

        if (directTest) {
            if (typeof directTest === "object") {
                return firstAvailableValue(directTest, ["name", "testName", "label"], "Lab Test");
            }

            return directTest;
        }

        const testCollection = record.tests || record.testNames || record.investigations;

        if (Array.isArray(testCollection) && testCollection.length) {
            return testCollection.map(function (item) {
                if (typeof item === "string") return item;
                return firstAvailableValue(item, ["name", "testName", "label"], "Lab Test");
            }).join(", ");
        }

        return "Lab Test";
    }

    function getDoctorName(record) {
        const doctor = firstAvailableValue(record, [
            "doctorName", "requestedBy", "orderedBy", "doctor"
        ], "Not specified");

        if (doctor && typeof doctor === "object") {
            return firstAvailableValue(doctor, ["name", "fullName"], "Not specified");
        }

        return doctor;
    }

    function getRequestId(record) {
        return firstAvailableValue(record, [
            "requestId", "labRequestId", "id", "orderId"
        ], "N/A");
    }

    // =====================================
    // 6. NORMALIZE WORKFLOW STATUS
    // =====================================

    function getNormalizedStatus(record) {
        const rawStatus = String(firstAvailableValue(record, [
            "status", "requestStatus", "workflowStatus", "testStatus"
        ], "Pending")).trim().toLowerCase().replace(/[_-]+/g, " ");

        if (/cancel|reject/.test(rawStatus)) return "cancelled";
        if (/complete|verified|released|result ready|approved|finalized/.test(rawStatus)) {
            return "completed";
        }
        if (/process|testing|analysis|in progress/.test(rawStatus)) return "processing";
        if (/collect|sample received|specimen received/.test(rawStatus)) return "collected";
        if (/await|pending|requested|ordered|new/.test(rawStatus)) return "awaiting";

        return "awaiting";
    }

    function getStatusLabel(status) {
        const labels = {
            awaiting: "Awaiting Sample",
            collected: "Sample Collected",
            processing: "Processing",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        return labels[status] || "Pending";
    }

    function getStatusBadge(status) {
        return `<span class="lab-status-badge ${status}">${getStatusLabel(status)}</span>`;
    }

    function getPriorityBadge(record) {
        const priority = String(firstAvailableValue(record, [
            "priority", "urgency", "severity"
        ], "Routine")).trim();

        const safePriority = priority.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const priorityClass = ["urgent", "critical", "high", "normal", "routine", "low"]
            .includes(safePriority) ? safePriority : "routine";

        return `<span class="lab-priority-badge ${priorityClass}">${escapeHTML(priority)}</span>`;
    }

    function isReportReady(report) {
        const rawStatus = String(firstAvailableValue(report, [
            "status", "reportStatus", "verificationStatus"
        ], "")).trim().toLowerCase().replace(/[_-]+/g, " ");

        if (/complete|verified|released|approved|finalized/.test(rawStatus)) {
            return true;
        }

        if (/pending|draft|rejected|cancel/.test(rawStatus)) {
            return false;
        }

        return Boolean(report.verifiedAt || report.releasedAt || report.approvedAt || report.finalizedAt);
    }

    // =====================================
    // 7. UPDATE STATISTICS
    // =====================================

    function updateStatistics() {
        const requests = getLabRequests();
        const samples = getLabSamples();
        const reports = getLabReports();

        const awaitingCount = requests.filter(item =>
            getNormalizedStatus(item) === "awaiting"
        ).length;

        const processingCount = requests.filter(item =>
            getNormalizedStatus(item) === "processing"
        ).length;

        const readyReports = reports.filter(isReportReady);

        if (totalLabRequestsElement) totalLabRequestsElement.textContent = requests.length;
        if (awaitingSamplesElement) awaitingSamplesElement.textContent = awaitingCount;
        if (samplesCollectedElement) samplesCollectedElement.textContent = samples.length;
        if (testsInProgressElement) testsInProgressElement.textContent = processingCount;
        if (completedLabReportsElement) completedLabReportsElement.textContent = readyReports.length;
        if (pendingLabBadge) pendingLabBadge.textContent = awaitingCount;
    }

    // =====================================
    // 8. DISPLAY LAB REQUESTS
    // =====================================

    function displayLabRequests() {
        if (!requestsTableBody) return;

        const searchTerm = requestSearch ? requestSearch.value.trim().toLowerCase() : "";
        const selectedStatus = requestStatusFilter ? requestStatusFilter.value : "all";

        const allRequests = sortNewestFirst(getLabRequests());

        const filteredRequests = allRequests.filter(function (request) {
            const normalizedStatus = getNormalizedStatus(request);
            const searchContent = [
                getRequestId(request),
                getPatientName(request),
                getTestName(request),
                getDoctorName(request)
            ].join(" ").toLowerCase();

            const matchesSearch = !searchTerm || searchContent.includes(searchTerm);
            const matchesStatus = selectedStatus === "all" || normalizedStatus === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        if (!filteredRequests.length) {
            const message = allRequests.length
                ? "No lab requests match your search or selected filter."
                : "No lab requests yet. Doctor-created test requests will appear here.";

            requestsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">${message}</td>
                </tr>
            `;

            if (requestTableNote) requestTableNote.textContent = "";
            return;
        }

        const visibleRequests = filteredRequests.slice(0, 8);

        requestsTableBody.innerHTML = visibleRequests.map(function (request) {
            const status = getNormalizedStatus(request);
            const requestDate = formatDate(getRecordDate(request));
            const requestId = getRequestId(request);

            return `
                <tr>
                    <td class="lab-primary-cell">${escapeHTML(requestId)}</td>
                    <td>${escapeHTML(getPatientName(request))}</td>
                    <td>${escapeHTML(getTestName(request))}</td>
                    <td>${escapeHTML(getDoctorName(request))}</td>
                    <td>${escapeHTML(requestDate)}</td>
                    <td>${getPriorityBadge(request)}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }).join("");

        if (requestTableNote) {
            requestTableNote.textContent = filteredRequests.length > visibleRequests.length
                ? `Showing the latest ${visibleRequests.length} of ${filteredRequests.length} matching requests.`
                : `${filteredRequests.length} request${filteredRequests.length === 1 ? "" : "s"} shown.`;
        }
    }

    // =====================================
    // 9. DISPLAY RECENT SAMPLE COLLECTIONS
    // =====================================

    function displayRecentSamples() {
        if (!samplesTableBody) return;

        const samples = sortNewestFirst(getLabSamples()).slice(0, 5);

        if (!samples.length) {
            samplesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">No sample collections recorded yet.</td>
                </tr>
            `;
            return;
        }

        samplesTableBody.innerHTML = samples.map(function (sample) {
            const sampleId = firstAvailableValue(sample, ["sampleId", "id", "specimenId"], "N/A");
            const sampleType = firstAvailableValue(sample, ["sampleType", "specimenType", "type"], "Not specified");

            return `
                <tr>
                    <td class="lab-primary-cell">${escapeHTML(sampleId)}</td>
                    <td>${escapeHTML(getPatientName(sample))}</td>
                    <td>${escapeHTML(sampleType)}</td>
                    <td>${escapeHTML(formatDate(getRecordDate(sample)))}</td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 10. DISPLAY COMPLETED LAB REPORTS
    // =====================================

    function displayRecentReports() {
        if (!reportsTableBody) return;

        const reports = sortNewestFirst(getLabReports())
            .filter(isReportReady)
            .slice(0, 5);

        if (!reports.length) {
            reportsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">No verified or released reports available yet.</td>
                </tr>
            `;
            return;
        }

        reportsTableBody.innerHTML = reports.map(function (report) {
            const reportId = firstAvailableValue(report, ["reportId", "id", "labReportId"], "N/A");
            const reportStatus = String(firstAvailableValue(report, ["status", "reportStatus"], "Verified"));

            return `
                <tr>
                    <td class="lab-primary-cell">${escapeHTML(reportId)}</td>
                    <td>${escapeHTML(getPatientName(report))}</td>
                    <td>${escapeHTML(getTestName(report))}</td>
                    <td>${escapeHTML(formatDate(getRecordDate(report)))}</td>
                    <td><span class="lab-status-badge completed">${escapeHTML(reportStatus)}</span></td>
                </tr>
            `;
        }).join("");
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

    // Close the mobile sidebar after choosing a page.
    if (sidebar) {
        sidebar.querySelectorAll(".menu-item").forEach(function (link) {
            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });
        });
    }

    // =====================================
    // 12. LOGOUT
    // =====================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            const shouldLogout = window.confirm("Are you sure you want to logout?");

            if (!shouldLogout) return;

            localStorage.removeItem("semasacareSession");
            window.location.href = "../login.html";
        });
    }

    // =====================================
    // 13. FILTER EVENTS
    // =====================================

    if (requestSearch) {
        requestSearch.addEventListener("input", displayLabRequests);
    }

    if (requestStatusFilter) {
        requestStatusFilter.addEventListener("change", displayLabRequests);
    }

    // Refresh the dashboard when another SemasaCare page changes lab data
    // in a different browser tab under the same origin.
    window.addEventListener("storage", function (event) {
        const relevantKeys = [
            "semasacareLabRequests",
            "semasacareLabSamples",
            "semasacareLabReports",
            "semasacarePatients"
        ];

        if (relevantKeys.includes(event.key) || event.key === null) {
            initializeDashboard();
        }
    });

    // =====================================
    // 14. INITIALIZE DASHBOARD
    // =====================================

    function initializeDashboard() {
        displayDashboardDate();
        updateStatistics();
        displayLabRequests();
        displayRecentSamples();
        displayRecentReports();
    }

    initializeDashboard();

});
