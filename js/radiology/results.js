
/* ==========================================
   SEMASACARE - RADIOLOGY RESULTS
   File: js/radiology/results.js
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // AUTHENTICATION
    if (typeof SemasaAuth === "undefined") {
        window.location.href = "../login.html";
        return;
    }

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "radiology") {
        window.location.href = "../login.html";
        return;
    }

    // STORAGE KEYS
    const IMAGE_KEY = "semasacareRadiologyImages";
    const RESULTS_KEY = "semasacareRadiologyResults";

    // ELEMENTS
    const elements = {
        radiologyName: document.getElementById("radiologyName"),
        headerName: document.getElementById("headerName"),
        dashboardDate: document.querySelector("#dashboardDate span"),

        awaitingResultsCount: document.getElementById("awaitingResultsCount"),
        draftResultsCount: document.getElementById("draftResultsCount"),
        completedResultsCount: document.getElementById("completedResultsCount"),
        totalResultsCount: document.getElementById("totalResultsCount"),

        awaitingResultsBody: document.getElementById("awaitingResultsBody"),
        savedResultsBody: document.getElementById("savedResultsBody"),
        awaitingResultsNote: document.getElementById("awaitingResultsNote"),
        savedResultsNote: document.getElementById("savedResultsNote"),

        procedureSearch: document.getElementById("procedureSearch"),
        procedurePriorityFilter: document.getElementById("procedurePriorityFilter"),
        savedResultSearch: document.getElementById("savedResultSearch"),
        resultStatusFilter: document.getElementById("resultStatusFilter"),
        refreshResults: document.getElementById("refreshResults"),

        resultModal: document.getElementById("resultModal"),
        resultForm: document.getElementById("resultForm"),
        resultModalTitle: document.getElementById("resultModalTitle"),
        resultScheduleId: document.getElementById("resultScheduleId"),
        resultFormMessage: document.getElementById("resultFormMessage"),

        modalScheduleId: document.getElementById("modalScheduleId"),
        modalPatientName: document.getElementById("modalPatientName"),
        modalPatientId: document.getElementById("modalPatientId"),
        modalExamination: document.getElementById("modalExamination"),
        modalDoctorName: document.getElementById("modalDoctorName"),
        modalCompletedDate: document.getElementById("modalCompletedDate"),

        findings: document.getElementById("findings"),
        impression: document.getElementById("impression"),
        recommendations: document.getElementById("recommendations"),
        resultNotes: document.getElementById("resultNotes"),

        saveDraftBtn: document.getElementById("saveDraftBtn"),

        viewResultModal: document.getElementById("viewResultModal"),
        viewResultId: document.getElementById("viewResultId"),
        viewPatientName: document.getElementById("viewPatientName"),
        viewExamination: document.getElementById("viewExamination"),
        viewResultDate: document.getElementById("viewResultDate"),
        viewResultStatus: document.getElementById("viewResultStatus"),
        viewRecordedBy: document.getElementById("viewRecordedBy"),
        viewFindings: document.getElementById("viewFindings"),
        viewImpression: document.getElementById("viewImpression"),
        viewRecommendations: document.getElementById("viewRecommendations"),
        viewNotes: document.getElementById("viewNotes"),

        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        logoutBtn: document.getElementById("logoutBtn")
    };

    let activeImage = null;
    let activeResult = null;

    // HELPERS
    function readStorage(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error(`Unable to read ${key}:`, error);
            return [];
        }
    }

    function writeStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    function getScheduleId(image) {
        return String(image.scheduleId || image.id || "");
    }

    function getPatientName(image) {
        return image.patientName || "Unknown Patient";
    }

    function getExamination(image) {
        return image.examination || image.testName || image.procedureName || "Imaging Examination";
    }

    function getCompletedDate(image) {
        return image.imagingCompletedAt || image.completedAt || image.scheduleDate || "";
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "-";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function generateResultId() {
        const timestamp = Date.now().toString().slice(-7);
        return `RAD-RES-${timestamp}`;
    }

    function getResultForImage(image, results) {
        const scheduleId = getScheduleId(image);

        return results.find(result =>
            String(result.scheduleId || "") === scheduleId
        );
    }

    function getCompletedImages() {
        return readStorage(IMAGE_KEY).filter(image =>
            String(image.status || "").toLowerCase() === "completed"
        );
    }

    function displayDate() {
        if (!elements.dashboardDate) return;

        elements.dashboardDate.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function displayUser() {
        const name = currentUser.name || "Radiology Technician";

        if (elements.radiologyName) {
            elements.radiologyName.textContent = name;
        }

        if (elements.headerName) {
            elements.headerName.textContent = name;
        }
    }

    // STATISTICS
    function loadStatistics() {
        const images = getCompletedImages();
        const results = readStorage(RESULTS_KEY);

        const drafts = results.filter(result => result.status === "Draft");
        const completed = results.filter(result => result.status === "Completed");

        const awaiting = images.filter(image =>
            !getResultForImage(image, results)
        );

        elements.awaitingResultsCount.textContent = awaiting.length;
        elements.draftResultsCount.textContent = drafts.length;
        elements.completedResultsCount.textContent = completed.length;
        elements.totalResultsCount.textContent = results.length;
    }

    // PRIORITY BADGE
    function priorityBadge(priority) {
        const value = String(priority || "Normal").toLowerCase();

        return `
            <span class="result-priority-badge ${escapeHTML(value)}">
                ${escapeHTML(priority || "Normal")}
            </span>
        `;
    }

    // STATUS BADGE
    function statusBadge(status) {
        const normalized = String(status || "Draft").toLowerCase();

        return `
            <span class="result-status-badge ${escapeHTML(normalized)}">
                ${escapeHTML(status || "Draft")}
            </span>
        `;
    }

    // AWAITING RESULTS TABLE
    function loadAwaitingResults() {
        const images = getCompletedImages();
        const results = readStorage(RESULTS_KEY);

        const search = elements.procedureSearch.value.trim().toLowerCase();
        const priority = elements.procedurePriorityFilter.value.toLowerCase();

        let awaiting = images.filter(image =>
            !getResultForImage(image, results)
        );

        awaiting = awaiting.filter(image => {
            const searchable = [
                getScheduleId(image),
                getPatientName(image),
                image.patientId,
                getExamination(image),
                image.doctorName
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(search);

            const matchesPriority =
                priority === "all" ||
                String(image.priority || "normal").toLowerCase() === priority;

            return matchesSearch && matchesPriority;
        });

        if (!awaiting.length) {
            elements.awaitingResultsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No procedures awaiting results.
                    </td>
                </tr>
            `;
        } else {
            elements.awaitingResultsBody.innerHTML = awaiting.map(image => `
                <tr>
                    <td>${escapeHTML(getScheduleId(image))}</td>
                    <td>${escapeHTML(getPatientName(image))}</td>
                    <td>${escapeHTML(getExamination(image))}</td>
                    <td>${escapeHTML(formatDate(getCompletedDate(image)))}</td>
                    <td>${priorityBadge(image.priority)}</td>
                    <td>${escapeHTML(image.technician || image.processedBy || "-")}</td>
                    <td>
                        <button
                            type="button"
                            class="results-action-btn"
                            data-action="enter"
                            data-schedule-id="${escapeHTML(getScheduleId(image))}"
                        >
                            <i class="fas fa-edit"></i> Enter Result
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        elements.awaitingResultsNote.textContent =
            `${awaiting.length} procedure(s) awaiting findings entry.`;
    }

    // SAVED RESULTS TABLE
    function loadSavedResults() {
        const results = readStorage(RESULTS_KEY);

        const search = elements.savedResultSearch.value.trim().toLowerCase();
        const status = elements.resultStatusFilter.value;

        const filtered = results.filter(result => {
            const searchable = [
                result.resultId,
                result.patientName,
                result.patientId,
                result.examination,
                result.scheduleId
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(search);
            const matchesStatus = status === "all" || result.status === status;

            return matchesSearch && matchesStatus;
        }).sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        );

        if (!filtered.length) {
            elements.savedResultsBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        No imaging results recorded.
                    </td>
                </tr>
            `;
        } else {
            elements.savedResultsBody.innerHTML = filtered.map(result => `
                <tr>
                    <td>${escapeHTML(result.resultId)}</td>
                    <td>${escapeHTML(result.patientName || "Unknown Patient")}</td>
                    <td>${escapeHTML(result.examination || "-")}</td>
                    <td>${escapeHTML(formatDateTime(result.updatedAt || result.createdAt))}</td>
                    <td>${statusBadge(result.status)}</td>
                    <td>
                        <button
                            type="button"
                            class="results-action-btn results-view-btn"
                            data-action="view"
                            data-result-id="${escapeHTML(result.resultId)}"
                        >
                            <i class="fas fa-eye"></i> View
                        </button>

                        ${result.status === "Draft" ? `
                            <button
                                type="button"
                                class="results-action-btn results-edit-btn"
                                data-action="edit"
                                data-result-id="${escapeHTML(result.resultId)}"
                            >
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ""}
                    </td>
                </tr>
            `).join("");
        }

        elements.savedResultsNote.textContent =
            `${filtered.length} result(s) displayed.`;
    }

    // LOAD PAGE
    function loadPage() {
        loadStatistics();
        loadAwaitingResults();
        loadSavedResults();
    }

    // OPEN RESULT FORM
    function openResultModal(image, existingResult = null) {
        activeImage = image;
        activeResult = existingResult;

        elements.resultForm.reset();
        elements.resultFormMessage.textContent = "";

        elements.resultModalTitle.textContent = existingResult
            ? "Edit Draft Result"
            : "Enter Imaging Findings";

        elements.resultScheduleId.value = getScheduleId(image);

        elements.modalScheduleId.textContent = getScheduleId(image);
        elements.modalPatientName.textContent = getPatientName(image);
        elements.modalPatientId.textContent = image.patientId || "-";
        elements.modalExamination.textContent = getExamination(image);
        elements.modalDoctorName.textContent = image.doctorName || "-";
        elements.modalCompletedDate.textContent =
            formatDateTime(getCompletedDate(image));

        if (existingResult) {
            elements.findings.value = existingResult.findings || "";
            elements.impression.value = existingResult.impression || "";
            elements.recommendations.value = existingResult.recommendations || "";
            elements.resultNotes.value = existingResult.notes || "";
        }

        elements.resultModal.classList.add("show");
    }

    function closeResultModal() {
        elements.resultModal.classList.remove("show");
        activeImage = null;
        activeResult = null;
        elements.resultForm.reset();
        elements.resultFormMessage.textContent = "";
    }

    // SAVE RESULT
    function saveResult(status) {
        if (!activeImage) return;

        const findings = elements.findings.value.trim();
        const impression = elements.impression.value.trim();

        if (!findings || !impression) {
            elements.resultFormMessage.textContent =
                "Please enter both Findings and Impression / Conclusion.";
            return;
        }

        const results = readStorage(RESULTS_KEY);
        const scheduleId = getScheduleId(activeImage);
        const now = new Date().toISOString();

        const existingIndex = results.findIndex(result =>
            String(result.scheduleId || "") === scheduleId
        );

        const existing = existingIndex >= 0
            ? results[existingIndex]
            : null;

        const resultRecord = {
            ...(existing || {}),

            id: existing?.id || generateResultId(),
            resultId: existing?.resultId || generateResultId(),

            scheduleId,
            requestId: activeImage.requestId || "",
            patientId: activeImage.patientId || "",
            patientName: getPatientName(activeImage),
            patientEmail: activeImage.patientEmail || "",
            patientPhone: activeImage.patientPhone || "",

            doctorId: activeImage.doctorId || "",
            doctorEmail: activeImage.doctorEmail || "",
            doctorName: activeImage.doctorName || "",

            examination: getExamination(activeImage),
            priority: activeImage.priority || "Normal",
            technician: activeImage.technician || currentUser.name || "Radiology Technician",

            findings,
            impression,
            recommendations: elements.recommendations.value.trim(),
            notes: elements.resultNotes.value.trim(),

            status,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            recordedBy: currentUser.name || "Radiology Technician",
            recordedById: currentUser.id || currentUser.email || ""
        };

        if (existingIndex >= 0) {
            results[existingIndex] = resultRecord;
        } else {
            results.push(resultRecord);
        }

        writeStorage(RESULTS_KEY, results);

        window.dispatchEvent(new CustomEvent("semasacare:radiologyResultsUpdated"));

        closeResultModal();
        loadPage();
    }

    // VIEW RESULT
    function openViewResultModal(result) {
        elements.viewResultId.textContent = result.resultId || "-";
        elements.viewPatientName.textContent = result.patientName || "-";
        elements.viewExamination.textContent = result.examination || "-";
        elements.viewResultDate.textContent =
            formatDateTime(result.updatedAt || result.createdAt);
        elements.viewResultStatus.textContent = result.status || "-";
        elements.viewRecordedBy.textContent = result.recordedBy || "-";

        elements.viewFindings.textContent = result.findings || "-";
        elements.viewImpression.textContent = result.impression || "-";
        elements.viewRecommendations.textContent = result.recommendations || "-";
        elements.viewNotes.textContent = result.notes || "-";

        elements.viewResultModal.classList.add("show");
    }

    function closeViewResultModal() {
        elements.viewResultModal.classList.remove("show");
    }

    // TABLE ACTIONS
    elements.awaitingResultsBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action='enter']");
        if (!button) return;

        const scheduleId = button.dataset.scheduleId;

        const image = getCompletedImages().find(item =>
            getScheduleId(item) === scheduleId
        );

        if (image) openResultModal(image);
    });

    elements.savedResultsBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const result = readStorage(RESULTS_KEY).find(item =>
            item.resultId === button.dataset.resultId
        );

        if (!result) return;

        if (button.dataset.action === "view") {
            openViewResultModal(result);
        }

        if (button.dataset.action === "edit" && result.status === "Draft") {
            const image = getCompletedImages().find(item =>
                getScheduleId(item) === String(result.scheduleId)
            );

            if (image) {
                openResultModal(image, result);
            }
        }
    });

    // FORM EVENTS
    elements.resultForm.addEventListener("submit", event => {
        event.preventDefault();
        saveResult("Completed");
    });

    elements.saveDraftBtn.addEventListener("click", () => {
        saveResult("Draft");
    });

    document.getElementById("closeResultModal")
        .addEventListener("click", closeResultModal);

    document.getElementById("cancelResult")
        .addEventListener("click", closeResultModal);

    document.getElementById("closeViewResult")
        .addEventListener("click", closeViewResultModal);

    document.getElementById("closeViewResultBtn")
        .addEventListener("click", closeViewResultModal);

    // FILTERS AND REFRESH
    elements.procedureSearch.addEventListener("input", loadAwaitingResults);
    elements.procedurePriorityFilter.addEventListener("change", loadAwaitingResults);

    elements.savedResultSearch.addEventListener("input", loadSavedResults);
    elements.resultStatusFilter.addEventListener("change", loadSavedResults);

    elements.refreshResults.addEventListener("click", loadPage);

    // SIDEBAR
    elements.menuToggle?.addEventListener("click", () => {
        elements.sidebar?.classList.toggle("active");
    });

    elements.sidebar?.querySelectorAll(".menu-item").forEach(link => {
        link.addEventListener("click", () => {
            elements.sidebar.classList.remove("active");
        });
    });

    // LOGOUT
    elements.logoutBtn?.addEventListener("click", () => {
        if (typeof logout === "function") {
            logout();
        }
    });

    // CROSS-TAB AND SAME-TAB UPDATES
    window.addEventListener("storage", event => {
        if ([IMAGE_KEY, RESULTS_KEY].includes(event.key)) {
            loadPage();
        }
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
    window.addEventListener("semasacare:radiologyImagesUpdated", loadPage);
    window.addEventListener("semasacare:radiologyResultsUpdated", loadPage);

    // INITIALIZE
    displayUser();
    displayDate();
    loadPage();
});
