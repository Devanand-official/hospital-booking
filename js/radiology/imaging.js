
/* ==========================================
   SEMASACARE - RADIOLOGY IMAGING
   File: js/radiology/imaging.js
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const SCHEDULES_KEY = "semasacareRadiologySchedules";
    const IMAGES_KEY = "semasacareRadiologyImages";

    /* -------------------------------------
       ELEMENTS
    ------------------------------------- */

    const elements = {
        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        logoutBtn: document.getElementById("logoutBtn"),

        radiologyName: document.getElementById("radiologyName"),
        headerName: document.getElementById("headerName"),
        dashboardDate: document.getElementById("dashboardDate"),

        scheduledCount: document.getElementById("scheduledImagingCount"),
        progressCount: document.getElementById("inProgressImagingCount"),
        completedTodayCount: document.getElementById("completedTodayCount"),
        totalCount: document.getElementById("totalImagingCount"),

        search: document.getElementById("imagingSearch"),
        statusFilter: document.getElementById("imagingStatusFilter"),
        refreshBtn: document.getElementById("refreshImaging"),

        queueBody: document.getElementById("imagingQueueBody"),
        recentBody: document.getElementById("recentImagingBody"),
        queueNote: document.getElementById("imagingQueueNote"),

        procedureModal: document.getElementById("imagingModal"),
        procedureForm: document.getElementById("imagingForm"),
        closeProcedureModal: document.getElementById("closeImagingModal"),
        cancelProcedure: document.getElementById("cancelImaging"),

        detailsModal: document.getElementById("imagingDetailsModal"),
        closeDetailsModal: document.getElementById("closeImagingDetails"),
        closeDetailsButton: document.getElementById("closeImagingDetailsBtn"),

        scheduleIdInput: document.getElementById("imagingScheduleId"),
        procedureStatus: document.getElementById("procedureStatus"),
        procedureTechnician: document.getElementById("procedureTechnician"),
        procedureNotes: document.getElementById("procedureNotes"),
        formMessage: document.getElementById("imagingFormMessage")
    };

    let currentUser = null;
    let selectedScheduleId = null;

    /* -------------------------------------
       AUTHENTICATION
    ------------------------------------- */

    if (typeof SemasaAuth === "undefined") {
        window.location.href = "../login.html";
        return;
    }

    currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "radiology") {
        window.location.href = "../login.html";
        return;
    }

    const technicianName =
        currentUser.name || "Radiology Technician";

    if (elements.radiologyName) {
        elements.radiologyName.textContent = technicianName;
    }

    if (elements.headerName) {
        elements.headerName.textContent = technicianName;
    }

    /* -------------------------------------
       STORAGE HELPERS
    ------------------------------------- */

    function getStorageData(key) {
        try {
            const data = JSON.parse(
                localStorage.getItem(key) || "[]"
            );

            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return [];
        }
    }

    function saveStorageData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getSchedules() {
        return getStorageData(SCHEDULES_KEY);
    }

    function getImages() {
        return getStorageData(IMAGES_KEY);
    }

    function saveSchedules(schedules) {
        saveStorageData(SCHEDULES_KEY, schedules);

        window.dispatchEvent(
            new CustomEvent("semasacare:radiologySchedulesUpdated")
        );
    }

    function saveImages(images) {
        saveStorageData(IMAGES_KEY, images);

        window.dispatchEvent(
            new CustomEvent("semasacare:radiologyImagesUpdated")
        );
    }

    /* -------------------------------------
       GENERAL HELPERS
    ------------------------------------- */

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function getScheduleId(schedule) {
        return String(schedule.id ?? schedule.scheduleId ?? "");
    }

    function getStatus(schedule) {
        return String(schedule.status || "Scheduled").trim();
    }

    function getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(`${dateValue}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(dateValue);
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function displayDashboardDate() {
        const dateElement =
            elements.dashboardDate?.querySelector("span");

        if (!dateElement) return;

        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function getStatusClass(status) {
        const normalized = status.toLowerCase();

        if (normalized === "completed") return "completed";
        if (normalized === "in progress") return "progress";
        if (normalized === "cancelled") return "cancelled";

        return "scheduled";
    }

    function getStatusBadge(status) {
        return `
            <span class="imaging-status-badge ${getStatusClass(status)}">
                ${escapeHTML(status)}
            </span>
        `;
    }

    /* -------------------------------------
       STATISTICS
    ------------------------------------- */

    function updateStatistics() {
        const schedules = getSchedules();
        const images = getImages();

        const today = getLocalDateString();

        const scheduled = schedules.filter(schedule =>
            getStatus(schedule).toLowerCase() === "scheduled"
        );

        const inProgress = schedules.filter(schedule =>
            getStatus(schedule).toLowerCase() === "in progress"
        );

        const completedToday = schedules.filter(schedule => {
            return (
                getStatus(schedule).toLowerCase() === "completed" &&
                String(schedule.imagingCompletedAt || "").slice(0, 10) === today
            );
        });

        if (elements.scheduledCount) {
            elements.scheduledCount.textContent = scheduled.length;
        }

        if (elements.progressCount) {
            elements.progressCount.textContent = inProgress.length;
        }

        if (elements.completedTodayCount) {
            elements.completedTodayCount.textContent = completedToday.length;
        }

        if (elements.totalCount) {
            elements.totalCount.textContent = images.length;
        }
    }

    /* -------------------------------------
       IMAGING QUEUE
    ------------------------------------- */

    function displayImagingQueue() {
        const schedules = getSchedules();

        const searchValue =
            elements.search.value.trim().toLowerCase();

        const selectedStatus =
            elements.statusFilter.value.toLowerCase();

        const filteredSchedules = schedules.filter(schedule => {
            const status = getStatus(schedule).toLowerCase();

            // Cancelled schedules are not available for imaging.
            if (status === "cancelled") return false;

            const searchContent = [
                schedule.scheduleId,
                schedule.id,
                schedule.patientName,
                schedule.patientId,
                schedule.examination,
                schedule.requestId
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchValue || searchContent.includes(searchValue);

            const matchesStatus =
                selectedStatus === "all" || status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        filteredSchedules.sort((a, b) => {
            const dateA =
                `${a.scheduleDate || ""} ${a.scheduleTime || ""}`;

            const dateB =
                `${b.scheduleDate || ""} ${b.scheduleTime || ""}`;

            return dateA.localeCompare(dateB);
        });

        if (!filteredSchedules.length) {
            elements.queueBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        No imaging procedures found.
                    </td>
                </tr>
            `;

            elements.queueNote.textContent =
                "No matching imaging procedures available.";

            return;
        }

        elements.queueBody.innerHTML = filteredSchedules.map(schedule => {
            const id = getScheduleId(schedule);
            const status = getStatus(schedule);
            const normalizedStatus = status.toLowerCase();

            let actionButton = "";

            if (normalizedStatus === "completed") {
                actionButton = `
                    <button type="button"
                        class="imaging-action-btn imaging-view-btn"
                        data-action="view"
                        data-id="${escapeHTML(id)}">
                        <i class="fas fa-eye"></i> View
                    </button>
                `;
            } else {
                actionButton = `
                    <button type="button"
                        class="imaging-action-btn"
                        data-action="edit"
                        data-id="${escapeHTML(id)}">
                        <i class="fas fa-x-ray"></i>
                        ${normalizedStatus === "in progress" ? "Continue" : "Start"}
                    </button>
                `;
            }

            return `
                <tr>
                    <td class="radiology-primary-cell">
                        ${escapeHTML(schedule.scheduleId || schedule.id || "—")}
                    </td>

                    <td>${escapeHTML(schedule.patientName || "—")}</td>

                    <td>${escapeHTML(schedule.examination || "—")}</td>

                    <td>${formatDate(schedule.scheduleDate)}</td>

                    <td>${escapeHTML(schedule.scheduleTime || "—")}</td>

                    <td>${escapeHTML(schedule.room || "—")}</td>

                    <td>${getStatusBadge(status)}</td>

                    <td>${actionButton}</td>
                </tr>
            `;
        }).join("");

        elements.queueNote.textContent =
            `Showing ${filteredSchedules.length} imaging procedure(s).`;
    }

    /* -------------------------------------
       RECENT PROCEDURES
    ------------------------------------- */

    function displayRecentProcedures() {
        const completedImages = getImages()
            .filter(image =>
                String(image.status).toLowerCase() === "completed"
            )
            .sort((a, b) => {
                return new Date(b.completedAt || 0) -
                    new Date(a.completedAt || 0);
            })
            .slice(0, 10);

        if (!completedImages.length) {
            elements.recentBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        No completed imaging procedures available.
                    </td>
                </tr>
            `;
            return;
        }

        elements.recentBody.innerHTML = completedImages.map(image => `
            <tr>
                <td class="radiology-primary-cell">
                    ${escapeHTML(image.scheduleId || "—")}
                </td>

                <td>${escapeHTML(image.patientName || "—")}</td>

                <td>${escapeHTML(image.examination || "—")}</td>

                <td>${escapeHTML(image.technician || "—")}</td>

                <td>${formatDateTime(image.completedAt)}</td>

                <td>
                    <button type="button"
                        class="imaging-action-btn imaging-view-btn"
                        data-action="view"
                        data-id="${escapeHTML(image.scheduleId || image.id)}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join("");
    }

    /* -------------------------------------
       LOAD PAGE
    ------------------------------------- */

    function loadImagingPage() {
        updateStatistics();
        displayImagingQueue();
        displayRecentProcedures();
    }

    /* -------------------------------------
       OPEN PROCEDURE MODAL
    ------------------------------------- */

    function openProcedureModal(scheduleId) {
        const schedule = getSchedules().find(item =>
            getScheduleId(item) === String(scheduleId)
        );

        if (!schedule) {
            alert("Imaging schedule not found.");
            return;
        }

        const status = getStatus(schedule).toLowerCase();

        if (status === "cancelled" || status === "completed") {
            alert("This procedure cannot be edited.");
            return;
        }

        selectedScheduleId = String(scheduleId);

        const existingImage = getImages().find(image =>
            String(image.scheduleId) === String(schedule.scheduleId || schedule.id)
        );

        document.getElementById("imagingModalTitle").textContent =
            status === "in progress"
                ? "Continue Imaging Procedure"
                : "Start Imaging Procedure";

        document.getElementById("modalScheduleId").textContent =
            schedule.scheduleId || schedule.id || "—";

        document.getElementById("modalPatientName").textContent =
            schedule.patientName || "—";

        document.getElementById("modalPatientId").textContent =
            schedule.patientId || "—";

        document.getElementById("modalExamination").textContent =
            schedule.examination || "—";

        document.getElementById("modalAppointmentDate").textContent =
            formatDate(schedule.scheduleDate);

        document.getElementById("modalAppointmentTime").textContent =
            schedule.scheduleTime || "—";

        document.getElementById("modalRoom").textContent =
            schedule.room || "—";

        document.getElementById("modalTechnician").textContent =
            schedule.technician || "—";

        elements.scheduleIdInput.value = selectedScheduleId;

        elements.procedureStatus.value =
            status === "in progress" ? "In Progress" : "In Progress";

        elements.procedureTechnician.value =
            schedule.procedureTechnician ||
            schedule.technician ||
            technicianName;

        elements.procedureNotes.value =
            existingImage?.procedureNotes || "";

        elements.formMessage.textContent = "";

        elements.procedureModal.classList.add("show");
    }

    /* -------------------------------------
       CLOSE PROCEDURE MODAL
    ------------------------------------- */

    function closeProcedureModal() {
        elements.procedureModal.classList.remove("show");
        elements.procedureForm.reset();

        selectedScheduleId = null;
    }

    /* -------------------------------------
       SAVE PROCEDURE
    ------------------------------------- */

    function saveProcedure(event) {
        event.preventDefault();

        const scheduleId = elements.scheduleIdInput.value;
        const procedureStatus = elements.procedureStatus.value;
        const technician = elements.procedureTechnician.value.trim();
        const notes = elements.procedureNotes.value.trim();

        elements.formMessage.textContent = "";

        if (!scheduleId || !technician) {
            elements.formMessage.textContent =
                "Please complete all required fields.";
            return;
        }

        const schedules = getSchedules();

        const scheduleIndex = schedules.findIndex(schedule =>
            getScheduleId(schedule) === String(scheduleId)
        );

        if (scheduleIndex === -1) {
            elements.formMessage.textContent =
                "Schedule not found. Please refresh and try again.";
            return;
        }

        const schedule = schedules[scheduleIndex];

        if (getStatus(schedule).toLowerCase() === "cancelled") {
            elements.formMessage.textContent =
                "Cancelled appointments cannot be processed.";
            return;
        }

        if (getStatus(schedule).toLowerCase() === "completed") {
            elements.formMessage.textContent =
                "This procedure has already been completed.";
            return;
        }

        const now = new Date().toISOString();

        // Update the existing schedule.
        schedule.status = procedureStatus;
        schedule.procedureTechnician = technician;
        schedule.procedureNotes = notes;

        if (!schedule.imagingStartedAt) {
            schedule.imagingStartedAt = now;
            schedule.imagingStartedBy = technicianName;
        }

        if (procedureStatus === "Completed") {
            schedule.imagingCompletedAt = now;
            schedule.imagingCompletedBy = technicianName;
        }

        schedules[scheduleIndex] = schedule;

        saveSchedules(schedules);

        // Maintain one imaging record for each schedule.
        const images = getImages();

        const scheduleReference =
            String(schedule.scheduleId || schedule.id);

        const existingIndex = images.findIndex(image =>
            String(image.scheduleId) === scheduleReference
        );

        const imageRecord = {
            ...(existingIndex >= 0 ? images[existingIndex] : {}),

            id: existingIndex >= 0
                ? images[existingIndex].id
                : `IMG-${Date.now()}`,

            scheduleId: scheduleReference,
            requestId: schedule.requestId || "",

            patientId: schedule.patientId || "",
            patientName: schedule.patientName || "",
            patientEmail: schedule.patientEmail || "",
            patientPhone: schedule.patientPhone || "",

            doctorId: schedule.doctorId || "",
            doctorEmail: schedule.doctorEmail || "",
            doctorName: schedule.doctorName || "",

            examination: schedule.examination || "",
            priority: schedule.priority || "Normal",

            scheduleDate: schedule.scheduleDate || "",
            scheduleTime: schedule.scheduleTime || "",
            room: schedule.room || "",

            technician: technician,
            procedureNotes: notes,

            status: procedureStatus,

            startedAt: schedule.imagingStartedAt,
            startedBy: schedule.imagingStartedBy,

            updatedAt: now
        };

        if (procedureStatus === "Completed") {
            imageRecord.completedAt = now;
            imageRecord.completedBy = technicianName;
        }

        if (existingIndex >= 0) {
            images[existingIndex] = imageRecord;
        } else {
            images.push(imageRecord);
        }

        saveImages(images);

        closeProcedureModal();
        loadImagingPage();
    }

    /* -------------------------------------
       VIEW PROCEDURE DETAILS
    ------------------------------------- */

    function openDetailsModal(scheduleId) {
        const image = getImages().find(item =>
            String(item.scheduleId) === String(scheduleId) ||
            String(item.id) === String(scheduleId)
        );

        if (!image) {
            alert("Procedure details not found.");
            return;
        }

        document.getElementById("detailImagingScheduleId").textContent =
            image.scheduleId || "—";

        document.getElementById("detailImagingPatient").textContent =
            image.patientName || "—";

        document.getElementById("detailImagingExamination").textContent =
            image.examination || "—";

        document.getElementById("detailImagingTechnician").textContent =
            image.technician || "—";

        document.getElementById("detailImagingCompletedAt").textContent =
            formatDateTime(image.completedAt);

        document.getElementById("detailImagingNotes").textContent =
            image.procedureNotes || "No procedure notes recorded.";

        elements.detailsModal.classList.add("show");
    }

    function closeDetailsModal() {
        elements.detailsModal.classList.remove("show");
    }

    /* -------------------------------------
       QUEUE ACTION EVENTS
    ------------------------------------- */

    elements.queueBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "edit") {
            openProcedureModal(id);
        }

        if (action === "view") {
            openDetailsModal(id);
        }
    });

    elements.recentBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        openDetailsModal(button.dataset.id);
    });

    /* -------------------------------------
       SEARCH AND FILTER
    ------------------------------------- */

    elements.search.addEventListener("input", displayImagingQueue);

    elements.statusFilter.addEventListener(
        "change",
        displayImagingQueue
    );

    elements.refreshBtn.addEventListener(
        "click",
        loadImagingPage
    );

    /* -------------------------------------
       MODAL EVENTS
    ------------------------------------- */

    elements.procedureForm.addEventListener(
        "submit",
        saveProcedure
    );

    elements.closeProcedureModal.addEventListener(
        "click",
        closeProcedureModal
    );

    elements.cancelProcedure.addEventListener(
        "click",
        closeProcedureModal
    );

    elements.closeDetailsModal.addEventListener(
        "click",
        closeDetailsModal
    );

    elements.closeDetailsButton.addEventListener(
        "click",
        closeDetailsModal
    );

    elements.procedureModal.addEventListener("click", event => {
        if (event.target === elements.procedureModal) {
            closeProcedureModal();
        }
    });

    elements.detailsModal.addEventListener("click", event => {
        if (event.target === elements.detailsModal) {
            closeDetailsModal();
        }
    });

    /* -------------------------------------
       SIDEBAR MENU
    ------------------------------------- */

    if (elements.menuToggle && elements.sidebar) {
        elements.menuToggle.addEventListener("click", () => {
            elements.sidebar.classList.toggle("active");
        });
    }

    if (elements.sidebar) {
        elements.sidebar.querySelectorAll(".menu-item").forEach(link => {
            link.addEventListener("click", () => {
                elements.sidebar.classList.remove("active");
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

    /* -------------------------------------
       STORAGE SYNCHRONIZATION
    ------------------------------------- */

    window.addEventListener("storage", event => {
        if (
            event.key === SCHEDULES_KEY ||
            event.key === IMAGES_KEY
        ) {
            loadImagingPage();
        }
    });

    window.addEventListener(
        "semasacare:radiologySchedulesUpdated",
        loadImagingPage
    );

    window.addEventListener(
        "semasacare:radiologyImagesUpdated",
        loadImagingPage
    );

    /* -------------------------------------
       INITIALIZE
    ------------------------------------- */

    displayDashboardDate();
    loadImagingPage();

});
