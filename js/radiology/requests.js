
/* =========================================
   RADIOLOGY REQUESTS
   File: js/radiology/radiology-requests.js
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const STORAGE_KEY = "semasacareRadiologyRequests";

    const elements = {
        dashboardDate: document.getElementById("dashboardDate"),
        totalRequests: document.getElementById("totalRequests"),
        pendingRequests: document.getElementById("pendingRequests"),
        scheduledRequests: document.getElementById("scheduledRequests"),
        completedRequests: document.getElementById("completedRequests"),

        search: document.getElementById("requestSearch"),
        statusFilter: document.getElementById("statusFilter"),
        priorityFilter: document.getElementById("priorityFilter"),
        refreshButton: document.getElementById("refreshRequests"),

        tableBody: document.getElementById("requestsTableBody"),
        requestCount: document.getElementById("requestCount"),

        modal: document.getElementById("requestDetailsModal"),
        closeModal: document.getElementById("closeRequestModal"),

        detailRequestId: document.getElementById("detailRequestId"),
        detailRequestDate: document.getElementById("detailRequestDate"),
        detailPatientName: document.getElementById("detailPatientName"),
        detailPatientId: document.getElementById("detailPatientId"),
        detailDoctorName: document.getElementById("detailDoctorName"),
        detailPriority: document.getElementById("detailPriority"),
        detailExamination: document.getElementById("detailExamination"),
        detailClinicalNotes: document.getElementById("detailClinicalNotes"),
        detailInstructions: document.getElementById("detailInstructions"),

        acceptButton: document.getElementById("acceptRequestBtn"),
        rejectButton: document.getElementById("rejectRequestBtn"),
        modalNote: document.getElementById("requestModalNote"),

        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        logoutButton: document.getElementById("logoutBtn"),
        radiologyName: document.getElementById("radiologyName"),
        headerName: document.getElementById("headerName")
    };

    let requests = [];
    let selectedRequestId = null;

    /* -------------------------------------
       AUTHENTICATION
    ------------------------------------- */

    if (typeof SemasaAuth === "undefined") {
        window.location.href = "../login.html";
        return;
    }

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "radiology") {
        window.location.href = "../login.html";
        return;
    }

    if (elements.radiologyName) {
        elements.radiologyName.textContent =
            currentUser.name || "Radiology Technician";
    }

    if (elements.headerName) {
        elements.headerName.textContent =
            currentUser.name || "Radiology Technician";
    }

    /* -------------------------------------
       STORAGE HELPERS
    ------------------------------------- */

    function getRequests() {
        try {
            const storedData = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return Array.isArray(storedData) ? storedData : [];
        } catch (error) {
            console.error("Unable to read radiology requests:", error);
            return [];
        }
    }

    function saveRequests() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));

        window.dispatchEvent(
            new CustomEvent("semasacare:radiologyRequestsUpdated")
        );
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];
        });
    }

    function getRequestId(request) {
        return String(request.requestId || request.id || "");
    }

    function getPatientName(request) {
        return request.patientName || request.patient?.name || "Unknown Patient";
    }

    function getPatientId(request) {
        return request.patientId || request.patient?.id || "N/A";
    }

    function getDoctorName(request) {
        return request.doctorName || request.doctor?.name || "N/A";
    }

    function getExamination(request) {
        return (
            request.examination ||
            request.examinationType ||
            request.scanName ||
            request.testName ||
            (Array.isArray(request.examinations)
                ? request.examinations.join(", ")
                : "") ||
            "Not specified"
        );
    }

    function getPriority(request) {
        return String(request.priority || "Routine").toLowerCase();
    }

    function getStatus(request) {
        return String(request.status || "Pending").trim().toLowerCase();
    }

    function formatDate(dateValue) {
        if (!dateValue) return "N/A";

        const value = String(dateValue).trim();
        let date;

        // Handle YYYY-MM-DD without timezone shifting
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

    function getRequestDate(request) {
        return (
            request.requestDate ||
            request.requestedAt ||
            request.createdAt ||
            request.date ||
            null
        );
    }
    /* =====================================
       DISPLAY DASHBOARD DATE
    ===================================== */

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

    /* -------------------------------------
   DISPLAY CURRENT DATE
------------------------------------- */

    // function displayDashboardDate() {
    //     if (!elements.dashboardDate) return;

    //     const today = new Date();

    //     elements.dashboardDate.innerHTML = `
    //     <i class="fas fa-calendar-days"></i>
    //     <span>${today.toLocaleDateString("en-IN", {
    //         weekday: "short",
    //         day: "2-digit",
    //         month: "short",
    //         year: "numeric"
    //     })}</span>
    // `;
    // }

    function getStatusLabel(status) {
        const labels = {
            pending: "Pending",
            "awaiting review": "Pending",
            accepted: "Accepted",
            scheduled: "Scheduled",
            progress: "In Progress",
            "in progress": "In Progress",
            "imaging in progress": "In Progress",
            completed: "Completed",
            rejected: "Rejected",
            cancelled: "Cancelled"
        };

        return labels[status] || status.replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
    }

    function getStatusClass(status) {
        const classes = {
            pending: "status-pending",
            "awaiting review": "status-pending",
            accepted: "status-accepted",
            scheduled: "status-scheduled",
            progress: "status-in-progress",
            "in progress": "status-in-progress",
            "imaging in progress": "status-in-progress",
            completed: "status-completed",
            rejected: "status-rejected",
            cancelled: "status-cancelled"
        };

        return classes[status] || "status-pending";
    }
    function getPriorityClass(priority) {
        const classes = {
            routine: "priority-routine",
            normal: "priority-routine",
            high: "priority-high",
            urgent: "priority-urgent",
            critical: "priority-critical",
            emergency: "priority-emergency"
        };

        return classes[priority] || "priority-routine";
    }

    /* -------------------------------------
       LOAD REQUESTS
    ------------------------------------- */

    function loadRequests() {
        requests = getRequests();

        updateStatistics();
        renderRequests();
    }

    /* -------------------------------------
       STATISTICS
    ------------------------------------- */

    function updateStatistics() {
        const total = requests.length;

        const pending = requests.filter(request =>
            ["pending", "awaiting review"].includes(getStatus(request))
        ).length;

        const scheduled = requests.filter(request =>
            ["scheduled", "booked", "confirmed"].includes(getStatus(request))
        ).length;

        const completed = requests.filter(request =>
            getStatus(request) === "completed"
        ).length;

        if (elements.totalRequests) {
            elements.totalRequests.textContent = total;
        }

        if (elements.pendingRequests) {
            elements.pendingRequests.textContent = pending;
        }

        if (elements.scheduledRequests) {
            elements.scheduledRequests.textContent = scheduled;
        }

        if (elements.completedRequests) {
            elements.completedRequests.textContent = completed;
        }
    }

    /* -------------------------------------
       FILTER REQUESTS
    ------------------------------------- */

    function getFilteredRequests() {
        const searchText = (
            elements.search?.value || ""
        ).trim().toLowerCase();

        const selectedStatus = (
            elements.statusFilter?.value || "all"
        ).toLowerCase();

        const selectedPriority = (
            elements.priorityFilter?.value || "all"
        ).toLowerCase();

        return requests.filter(request => {
            const searchableText = [
                getRequestId(request),
                getPatientName(request),
                getPatientId(request),
                getDoctorName(request),
                getExamination(request)
            ].join(" ").toLowerCase();

            const status = getStatus(request);
            const priority = getPriority(request);

            const matchesSearch =
                !searchText || searchableText.includes(searchText);

            const normalizedStatus = status === "in progress" ||
                status === "imaging in progress"
                ? "progress"
                : status;

            const matchesStatus =
                selectedStatus === "all" ||
                normalizedStatus === selectedStatus;

            const matchesPriority =
                selectedPriority === "all" ||
                priority === selectedPriority;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }

    /* -------------------------------------
       RENDER TABLE
    ------------------------------------- */

    function renderRequests() {
        if (!elements.tableBody) return;

        const filteredRequests = getFilteredRequests();

        if (elements.requestCount) {
            elements.requestCount.textContent =
                `${filteredRequests.length} request(s)`;
        }

        if (filteredRequests.length === 0) {
            elements.tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No imaging requests found.
                </td>
            </tr>
        `;
            return;
        }

        const sortedRequests = [...filteredRequests].sort((a, b) => {
            const dateA = new Date(getRequestDate(a) || 0);
            const dateB = new Date(getRequestDate(b) || 0);
            return dateB - dateA;
        });

        elements.tableBody.innerHTML = sortedRequests.map(request => {
            const requestId = getRequestId(request);
            const status = getStatus(request);
            const priority = getPriority(request);
            const requestDate = formatDate(getRequestDate(request));

            return `
            <tr>
                <!-- REQUEST ID -->
                <td class="request-id-cell">
                    <strong>${escapeHTML(requestId || "N/A")}</strong>
                </td>

                <!-- PATIENT DETAILS -->
                <td>
                    <div class="patient-cell">
                        <strong>${escapeHTML(getPatientName(request))}</strong>
                        <small>ID: ${escapeHTML(getPatientId(request))}</small>
                    </div>
                </td>

                <!-- EXAMINATION -->
                <td>
                    ${escapeHTML(getExamination(request))}
                </td>

                <!-- REQUESTED BY -->
                <td>
                    ${escapeHTML(getDoctorName(request))}
                </td>

                <!-- REQUEST DATE -->
                <td class="request-date-cell">
                    <i class="far fa-calendar-alt"></i>
                    ${escapeHTML(requestDate)}
                </td>

                <!-- PRIORITY -->
                <td>
                    <span class="priority-badge ${getPriorityClass(priority)}">
                        ${escapeHTML(priority.toUpperCase())}
                    </span>
                </td>

                <!-- STATUS -->
                <td>
                    <span class="status-badge ${getStatusClass(status)}">
                        ${escapeHTML(getStatusLabel(status))}
                    </span>
                </td>

                <!-- ACTIONS -->
                <td>
                    <button
                        type="button"
                        class="action-btn"
                        data-action="view"
                        data-id="${escapeHTML(requestId)}"
                    >
                        <i class="fas fa-eye"></i>
                        View
                    </button>
                </td>
            </tr>
        `;
        }).join("");
    }
    /* -------------------------------------
       REQUEST DETAILS MODAL
    ------------------------------------- */

    function openRequestModal(requestId) {
        const request = requests.find(item =>
            getRequestId(item) === String(requestId)
        );

        if (!request || !elements.modal) return;

        selectedRequestId = String(requestId);

        const status = getStatus(request);
        const isPending = ["pending", "awaiting review"].includes(status);

        if (elements.detailRequestId) {
            elements.detailRequestId.textContent = getRequestId(request) || "N/A";
        }

        if (elements.detailRequestDate) {
            elements.detailRequestDate.textContent = formatDate(
                request.requestDate || request.requestedAt || request.createdAt
            );
        }

        if (elements.detailPatientName) {
            elements.detailPatientName.textContent = getPatientName(request);
        }

        if (elements.detailPatientId) {
            elements.detailPatientId.textContent = getPatientId(request);
        }

        if (elements.detailDoctorName) {
            elements.detailDoctorName.textContent = getDoctorName(request);
        }

        if (elements.detailPriority) {
            elements.detailPriority.textContent =
                getPriority(request).toUpperCase();
        }

        if (elements.detailExamination) {
            elements.detailExamination.textContent = getExamination(request);
        }

        if (elements.detailClinicalNotes) {
            elements.detailClinicalNotes.textContent =
                request.clinicalNotes || request.notes || "No clinical notes provided.";
        }

        if (elements.detailInstructions) {
            elements.detailInstructions.textContent =
                request.instructions ||
                request.specialInstructions ||
                "No special instructions provided.";
        }

        if (elements.acceptButton) {
            elements.acceptButton.style.display = isPending ? "" : "none";
        }

        if (elements.rejectButton) {
            elements.rejectButton.style.display = isPending ? "" : "none";
        }

        if (elements.modalNote) {
            elements.modalNote.textContent = isPending
                ? "Review the request before accepting or rejecting it."
                : `Current status: ${getStatusLabel(status)}.`;
        }

        elements.modal.classList.add("active");
        elements.modal.setAttribute("aria-hidden", "false");
    }

    function closeRequestModal() {
        if (!elements.modal) return;

        elements.modal.classList.remove("active");
        elements.modal.setAttribute("aria-hidden", "true");
        selectedRequestId = null;
    }

    /* -------------------------------------
       ACCEPT REQUEST
    ------------------------------------- */

    function acceptRequest() {
        if (!selectedRequestId) return;

        const request = requests.find(item =>
            getRequestId(item) === selectedRequestId
        );

        if (!request) return;

        const status = getStatus(request);

        if (!["pending", "awaiting review"].includes(status)) {
            alert("Only pending requests can be accepted.");
            return;
        }

        const confirmed = window.confirm(
            "Accept this imaging request?"
        );

        if (!confirmed) return;

        request.status = "Accepted";
        request.acceptedAt = new Date().toISOString();
        request.acceptedBy = currentUser.name || currentUser.email;

        saveRequests();
        closeRequestModal();
        loadRequests();

        alert("Imaging request accepted successfully.");
    }

    /* -------------------------------------
       REJECT REQUEST
    ------------------------------------- */

    function rejectRequest() {
        if (!selectedRequestId) return;

        const request = requests.find(item =>
            getRequestId(item) === selectedRequestId
        );

        if (!request) return;

        const status = getStatus(request);

        if (!["pending", "awaiting review"].includes(status)) {
            alert("Only pending requests can be rejected.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to reject this imaging request?"
        );

        if (!confirmed) return;

        request.status = "Rejected";
        request.rejectedAt = new Date().toISOString();
        request.rejectedBy = currentUser.name || currentUser.email;

        saveRequests();
        closeRequestModal();
        loadRequests();

        alert("Imaging request rejected.");
    }

    /* -------------------------------------
       EVENT LISTENERS
    ------------------------------------- */

    elements.tableBody?.addEventListener("click", event => {
        const button = event.target.closest("[data-action='view']");

        if (!button) return;

        openRequestModal(button.dataset.id);
    });

    elements.search?.addEventListener("input", renderRequests);
    elements.statusFilter?.addEventListener("change", renderRequests);
    elements.priorityFilter?.addEventListener("change", renderRequests);

    elements.refreshButton?.addEventListener("click", loadRequests);

    elements.closeModal?.addEventListener("click", closeRequestModal);

    elements.acceptButton?.addEventListener("click", acceptRequest);
    elements.rejectButton?.addEventListener("click", rejectRequest);

    elements.modal?.addEventListener("click", event => {
        if (event.target === elements.modal) {
            closeRequestModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeRequestModal();
        }
    });

    /* -------------------------------------
       SIDEBAR
    ------------------------------------- */

    elements.menuToggle?.addEventListener("click", () => {
        elements.sidebar?.classList.toggle("active");
    });

    elements.sidebar?.querySelectorAll(".menu-item").forEach(link => {
        link.addEventListener("click", () => {
            elements.sidebar?.classList.remove("active");
        });
    });

    /* -------------------------------------
     LOGOUT
  ------------------------------------- */

    elements.logoutButton?.addEventListener("click", function (event) {
        event.preventDefault();

        const confirmed = window.confirm("Are you sure you want to logout?");

        if (!confirmed) return;

        localStorage.removeItem("semasacareSession");
        window.location.replace("../login.html");
    });

    /* -------------------------------------
       CROSS-TAB UPDATES
    ------------------------------------- */

    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            loadRequests();
        }
    });

    window.addEventListener(
        "semasacare:radiologyRequestsUpdated",
        loadRequests
    );

    /* -------------------------------------
   INITIALIZE REQUESTS PAGE
------------------------------------- */

    function initializeRequestsPage() {
        displayDashboardDate();
        loadRequests();
    }

    initializeRequestsPage();
});
