
/* ==========================================
   SEMASACARE - LABORATORY TEST REQUESTS
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

    document.getElementById("laboratoryName").textContent = technicianName;
    document.getElementById("headerName").textContent = technicianName;


    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const requestsTableBody = document.getElementById("requestsTableBody");

    const requestSearch = document.getElementById("requestSearch");
    const statusFilter = document.getElementById("statusFilter");
    const priorityFilter = document.getElementById("priorityFilter");

    const totalRequests = document.getElementById("totalRequests");
    const pendingRequests = document.getElementById("pendingRequests");
    const acceptedRequests = document.getElementById("acceptedRequests");
    const completedRequests = document.getElementById("completedRequests");

    const pendingLabBadge = document.getElementById("pendingLabBadge");
    const requestTableNote = document.getElementById("requestTableNote");

    const requestModal = document.getElementById("requestModal");
    const requestDetails = document.getElementById("requestDetails");
    const modalActions = document.getElementById("modalActions");

    let selectedRequestId = null;


    // =====================================
    // 3. LOCAL STORAGE
    // =====================================

    const REQUEST_STORAGE_KEY = "semasacareLabRequests";

    function getLabRequests() {
        try {
            const data = JSON.parse(
                localStorage.getItem(REQUEST_STORAGE_KEY) || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to read lab requests:", error);
            return [];
        }
    }

    function saveLabRequests(requests) {
        localStorage.setItem(
            REQUEST_STORAGE_KEY,
            JSON.stringify(requests)
        );

        window.dispatchEvent(new CustomEvent("labRequestsUpdated"));
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

    function getRequestId(request) {
        return String(firstAvailableValue(request, [
            "requestId",
            "labRequestId",
            "id",
            "orderId"
        ], "N/A"));
    }

    function getPatientName(request) {

        const patient = request.patient;

        if (patient && typeof patient === "object") {

            const name = firstAvailableValue(patient, [
                "name",
                "fullName",
                "patientName"
            ]);

            if (name) return name;
        }

        return firstAvailableValue(request, [
            "patientName",
            "patientFullName"
        ], "Unknown Patient");
    }

    function getPatientId(request) {

        const patient = request.patient;

        return firstAvailableValue(request, [
            "patientId",
            "patientID",
            "patient_id"
        ], patient && typeof patient === "object"
            ? firstAvailableValue(patient, ["id", "patientId"], "N/A")
            : patient || "N/A");
    }

    function getDoctorName(request) {

        const doctor = firstAvailableValue(request, [
            "doctorName",
            "requestedBy",
            "orderedBy",
            "doctor"
        ], "Not specified");

        if (doctor && typeof doctor === "object") {
            return firstAvailableValue(doctor, [
                "name",
                "fullName"
            ], "Not specified");
        }

        return doctor;
    }

    function getTests(request) {

        const directTest = firstAvailableValue(request, [
            "testName",
            "test",
            "testType",
            "investigation",
            "testTitle"
        ]);

        if (directTest) {

            if (typeof directTest === "object") {
                return firstAvailableValue(directTest, [
                    "name",
                    "testName",
                    "label"
                ], "Lab Test");
            }

            return directTest;
        }

        const testCollection =
            request.tests ||
            request.testNames ||
            request.investigations;

        if (Array.isArray(testCollection) && testCollection.length) {

            return testCollection.map(function (item) {

                if (typeof item === "string") return item;

                return firstAvailableValue(item, [
                    "name",
                    "testName",
                    "label"
                ], "Lab Test");

            }).join(", ");
        }

        return "Lab Test";
    }

    function getRequestDate(request) {
        return firstAvailableValue(request, [
            "requestedAt",
            "requestDate",
            "createdAt",
            "createdDate",
            "orderDate",
            "date"
        ], "");
    }

    function formatDate(value) {

        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "N/A";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function displayDashboardDate() {

        const dateElement =
            document.querySelector("#dashboardDate span");

        if (!dateElement) return;

        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }


    // =====================================
    // 5. STATUS AND PRIORITY
    // =====================================

    function getRawStatus(request) {

        return String(firstAvailableValue(request, [
            "status",
            "requestStatus",
            "workflowStatus",
            "testStatus"
        ], "Pending"))
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, " ");
    }

    function getNormalizedStatus(request) {

        const status = getRawStatus(request);

        if (/reject/.test(status)) return "rejected";
        if (/cancel/.test(status)) return "rejected";

        if (/complete|verified|released|approved|finalized/.test(status)) {
            return "completed";
        }

        if (/process|testing|analysis|in progress/.test(status)) {
            return "processing";
        }

        if (/collect|sample received|specimen received/.test(status)) {
            return "collected";
        }

        if (/accept|await|sample pending/.test(status)) {
            return "awaiting";
        }

        if (/pending|requested|ordered|new/.test(status)) {
            return "pending";
        }

        return "pending";
    }

    function getStatusLabel(status) {

        const labels = {
            pending: "Pending Review",
            awaiting: "Awaiting Sample",
            collected: "Sample Collected",
            processing: "Processing",
            completed: "Completed",
            rejected: "Rejected"
        };

        return labels[status] || "Pending Review";
    }

    function getStatusBadge(status) {

        return `
            <span class="lab-status-badge ${status}">
                ${getStatusLabel(status)}
            </span>
        `;
    }

    function getPriority(request) {

        return String(firstAvailableValue(request, [
            "priority",
            "urgency",
            "severity"
        ], "Routine")).trim();
    }

    function getPriorityBadge(request) {

        const priority = getPriority(request);

        const safePriority = priority
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "");

        const allowedPriorities = [
            "urgent",
            "critical",
            "high",
            "normal",
            "routine",
            "low"
        ];

        const priorityClass = allowedPriorities.includes(safePriority)
            ? safePriority
            : "routine";

        return `
            <span class="lab-priority-badge ${priorityClass}">
                ${escapeHTML(priority)}
            </span>
        `;
    }


    // =====================================
    // 6. UPDATE STATISTICS
    // =====================================

    function updateStatistics() {

        const requests = getLabRequests();

        const pendingCount = requests.filter(request =>
            getNormalizedStatus(request) === "pending"
        ).length;

        const awaitingCount = requests.filter(request =>
            getNormalizedStatus(request) === "awaiting"
        ).length;

        const completedCount = requests.filter(request =>
            getNormalizedStatus(request) === "completed"
        ).length;

        totalRequests.textContent = requests.length;
        pendingRequests.textContent = pendingCount;
        acceptedRequests.textContent = awaitingCount;
        completedRequests.textContent = completedCount;

        // pendingLabBadge.textContent = pendingCount + awaitingCount;
        pendingLabBadge.textContent = awaitingCount;
    }


    // =====================================
    // 7. DISPLAY REQUESTS
    // =====================================

    function displayRequests() {

        const requests = getLabRequests();

        const searchTerm = requestSearch.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedPriority = priorityFilter.value;

        const filteredRequests = requests
            .slice()
            .sort(function (a, b) {

                const dateA = new Date(getRequestDate(a) || 0).getTime();
                const dateB = new Date(getRequestDate(b) || 0).getTime();

                return (Number.isNaN(dateB) ? 0 : dateB) -
                    (Number.isNaN(dateA) ? 0 : dateA);
            })
            .filter(function (request) {

                const status = getNormalizedStatus(request);
                const priority = getPriority(request).toLowerCase();

                const searchableContent = [
                    getRequestId(request),
                    getPatientName(request),
                    getPatientId(request),
                    getTests(request),
                    getDoctorName(request)
                ].join(" ").toLowerCase();

                const matchesSearch =
                    !searchTerm || searchableContent.includes(searchTerm);

                const matchesStatus =
                    selectedStatus === "all" || status === selectedStatus;

                const matchesPriority =
                    selectedPriority === "all" ||
                    priority === selectedPriority;

                return matchesSearch && matchesStatus && matchesPriority;
            });

        if (!filteredRequests.length) {

            const message = requests.length
                ? "No test requests match your search or selected filters."
                : "No test requests available. Doctor-created requests will appear here.";

            requestsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        ${message}
                    </td>
                </tr>
            `;

            requestTableNote.textContent = "";
            return;
        }

        requestsTableBody.innerHTML = filteredRequests.map(function (request) {

            const requestId = getRequestId(request);
            const status = getNormalizedStatus(request);
            const canReview = status === "pending";

            return `
                <tr>
                    <td class="lab-primary-cell">
                        ${escapeHTML(requestId)}
                    </td>

                    <td class="lab-patient-cell">
                        <strong>${escapeHTML(getPatientName(request))}</strong>
                        <span class="lab-secondary-cell">
                            ID: ${escapeHTML(getPatientId(request))}
                        </span>
                    </td>

                    <td>${escapeHTML(getTests(request))}</td>

                    <td>${escapeHTML(getDoctorName(request))}</td>

                    <td>${escapeHTML(formatDate(getRequestDate(request)))}</td>

                    <td>${getPriorityBadge(request)}</td>

                    <td>${getStatusBadge(status)}</td>

                    <td>
                        <div class="lab-row-actions">

                            <button type="button"
                                class="lab-action-btn view"
                                data-action="view"
                                data-id="${escapeHTML(requestId)}"
                                title="View request">
                                <i class="fas fa-eye"></i>
                            </button>

                            ${canReview
                    ? `
                                        <button type="button"
                                            class="lab-action-btn accept"
                                            data-action="accept"
                                            data-id="${escapeHTML(requestId)}"
                                            title="Accept request">
                                            <i class="fas fa-check"></i>
                                        </button>

                                        <button type="button"
                                            class="lab-action-btn reject"
                                            data-action="reject"
                                            data-id="${escapeHTML(requestId)}"
                                            title="Reject request">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    `
                    : ""
                }

                        </div>
                    </td>
                </tr>
            `;

        }).join("");

        requestTableNote.textContent =
            `${filteredRequests.length} request(s) shown.`;
    }


    // =====================================
    // 8. FIND REQUEST
    // =====================================

    function findRequest(requestId) {

        return getLabRequests().find(request =>
            getRequestId(request) === String(requestId)
        );
    }


    // =====================================
    // 9. REQUEST DETAILS MODAL
    // =====================================

    function openRequestModal(requestId) {

        const request = findRequest(requestId);

        if (!request) {
            alert("Request not found.");
            return;
        }

        selectedRequestId = requestId;

        const status = getNormalizedStatus(request);

        requestDetails.innerHTML = `

            <div class="lab-detail-item">
                <span>Request ID</span>
                <strong>${escapeHTML(getRequestId(request))}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Patient Name</span>
                <strong>${escapeHTML(getPatientName(request))}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Patient ID</span>
                <strong>${escapeHTML(getPatientId(request))}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Requested By</span>
                <strong>${escapeHTML(getDoctorName(request))}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Request Date</span>
                <strong>${escapeHTML(formatDate(getRequestDate(request)))}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Priority</span>
                <strong>${getPriorityBadge(request)}</strong>
            </div>

            <div class="lab-detail-item">
                <span>Current Status</span>
                <strong>${getStatusBadge(status)}</strong>
            </div>

            <div class="lab-detail-item full-width">
                <span>Requested Tests</span>
                <strong>${escapeHTML(getTests(request))}</strong>
            </div>

            <div class="lab-detail-item full-width">
                <span>Clinical Notes / Instructions</span>
                <strong>
                    ${escapeHTML(firstAvailableValue(request, [
            "notes",
            "clinicalNotes",
            "instructions",
            "remarks"
        ], "No additional instructions provided."))}
                </strong>
            </div>

            ${request.rejectionReason
                ? `
                        <div class="lab-detail-item full-width">
                            <span>Rejection Reason</span>
                            <strong>${escapeHTML(request.rejectionReason)}</strong>
                        </div>
                    `
                : ""
            }
        `;

        if (status === "pending") {

            modalActions.innerHTML = `
                <button type="button" class="lab-btn secondary"
                    id="modalCloseBtn">
                    Close
                </button>

                <button type="button" class="lab-btn reject"
                    data-modal-action="reject">
                    <i class="fas fa-times"></i> Reject
                </button>

                <button type="button" class="lab-btn accept"
                    data-modal-action="accept">
                    <i class="fas fa-check"></i> Accept Request
                </button>
            `;

        } else {

            modalActions.innerHTML = `
                <button type="button" class="lab-btn secondary"
                    id="modalCloseBtn">
                    Close
                </button>
            `;
        }

        requestModal.classList.add("active");
        requestModal.setAttribute("aria-hidden", "false");
    }

    function closeRequestModal() {

        requestModal.classList.remove("active");
        requestModal.setAttribute("aria-hidden", "true");

        selectedRequestId = null;
    }


    // =====================================
    // 10. ACCEPT REQUEST
    // =====================================

    function acceptRequest(requestId) {

        const requests = getLabRequests();

        const index = requests.findIndex(request =>
            getRequestId(request) === String(requestId)
        );

        if (index === -1) {
            alert("Request not found.");
            return;
        }

        if (getNormalizedStatus(requests[index]) !== "pending") {
            alert("Only pending requests can be accepted.");
            return;
        }

        const shouldAccept = confirm(
            "Are you sure you want to accept this laboratory request?"
        );

        if (!shouldAccept) return;

        requests[index].status = "Awaiting Sample";
        requests[index].acceptedAt = new Date().toISOString();
        requests[index].acceptedBy =
            currentUser.name || currentUser.email || "Lab Technician";

        saveLabRequests(requests);

        closeRequestModal();
        refreshPage();

        alert("Laboratory request accepted successfully.");
    }


    // =====================================
    // 11. REJECT REQUEST
    // =====================================

    function rejectRequest(requestId) {

        const requests = getLabRequests();

        const index = requests.findIndex(request =>
            getRequestId(request) === String(requestId)
        );

        if (index === -1) {
            alert("Request not found.");
            return;
        }

        if (getNormalizedStatus(requests[index]) !== "pending") {
            alert("Only pending requests can be rejected.");
            return;
        }

        const reason = prompt("Enter the reason for rejecting this request:");

        if (reason === null) return;

        if (!reason.trim()) {
            alert("Please enter a rejection reason.");
            return;
        }

        const shouldReject = confirm(
            "Are you sure you want to reject this request?"
        );

        if (!shouldReject) return;

        requests[index].status = "Rejected";
        requests[index].rejectedAt = new Date().toISOString();
        requests[index].rejectedBy =
            currentUser.name || currentUser.email || "Lab Technician";
        requests[index].rejectionReason = reason.trim();

        saveLabRequests(requests);

        closeRequestModal();
        refreshPage();

        alert("Laboratory request rejected.");
    }


    // =====================================
    // 12. TABLE ACTION EVENTS
    // =====================================

    requestsTableBody.addEventListener("click", function (event) {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const requestId = button.dataset.id;

        if (action === "view") {
            openRequestModal(requestId);
        }

        if (action === "accept") {
            acceptRequest(requestId);
        }

        if (action === "reject") {
            rejectRequest(requestId);
        }
    });

    modalActions.addEventListener("click", function (event) {

        const closeButton = event.target.closest("#modalCloseBtn");

        if (closeButton) {
            closeRequestModal();
            return;
        }

        const button = event.target.closest("[data-modal-action]");

        if (!button) return;

        const action = button.dataset.modalAction;

        if (!selectedRequestId) return;

        if (action === "accept") {
            acceptRequest(selectedRequestId);
        }

        if (action === "reject") {
            rejectRequest(selectedRequestId);
        }
    });


    // =====================================
    // 13. MODAL EVENTS
    // =====================================

    document.getElementById("closeModal")
        .addEventListener("click", closeRequestModal);

    document.getElementById("modalCloseBtn")
        .addEventListener("click", closeRequestModal);

    requestModal.addEventListener("click", function (event) {

        if (event.target === requestModal) {
            closeRequestModal();
        }
    });

    document.addEventListener("keydown", function (event) {

        if (event.key === "Escape") {
            closeRequestModal();
        }
    });


    // =====================================
    // 14. SEARCH AND FILTER EVENTS
    // =====================================

    requestSearch.addEventListener("input", displayRequests);
    statusFilter.addEventListener("change", displayRequests);
    priorityFilter.addEventListener("change", displayRequests);


    // =====================================
    // 15. REFRESH
    // =====================================

    function refreshPage() {
        updateStatistics();
        displayRequests();
    }

    document.getElementById("refreshRequests")
        .addEventListener("click", refreshPage);


    // =====================================
    // 16. SIDEBAR
    // =====================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    menuToggle.addEventListener("click", function () {
        sidebar.classList.toggle("active");
    });

    sidebar.querySelectorAll(".menu-item").forEach(function (link) {

        link.addEventListener("click", function () {
            sidebar.classList.remove("active");
        });
    });


    // =====================================
    // 17. LOGOUT
    // =====================================

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {

            const shouldLogout = confirm(
                "Are you sure you want to logout?"
            );

            if (!shouldLogout) return;

            localStorage.removeItem("semasacareSession");
            window.location.href = "../login.html";
        });


    // =====================================
    // 18. STORAGE UPDATES
    // =====================================

    window.addEventListener("storage", function (event) {

        if (
            event.key === REQUEST_STORAGE_KEY ||
            event.key === null
        ) {
            refreshPage();
        }
    });

    window.addEventListener("labRequestsUpdated", refreshPage);


    // =====================================
    // 19. INITIALIZE
    // =====================================

    displayDashboardDate();
    refreshPage();

});
