
/* ============================================
   SEMASACARE - RADIOLOGY SCHEDULING
   File: js/radiology/scheduling.js
============================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const REQUESTS_KEY = "semasacareRadiologyRequests";
    const SCHEDULES_KEY = "semasacareRadiologySchedules";

    const elements = {
        dashboardDate: document.getElementById("dashboardDate"),

        radiologyName: document.getElementById("radiologyName"),
        headerName: document.getElementById("headerName"),

        awaitingSchedulingCount: document.getElementById("awaitingSchedulingCount"),
        scheduledTodayCount: document.getElementById("scheduledTodayCount"),
        upcomingAppointmentsCount: document.getElementById("upcomingAppointmentsCount"),
        completedSchedulesCount: document.getElementById("completedSchedulesCount"),

        acceptedSearch: document.getElementById("acceptedRequestSearch"),
        acceptedPriorityFilter: document.getElementById("acceptedPriorityFilter"),
        acceptedRequestsBody: document.getElementById("acceptedRequestsBody"),
        acceptedRequestsNote: document.getElementById("acceptedRequestsNote"),
        refreshAcceptedRequests: document.getElementById("refreshAcceptedRequests"),

        scheduleSearch: document.getElementById("scheduleSearch"),
        scheduleStatusFilter: document.getElementById("scheduleStatusFilter"),
        upcomingSchedulesBody: document.getElementById("upcomingSchedulesBody"),
        upcomingSchedulesNote: document.getElementById("upcomingSchedulesNote"),
        scheduleCount: document.getElementById("scheduleCount"),

        scheduleModal: document.getElementById("scheduleModal"),
        closeScheduleModal: document.getElementById("closeScheduleModal"),
        cancelSchedule: document.getElementById("cancelSchedule"),
        scheduleForm: document.getElementById("scheduleForm"),
        scheduleFormMessage: document.getElementById("scheduleFormMessage"),

        scheduleRequestKey: document.getElementById("scheduleRequestKey"),
        scheduleRequestId: document.getElementById("scheduleRequestId"),
        schedulePatientName: document.getElementById("schedulePatientName"),
        scheduleExamination: document.getElementById("scheduleExamination"),
        schedulePriority: document.getElementById("schedulePriority"),

        scheduleDate: document.getElementById("scheduleDate"),
        scheduleTime: document.getElementById("scheduleTime"),
        scheduleRoom: document.getElementById("scheduleRoom"),
        scheduleTechnician: document.getElementById("scheduleTechnician"),
        scheduleNotes: document.getElementById("scheduleNotes"),

        scheduleDetailsModal: document.getElementById("scheduleDetailsModal"),
        closeScheduleDetails: document.getElementById("closeScheduleDetails"),
        closeScheduleDetailsBtn: document.getElementById("closeScheduleDetailsBtn"),

        detailScheduleId: document.getElementById("detailScheduleId"),
        detailScheduleRequestId: document.getElementById("detailScheduleRequestId"),
        detailSchedulePatient: document.getElementById("detailSchedulePatient"),
        detailScheduleExamination: document.getElementById("detailScheduleExamination"),
        detailScheduleDate: document.getElementById("detailScheduleDate"),
        detailScheduleTime: document.getElementById("detailScheduleTime"),
        detailScheduleRoom: document.getElementById("detailScheduleRoom"),
        detailScheduleTechnician: document.getElementById("detailScheduleTechnician"),
        detailScheduleStatus: document.getElementById("detailScheduleStatus"),
        detailScheduleNotes: document.getElementById("detailScheduleNotes"),

        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        logoutButton: document.getElementById("logoutBtn")
    };

    let requests = [];
    let schedules = [];

    let selectedRequestKey = null;
    let selectedScheduleId = null;

    /* =====================================
       AUTHENTICATION
    ===================================== */

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

    /* =====================================
       GENERAL HELPERS
    ===================================== */

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

    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
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

    function formatDate(dateValue) {
        if (!dateValue) return "N/A";

        // Date-only values are parsed locally to avoid UTC date shifts.
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue))
            ? (() => {
                const [year, month, day] = dateValue.split("-").map(Number);
                return new Date(year, month - 1, day);
            })()
            : new Date(dateValue);

        if (Number.isNaN(date.getTime())) return String(dateValue);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function normalizeStatus(status) {
        return String(status || "").trim().toLowerCase();
    }

    function getRequestKey(request) {
        return String(request.requestId || request.id || "");
    }

    function getPatientName(record) {
        return record.patientName ||
            record.patient?.name ||
            "Unknown Patient";
    }

    function getPatientId(record) {
        return record.patientId ||
            record.patient?.id ||
            "N/A";
    }

    function getDoctorName(record) {
        return record.doctorName ||
            record.doctor?.name ||
            "N/A";
    }

    function getExamination(record) {
        return record.examination ||
            record.examinationType ||
            record.scanName ||
            record.testName ||
            (Array.isArray(record.examinations)
                ? record.examinations.join(", ")
                : "") ||
            "Not specified";
    }

    function getPriority(record) {
        return String(record.priority || "Routine").toLowerCase();
    }

    function getScheduleId(schedule) {
        return String(schedule.scheduleId || schedule.id || "");
    }

    function getScheduleStatus(schedule) {
        return normalizeStatus(schedule.status || "Scheduled");
    }

    function showFormMessage(message, type = "") {
        if (!elements.scheduleFormMessage) return;

        elements.scheduleFormMessage.textContent = message;
        elements.scheduleFormMessage.className =
            `schedule-form-message ${type}`;
    }

    /* =====================================
       LOCAL STORAGE
    ===================================== */

    function readStorage(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Error reading ${key}:`, error);
            return [];
        }
    }

    function loadStorageData() {
        requests = readStorage(REQUESTS_KEY);
        schedules = readStorage(SCHEDULES_KEY);
    }

    function saveRequests() {
        localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    }

    function saveSchedules() {
        localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    }

    function notifyRadiologyUpdates() {
        window.dispatchEvent(
            new CustomEvent("semasacare:radiologyRequestsUpdated")
        );

        window.dispatchEvent(
            new CustomEvent("semasacare:radiologySchedulesUpdated")
        );
    }

    /* =====================================
       DATE VALIDATION
    ===================================== */

    function setMinimumScheduleDate() {
        if (!elements.scheduleDate) return;

        elements.scheduleDate.min = getLocalDateString();
    }

    /* =====================================
       PRIORITY HELPERS
    ===================================== */

    function getPriorityClass(priority) {
        const classes = {
            routine: "priority-routine",
            normal: "priority-normal",
            high: "priority-high",
            urgent: "priority-urgent",
            critical: "priority-critical",
            emergency: "priority-emergency"
        };

        return classes[priority] || "priority-routine";
    }

    /* =====================================
       STATISTICS
    ===================================== */

    function updateStatistics() {
        const today = getLocalDateString();

        const awaiting = requests.filter(request =>
            normalizeStatus(request.status) === "accepted"
        ).length;

        const scheduledToday = schedules.filter(schedule =>
            schedule.scheduleDate === today &&
            getScheduleStatus(schedule) === "scheduled"
        ).length;

        const upcoming = schedules.filter(schedule =>
            schedule.scheduleDate >= today &&
            getScheduleStatus(schedule) === "scheduled"
        ).length;

        const completed = schedules.filter(schedule =>
            getScheduleStatus(schedule) === "completed"
        ).length;

        if (elements.awaitingSchedulingCount) {
            elements.awaitingSchedulingCount.textContent = awaiting;
        }

        if (elements.scheduledTodayCount) {
            elements.scheduledTodayCount.textContent = scheduledToday;
        }

        if (elements.upcomingAppointmentsCount) {
            elements.upcomingAppointmentsCount.textContent = upcoming;
        }

        if (elements.completedSchedulesCount) {
            elements.completedSchedulesCount.textContent = completed;
        }
    }

    /* =====================================
       ACCEPTED REQUESTS
    ===================================== */

    function getAcceptedRequests() {
        return requests.filter(request =>
            normalizeStatus(request.status) === "accepted"
        );
    }

    function getFilteredAcceptedRequests() {
        const searchText = (
            elements.acceptedSearch?.value || ""
        ).trim().toLowerCase();

        const selectedPriority = (
            elements.acceptedPriorityFilter?.value || "all"
        ).toLowerCase();

        return getAcceptedRequests().filter(request => {
            const searchableText = [
                getRequestKey(request),
                getPatientName(request),
                getPatientId(request),
                getDoctorName(request),
                getExamination(request)
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchText || searchableText.includes(searchText);

            const matchesPriority =
                selectedPriority === "all" ||
                getPriority(request) === selectedPriority;

            return matchesSearch && matchesPriority;
        });
    }

    function renderAcceptedRequests() {
        if (!elements.acceptedRequestsBody) return;

        const filtered = getFilteredAcceptedRequests();

        if (filtered.length === 0) {
            elements.acceptedRequestsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        No accepted imaging requests awaiting scheduling.
                    </td>
                </tr>
            `;

            if (elements.acceptedRequestsNote) {
                elements.acceptedRequestsNote.textContent =
                    "Accept an imaging request from the Imaging Requests page to schedule it here.";
            }

            return;
        }

        filtered.sort((a, b) =>
            new Date(b.acceptedAt || b.requestDate || 0) -
            new Date(a.acceptedAt || a.requestDate || 0)
        );

        elements.acceptedRequestsBody.innerHTML = filtered.map(request => {
            const requestKey = getRequestKey(request);

            return `
                <tr>
                    <td><strong>${escapeHTML(requestKey)}</strong></td>

                    <td>
                        <strong>${escapeHTML(getPatientName(request))}</strong>
                        <br>
                        <small>ID: ${escapeHTML(getPatientId(request))}</small>
                    </td>

                    <td>${escapeHTML(getExamination(request))}</td>

                    <td>${escapeHTML(getDoctorName(request))}</td>

                    <td>
                        <span class="priority-badge ${getPriorityClass(getPriority(request))}">
                            ${escapeHTML(getPriority(request).toUpperCase())}
                        </span>
                    </td>

                    <td>${escapeHTML(formatDate(
                request.acceptedAt || request.requestDate || request.createdAt
            ))}</td>

                    <td>
                        <button
                            type="button"
                            class="schedule-action-btn primary"
                            data-action="schedule"
                            data-request-key="${escapeHTML(requestKey)}">
                            <i class="fas fa-calendar-plus"></i>
                            Schedule
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        if (elements.acceptedRequestsNote) {
            elements.acceptedRequestsNote.textContent =
                `${filtered.length} accepted request(s) available for scheduling.`;
        }
    }

    /* =====================================
       OPEN SCHEDULE MODAL
    ===================================== */

    function openScheduleModal(requestKey) {
        const request = requests.find(item =>
            getRequestKey(item) === String(requestKey)
        );

        if (!request || !elements.scheduleModal) return;

        if (normalizeStatus(request.status) !== "accepted") {
            alert("This request is no longer available for scheduling.");
            refreshPage();
            return;
        }

        selectedRequestKey = String(requestKey);

        elements.scheduleForm?.reset();

        if (elements.scheduleRequestKey) {
            elements.scheduleRequestKey.value = selectedRequestKey;
        }

        if (elements.scheduleRequestId) {
            elements.scheduleRequestId.textContent = getRequestKey(request);
        }

        if (elements.schedulePatientName) {
            elements.schedulePatientName.textContent =
                `${getPatientName(request)} (${getPatientId(request)})`;
        }

        if (elements.scheduleExamination) {
            elements.scheduleExamination.textContent = getExamination(request);
        }

        if (elements.schedulePriority) {
            elements.schedulePriority.textContent =
                getPriority(request).toUpperCase();
        }

        setMinimumScheduleDate();
        showFormMessage("");

        elements.scheduleModal.classList.add("active");
        elements.scheduleModal.setAttribute("aria-hidden", "false");
    }

    function closeScheduleModal() {
        elements.scheduleModal?.classList.remove("active");
        elements.scheduleModal?.setAttribute("aria-hidden", "true");

        selectedRequestKey = null;
        elements.scheduleForm?.reset();
        showFormMessage("");
    }

    /* =====================================
       CHECK SCHEDULE CONFLICTS
    ===================================== */

    function hasScheduleConflict(date, time, room, technician) {
        return schedules.some(schedule => {
            const status = getScheduleStatus(schedule);

            if (["cancelled", "completed"].includes(status)) {
                return false;
            }

            if (
                schedule.scheduleDate !== date ||
                schedule.scheduleTime !== time
            ) {
                return false;
            }

            const sameRoom =
                String(schedule.room || "").toLowerCase() ===
                room.toLowerCase();

            const sameTechnician =
                String(schedule.technician || "").trim().toLowerCase() ===
                technician.trim().toLowerCase();

            return sameRoom || sameTechnician;
        });
    }

    /* =====================================
       CREATE SCHEDULE
    ===================================== */

    function createSchedule(event) {
        event.preventDefault();

        if (!selectedRequestKey) return;

        const request = requests.find(item =>
            getRequestKey(item) === selectedRequestKey
        );

        if (!request || normalizeStatus(request.status) !== "accepted") {
            showFormMessage(
                "This request is no longer available. Please refresh.",
                "error"
            );
            return;
        }

        const date = elements.scheduleDate.value;
        const time = elements.scheduleTime.value;
        const room = elements.scheduleRoom.value;
        const technician = elements.scheduleTechnician.value.trim();
        const notes = elements.scheduleNotes.value.trim();

        if (!date || !time || !room || !technician) {
            showFormMessage("Please complete all required fields.", "error");
            return;
        }

        if (date < getLocalDateString()) {
            showFormMessage(
                "You cannot schedule an appointment in the past.",
                "error"
            );
            return;
        }

        const alreadyScheduled = schedules.some(schedule =>
            String(schedule.requestId) === selectedRequestKey &&
            !["cancelled"].includes(getScheduleStatus(schedule))
        );

        if (alreadyScheduled) {
            showFormMessage(
                "This request already has an appointment.",
                "error"
            );
            return;
        }

        if (hasScheduleConflict(date, time, room, technician)) {
            showFormMessage(
                "This room or technician already has an appointment at that date and time.",
                "error"
            );
            return;
        }

        const scheduleId =
            "RAD-SCH-" + Date.now();

        const scheduleRecord = {
            id: scheduleId,
            scheduleId: scheduleId,

            requestId: getRequestKey(request),

            patientId: request.patientId || request.patient?.id || "",
            patientName: getPatientName(request),
            patientEmail: request.patientEmail || "",
            patientPhone: request.patientPhone || "",

            doctorId: request.doctorId || "",
            doctorEmail: request.doctorEmail || "",
            doctorName: getDoctorName(request),

            examination: getExamination(request),
            priority: request.priority || "Routine",
            clinicalNotes: request.clinicalNotes || request.notes || "",

            scheduleDate: date,
            scheduleTime: time,
            room: room,
            technician: technician,
            notes: notes,

            status: "Scheduled",

            scheduledAt: new Date().toISOString(),
            scheduledBy: currentUser.name || currentUser.email
        };

        schedules.push(scheduleRecord);

        request.status = "Scheduled";
        request.scheduledAt = scheduleRecord.scheduledAt;
        request.scheduleId = scheduleId;

        saveSchedules();
        saveRequests();

        notifyRadiologyUpdates();

        closeScheduleModal();
        refreshPage();

        alert("Imaging appointment scheduled successfully.");
    }

    /* =====================================
       SCHEDULE FILTERS
    ===================================== */

    function getFilteredSchedules() {
        const searchText = (
            elements.scheduleSearch?.value || ""
        ).trim().toLowerCase();

        const selectedStatus = (
            elements.scheduleStatusFilter?.value || "all"
        ).toLowerCase();

        return schedules.filter(schedule => {
            const searchableText = [
                getScheduleId(schedule),
                schedule.requestId,
                getPatientName(schedule),
                getPatientId(schedule),
                getExamination(schedule),
                schedule.room,
                schedule.technician
            ].join(" ").toLowerCase();

            const status = getScheduleStatus(schedule);

            const matchesSearch =
                !searchText || searchableText.includes(searchText);

            const matchesStatus =
                selectedStatus === "all" || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });
    }

    /* =====================================
       RENDER SCHEDULES
    ===================================== */

    function renderSchedules() {
        if (!elements.upcomingSchedulesBody) return;

        const filtered = getFilteredSchedules();

        filtered.sort((a, b) => {
            const dateA = `${a.scheduleDate || ""} ${a.scheduleTime || ""}`;
            const dateB = `${b.scheduleDate || ""} ${b.scheduleTime || ""}`;

            return dateA.localeCompare(dateB);
        });

        if (elements.scheduleCount) {
            elements.scheduleCount.textContent =
                `${filtered.length} appointment(s)`;
        }

        if (filtered.length === 0) {
            elements.upcomingSchedulesBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        No imaging appointments found.
                    </td>
                </tr>
            `;

            if (elements.upcomingSchedulesNote) {
                elements.upcomingSchedulesNote.textContent =
                    "Confirmed appointments will appear here.";
            }

            return;
        }

        elements.upcomingSchedulesBody.innerHTML = filtered.map(schedule => {
            const status = getScheduleStatus(schedule);

            const statusClass = {
                scheduled: "scheduled",
                "in progress": "in-progress",
                completed: "completed",
                cancelled: "cancelled"
            }[status] || "scheduled";

            return `
                <tr>
                    <td><strong>${escapeHTML(getScheduleId(schedule))}</strong></td>

                    <td>
                        <strong>${escapeHTML(getPatientName(schedule))}</strong>
                        <br>
                        <small>ID: ${escapeHTML(getPatientId(schedule))}</small>
                    </td>

                    <td>${escapeHTML(getExamination(schedule))}</td>

                    <td>${escapeHTML(formatDate(schedule.scheduleDate))}</td>

                    <td>${escapeHTML(schedule.scheduleTime || "N/A")}</td>

                    <td>${escapeHTML(schedule.room || "N/A")}</td>

                    <td>
                        <span class="schedule-status-badge ${statusClass}">
                            ${escapeHTML(status.replace(/\b\w/g, letter => letter.toUpperCase()))}
                        </span>
                    </td>

                    <td>
                        <div class="schedule-table-actions">
                            <button
                                type="button"
                                class="schedule-action-btn"
                                data-action="view-schedule"
                                data-schedule-id="${escapeHTML(getScheduleId(schedule))}">
                                <i class="fas fa-eye"></i>
                                View
                            </button>

                            ${status === "scheduled" ? `
                                <button
                                    type="button"
                                    class="schedule-action-btn"
                                    data-action="cancel-schedule"
                                    data-schedule-id="${escapeHTML(getScheduleId(schedule))}">
                                    <i class="fas fa-times"></i>
                                    Cancel
                                </button>
                            ` : ""}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        if (elements.upcomingSchedulesNote) {
            elements.upcomingSchedulesNote.textContent =
                `${filtered.length} appointment(s) displayed.`;
        }
    }

    /* =====================================
       VIEW SCHEDULE DETAILS
    ===================================== */

    function openScheduleDetails(scheduleId) {
        const schedule = schedules.find(item =>
            getScheduleId(item) === String(scheduleId)
        );

        if (!schedule || !elements.scheduleDetailsModal) return;

        selectedScheduleId = String(scheduleId);

        const details = {
            detailScheduleId: getScheduleId(schedule),
            detailScheduleRequestId: schedule.requestId || "N/A",
            detailSchedulePatient: getPatientName(schedule),
            detailScheduleExamination: getExamination(schedule),
            detailScheduleDate: formatDate(schedule.scheduleDate),
            detailScheduleTime: schedule.scheduleTime || "N/A",
            detailScheduleRoom: schedule.room || "N/A",
            detailScheduleTechnician: schedule.technician || "N/A",
            detailScheduleStatus: schedule.status || "Scheduled",
            detailScheduleNotes: schedule.notes || "No notes available."
        };

        Object.entries(details).forEach(([key, value]) => {
            if (elements[key]) {
                elements[key].textContent = value;
            }
        });

        elements.scheduleDetailsModal.classList.add("active");
        elements.scheduleDetailsModal.setAttribute("aria-hidden", "false");
    }

    function closeScheduleDetails() {
        elements.scheduleDetailsModal?.classList.remove("active");
        elements.scheduleDetailsModal?.setAttribute("aria-hidden", "true");
        selectedScheduleId = null;
    }

    /* =====================================
       CANCEL SCHEDULE
    ===================================== */

    function cancelSchedule(scheduleId) {
        const schedule = schedules.find(item =>
            getScheduleId(item) === String(scheduleId)
        );

        if (!schedule || getScheduleStatus(schedule) !== "scheduled") {
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to cancel this imaging appointment?"
        );

        if (!confirmed) return;

        schedule.status = "Cancelled";
        schedule.cancelledAt = new Date().toISOString();
        schedule.cancelledBy = currentUser.name || currentUser.email;

        const request = requests.find(item =>
            getRequestKey(item) === String(schedule.requestId)
        );

        if (request && normalizeStatus(request.status) === "scheduled") {
            request.status = "Accepted";
            delete request.scheduledAt;
            delete request.scheduleId;
        }

        saveSchedules();
        saveRequests();

        notifyRadiologyUpdates();
        refreshPage();

        alert("Appointment cancelled. The request is available for rescheduling.");
    }

    /* =====================================
       REFRESH PAGE DATA
    ===================================== */

    function refreshPage() {
        loadStorageData();
        updateStatistics();
        renderAcceptedRequests();
        renderSchedules();
    }

    /* =====================================
       EVENT LISTENERS
    ===================================== */

    elements.acceptedRequestsBody?.addEventListener("click", event => {
        const button = event.target.closest("[data-action='schedule']");

        if (!button) return;

        openScheduleModal(button.dataset.requestKey);
    });

    elements.upcomingSchedulesBody?.addEventListener("click", event => {
        const viewButton = event.target.closest("[data-action='view-schedule']");
        const cancelButton = event.target.closest("[data-action='cancel-schedule']");

        if (viewButton) {
            openScheduleDetails(viewButton.dataset.scheduleId);
        }

        if (cancelButton) {
            cancelSchedule(cancelButton.dataset.scheduleId);
        }
    });

    elements.acceptedSearch?.addEventListener("input", renderAcceptedRequests);
    elements.acceptedPriorityFilter?.addEventListener("change", renderAcceptedRequests);

    elements.scheduleSearch?.addEventListener("input", renderSchedules);
    elements.scheduleStatusFilter?.addEventListener("change", renderSchedules);

    elements.refreshAcceptedRequests?.addEventListener("click", refreshPage);

    elements.scheduleForm?.addEventListener("submit", createSchedule);

    elements.closeScheduleModal?.addEventListener("click", closeScheduleModal);
    elements.cancelSchedule?.addEventListener("click", closeScheduleModal);

    elements.closeScheduleDetails?.addEventListener("click", closeScheduleDetails);
    elements.closeScheduleDetailsBtn?.addEventListener("click", closeScheduleDetails);

    elements.scheduleModal?.addEventListener("click", event => {
        if (event.target === elements.scheduleModal) {
            closeScheduleModal();
        }
    });

    elements.scheduleDetailsModal?.addEventListener("click", event => {
        if (event.target === elements.scheduleDetailsModal) {
            closeScheduleDetails();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeScheduleModal();
            closeScheduleDetails();
        }
    });

    /* =====================================
       SIDEBAR
    ===================================== */

    elements.menuToggle?.addEventListener("click", () => {
        elements.sidebar?.classList.toggle("active");
    });

    elements.sidebar?.querySelectorAll(".menu-item").forEach(link => {
        link.addEventListener("click", () => {
            elements.sidebar?.classList.remove("active");
        });
    });

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

    /* =====================================
       CROSS-TAB SYNCHRONIZATION
    ===================================== */

    window.addEventListener("storage", event => {
        if (
            event.key === REQUESTS_KEY ||
            event.key === SCHEDULES_KEY
        ) {
            refreshPage();
        }
    });

    window.addEventListener(
        "semasacare:radiologyRequestsUpdated",
        refreshPage
    );

    window.addEventListener(
        "semasacare:radiologySchedulesUpdated",
        refreshPage
    );

    /* =====================================
       INITIALIZE
    ===================================== */

    function initializeSchedulingPage() {
        displayDashboardDate();
        setMinimumScheduleDate();
        refreshPage();
    }

    initializeSchedulingPage();

});
