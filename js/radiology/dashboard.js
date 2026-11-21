
/* ==========================================
   SEMASACARE - RADIOLOGY DASHBOARD
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

    if (!currentUser || currentUser.role !== "radiology") {
        window.location.href = "../login.html";
        return;
    }

    const radiologyStaffName =
        currentUser.name ||
        currentUser.fullName ||
        "Radiology Technician";

    const radiologyNameElement =
        document.getElementById("radiologyName");

    const headerNameElement =
        document.getElementById("headerName");

    if (radiologyNameElement) {
        radiologyNameElement.textContent = radiologyStaffName;
    }

    if (headerNameElement) {
        headerNameElement.textContent = radiologyStaffName;
    }

    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const totalRequestsElement =
        document.getElementById("totalRadiologyRequests");

    const pendingRequestsElement =
        document.getElementById("pendingRadiologyRequests");

    const scheduledTodayElement =
        document.getElementById("scheduledToday");

    const imagingInProgressElement =
        document.getElementById("imagingInProgress");

    const completedReportsElement =
        document.getElementById("completedRadiologyReports");

    const pendingBadge =
        document.getElementById("pendingRadiologyBadge");

    const requestsTableBody =
        document.getElementById("radiologyRequestsBody");

    const scheduleTableBody =
        document.getElementById("todayScheduleBody");

    const reportsTableBody =
        document.getElementById("recentRadiologyReportsBody");

    const requestSearch =
        document.getElementById("requestSearch");

    const requestStatusFilter =
        document.getElementById("requestStatusFilter");

    const requestTableNote =
        document.getElementById("requestTableNote");

    // =====================================
    // 3. STORAGE KEYS
    // =====================================

    const REQUEST_KEY = "semasacareRadiologyRequests";
    const SCHEDULE_KEY = "semasacareRadiologySchedules";
    const IMAGE_KEY = "semasacareRadiologyImages";
    const RESULT_KEY = "semasacareRadiologyResults";
    const REPORT_KEY = "semasacareRadiologyReports";
    const PATIENT_KEY = "semasacarePatients";

    // =====================================
    // 4. STORAGE HELPERS
    // =====================================

    function getStorageArray(key) {
        try {
            const storedValue = localStorage.getItem(key);
            const data = JSON.parse(storedValue || "[]");

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to read " + key, error);
            return [];
        }
    }

    function getRadiologyRequests() {
        return getStorageArray(REQUEST_KEY);
    }

    function getRadiologySchedules() {
        return getStorageArray(SCHEDULE_KEY);
    }

    function getRadiologyImages() {
        return getStorageArray(IMAGE_KEY);
    }

    function getRadiologyResults() {
        return getStorageArray(RESULT_KEY);
    }

    function getRadiologyReports() {
        return getStorageArray(REPORT_KEY);
    }

    function getPatients() {
        return getStorageArray(PATIENT_KEY);
    }

    // =====================================
    // 5. GENERAL HELPERS
    // =====================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function firstAvailableValue(record, keys, fallback = "") {
        for (const key of keys) {
            const value = record && record[key];

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                return value;
            }
        }

        return fallback;
    }

    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) return "N/A";

        // Preserve date-only strings without timezone conversion.
        const dateOnly = String(value).match(/^\d{4}-\d{2}-\d{2}$/);

        let date;

        if (dateOnly) {
            const [year, month, day] = value.split("-").map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function sortNewestFirst(records) {
        return [...records].sort(function (a, b) {
            const dateA = new Date(getRecordDate(a) || 0).getTime();
            const dateB = new Date(getRecordDate(b) || 0).getTime();

            return (Number.isNaN(dateB) ? 0 : dateB) -
                (Number.isNaN(dateA) ? 0 : dateA);
        });
    }

    function getRecordDate(record) {
        return firstAvailableValue(record, [
            "requestDate",
            "requestedAt",
            "scheduleDate",
            "appointmentDate",
            "imagingDate",
            "reportDate",
            "releasedAt",
            "createdAt",
            "date"
        ], "");
    }

    function displayDashboardDate() {
        const dateElement =
            document.querySelector("#dashboardDate span");

        if (!dateElement) return;

        dateElement.textContent = new Date().toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }

    // =====================================
    // 6. PATIENT / EXAMINATION DETAILS
    // =====================================

    function getPatientName(record) {
        const nestedPatient = record.patient;

        if (nestedPatient && typeof nestedPatient === "object") {
            const name = firstAvailableValue(nestedPatient, [
                "name",
                "fullName",
                "patientName"
            ]);

            if (name) return name;
        }

        const directName = firstAvailableValue(record, [
            "patientName",
            "patientFullName"
        ]);

        if (directName) return directName;

        const patientId = firstAvailableValue(record, [
            "patientId",
            "patientID",
            "patient_id"
        ], "");

        if (patientId) {
            const patient = getPatients().find(function (item) {
                const ids = [
                    item.id,
                    item.patientId,
                    item.patientID
                ].filter(Boolean).map(String);

                return ids.includes(String(patientId));
            });

            if (patient) {
                return firstAvailableValue(patient, [
                    "name",
                    "fullName",
                    "patientName"
                ], "Unknown Patient");
            }
        }

        return "Unknown Patient";
    }

    function getExaminationName(record) {
        const directName = firstAvailableValue(record, [
            "examinationName",
            "imagingType",
            "scanType",
            "procedureName",
            "testName",
            "examination",
            "studyName"
        ]);

        if (directName) {
            if (typeof directName === "object") {
                return firstAvailableValue(directName, [
                    "name",
                    "label",
                    "examinationName"
                ], "Imaging Examination");
            }

            return directName;
        }

        const examinations =
            record.examinations ||
            record.imagingStudies ||
            record.tests;

        if (Array.isArray(examinations) && examinations.length) {
            return examinations.map(function (item) {
                if (typeof item === "string") return item;

                return firstAvailableValue(item, [
                    "name",
                    "label",
                    "examinationName"
                ], "Imaging Examination");

            }).join(", ");
        }

        return "Imaging Examination";
    }

    function getDoctorName(record) {
        const doctor = firstAvailableValue(record, [
            "doctorName",
            "requestedBy",
            "orderedBy",
            "doctor"
        ], "Not specified");

        if (typeof doctor === "object" && doctor !== null) {
            return firstAvailableValue(doctor, [
                "name",
                "fullName"
            ], "Not specified");
        }

        return doctor;
    }

    function getRequestId(record) {
        return firstAvailableValue(record, [
            "requestId",
            "radiologyRequestId",
            "id",
            "orderId"
        ], "N/A");
    }

    // =====================================
    // 7. STATUS NORMALIZATION
    // =====================================

    function getNormalizedStatus(record) {
        const rawStatus = String(firstAvailableValue(record, [
            "status",
            "requestStatus",
            "workflowStatus",
            "imagingStatus"
        ], "Pending")).trim().toLowerCase()
            .replace(/[_-]+/g, " ");

        if (/cancel|reject/.test(rawStatus)) {
            return "cancelled";
        }

        if (/complete|finalized|released|verified/.test(rawStatus)) {
            return "completed";
        }

        if (/progress|scanning|imaging|performing|in progress/.test(rawStatus)) {
            return "progress";
        }

        if (/schedule|booked|confirmed|accepted/.test(rawStatus)) {
            return "scheduled";
        }

        return "pending";
    }

    function getStatusLabel(status) {
        const labels = {
            pending: "Pending",
            scheduled: "Scheduled",
            progress: "In Progress",
            completed: "Completed",
            cancelled: "Cancelled"
        };

        return labels[status] || "Pending";
    }

    function getStatusBadge(status) {
        return `
            <span class="radiology-status-badge ${status}">
                ${getStatusLabel(status)}
            </span>
        `;
    }

    function getPriorityBadge(record) {
        const priority = String(firstAvailableValue(record, [
            "priority",
            "urgency",
            "severity"
        ], "Routine")).trim();

        const safePriority = priority.toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");

        const allowed = [
            "urgent",
            "critical",
            "high",
            "normal",
            "routine",
            "low"
        ];

        const priorityClass = allowed.includes(safePriority)
            ? safePriority
            : "routine";

        return `
            <span class="radiology-priority-badge ${priorityClass}">
                ${escapeHTML(priority)}
            </span>
        `;
    }

    // =====================================
    // 8. REPORT STATUS
    // =====================================

    function isReportFinalized(report) {
        const status = String(firstAvailableValue(report, [
            "status",
            "reportStatus",
            "verificationStatus"
        ], "")).trim().toLowerCase();

        return (
            /verified|released|finalized|completed/.test(status) ||
            Boolean(
                report.verifiedAt ||
                report.releasedAt ||
                report.finalizedAt
            )
        );
    }

    // =====================================
    // 9. UPDATE STATISTICS
    // =====================================

    function updateStatistics() {
        const requests = getRadiologyRequests();
        const schedules = getRadiologySchedules();
        const images = getRadiologyImages();
        const reports = getRadiologyReports();

        const pendingCount = requests.filter(function (request) {
            return getNormalizedStatus(request) === "pending";
        }).length;

        const today = getLocalDateString();

        const todaySchedules = schedules.filter(function (schedule) {
            const scheduleDate = firstAvailableValue(schedule, [
                "scheduleDate",
                "appointmentDate",
                "imagingDate",
                "date"
            ], "");

            return String(scheduleDate).slice(0, 10) === today &&
                getNormalizedStatus(schedule) !== "cancelled";
        });

        const inProgressCount = images.filter(function (image) {
            return getNormalizedStatus(image) === "progress";
        }).length;

        const finalizedReports = reports.filter(isReportFinalized);

        if (totalRequestsElement) {
            totalRequestsElement.textContent = requests.length;
        }

        if (pendingRequestsElement) {
            pendingRequestsElement.textContent = pendingCount;
        }

        if (scheduledTodayElement) {
            scheduledTodayElement.textContent = todaySchedules.length;
        }

        if (imagingInProgressElement) {
            imagingInProgressElement.textContent = inProgressCount;
        }

        if (completedReportsElement) {
            completedReportsElement.textContent = finalizedReports.length;
        }

        if (pendingBadge) {
            pendingBadge.textContent = pendingCount;
        }
    }

    // =====================================
    // 10. DISPLAY IMAGING REQUESTS
    // =====================================

    function displayRequests() {
        if (!requestsTableBody) return;

        const searchTerm = requestSearch
            ? requestSearch.value.trim().toLowerCase()
            : "";

        const selectedStatus = requestStatusFilter
            ? requestStatusFilter.value
            : "all";

        const allRequests = sortNewestFirst(getRadiologyRequests());

        const filteredRequests = allRequests.filter(function (request) {
            const status = getNormalizedStatus(request);

            const searchContent = [
                getRequestId(request),
                getPatientName(request),
                getExaminationName(request),
                getDoctorName(request)
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchTerm || searchContent.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        if (!filteredRequests.length) {
            requestsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        No imaging requests found.
                    </td>
                </tr>
            `;

            if (requestTableNote) {
                requestTableNote.textContent = "";
            }

            return;
        }

        const visibleRequests = filteredRequests.slice(0, 8);

        requestsTableBody.innerHTML = visibleRequests.map(function (request) {
            const status = getNormalizedStatus(request);

            return `
                <tr>
                    <td class="radiology-primary-cell">
                        ${escapeHTML(getRequestId(request))}
                    </td>
                    <td>${escapeHTML(getPatientName(request))}</td>
                    <td>${escapeHTML(getExaminationName(request))}</td>
                    <td>${escapeHTML(getDoctorName(request))}</td>
                    <td>${escapeHTML(formatDate(getRecordDate(request)))}</td>
                    <td>${getPriorityBadge(request)}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }).join("");

        if (requestTableNote) {
            requestTableNote.textContent =
                filteredRequests.length > visibleRequests.length
                    ? `Showing the latest ${visibleRequests.length} of ${filteredRequests.length} requests.`
                    : `${filteredRequests.length} request(s) shown.`;
        }
    }

    // =====================================
    // 11. DISPLAY TODAY'S SCHEDULE
    // =====================================

    function displayTodaySchedule() {
        if (!scheduleTableBody) return;

        const today = getLocalDateString();

        const schedules = getRadiologySchedules()
            .filter(function (schedule) {
                const scheduleDate = firstAvailableValue(schedule, [
                    "scheduleDate",
                    "appointmentDate",
                    "imagingDate",
                    "date"
                ], "");

                return String(scheduleDate).slice(0, 10) === today &&
                    getNormalizedStatus(schedule) !== "cancelled";
            })
            .sort(function (a, b) {
                return String(a.scheduleTime || a.time || "")
                    .localeCompare(String(b.scheduleTime || b.time || ""));
            })
            .slice(0, 5);

        if (!schedules.length) {
            scheduleTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">
                        No imaging schedules for today.
                    </td>
                </tr>
            `;
            return;
        }

        scheduleTableBody.innerHTML = schedules.map(function (schedule) {
            const time = firstAvailableValue(schedule, [
                "scheduleTime",
                "appointmentTime",
                "time"
            ], "Not set");

            const status = getNormalizedStatus(schedule);

            return `
                <tr>
                    <td>${escapeHTML(getPatientName(schedule))}</td>
                    <td>${escapeHTML(getExaminationName(schedule))}</td>
                    <td>${escapeHTML(time)}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 12. DISPLAY RECENT REPORTS
    // =====================================

    function displayRecentReports() {
        if (!reportsTableBody) return;

        const reports = sortNewestFirst(getRadiologyReports())
            .filter(isReportFinalized)
            .slice(0, 5);

        if (!reports.length) {
            reportsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-message">
                        No finalized radiology reports available yet.
                    </td>
                </tr>
            `;
            return;
        }

        reportsTableBody.innerHTML = reports.map(function (report) {
            const reportId = firstAvailableValue(report, [
                "reportId",
                "id",
                "radiologyReportId"
            ], "N/A");

            const status = getNormalizedStatus(report);

            return `
                <tr>
                    <td class="radiology-primary-cell">
                        ${escapeHTML(reportId)}
                    </td>
                    <td>${escapeHTML(getPatientName(report))}</td>
                    <td>${escapeHTML(getExaminationName(report))}</td>
                    <td>${escapeHTML(formatDate(getRecordDate(report)))}</td>
                    <td>${getStatusBadge(status)}</td>
                </tr>
            `;
        }).join("");
    }

    // =====================================
    // 13. SIDEBAR MENU
    // =====================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    if (sidebar) {
        sidebar.querySelectorAll(".menu-item").forEach(function (link) {
            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });
        });
    }

    // =====================================
    // 14. LOGOUT
    // =====================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();

            const confirmed = window.confirm(
                "Are you sure you want to logout?"
            );

            if (!confirmed) return;

            // Clear the current login session
            localStorage.removeItem("semasacareSession");

            // Redirect from pages/radiology/dashboard.html
            window.location.replace("../login.html");
        });
    } else {
        console.error("Logout button not found in Radiology Dashboard.");
    }

    // =====================================
    // 15. SEARCH AND FILTER EVENTS
    // =====================================

    if (requestSearch) {
        requestSearch.addEventListener("input", displayRequests);
    }

    if (requestStatusFilter) {
        requestStatusFilter.addEventListener("change", displayRequests);
    }

    // =====================================
    // 16. REFRESH WHEN DATA CHANGES
    // =====================================

    window.addEventListener("storage", function (event) {
        const relevantKeys = [
            REQUEST_KEY,
            SCHEDULE_KEY,
            IMAGE_KEY,
            RESULT_KEY,
            REPORT_KEY,
            PATIENT_KEY
        ];

        if (!event.key || relevantKeys.includes(event.key)) {
            initializeDashboard();
        }
    });

    // Custom events for same-tab updates
    [
        "radiologyRequestsUpdated",
        "radiologySchedulesUpdated",
        "radiologyImagesUpdated",
        "radiologyResultsUpdated",
        "radiologyReportsUpdated"
    ].forEach(function (eventName) {
        window.addEventListener(eventName, initializeDashboard);
    });

    // =====================================
    // 17. INITIALIZE DASHBOARD
    // =====================================

    function initializeDashboard() {
        displayDashboardDate();
        updateStatistics();
        displayRequests();
        displayTodaySchedule();
        displayRecentReports();
    }

    initializeDashboard();

});
