
/* ============================================
   SEMASACARE - LABORATORY TEST PROCESSING
   File: js/laboratory/test-processing.js
============================================ */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =========================================
       1. AUTHENTICATION
    ========================================= */

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "laboratory") {
        window.location.href = "../login.html";
        return;
    }

    const technicianName =
        currentUser.name ||
        currentUser.fullName ||
        currentUser.email ||
        "Laboratory Technician";


    /* =========================================
       2. STORAGE KEYS
    ========================================= */

    const SAMPLE_KEY = "semasacareLabSamples";
    const REQUEST_KEY = "semasacareLabRequests";


    /* =========================================
       3. DOM ELEMENTS
    ========================================= */

    const elements = {
        laboratoryName: document.getElementById("laboratoryName"),
        headerName: document.getElementById("headerName"),
        dashboardDate: document.getElementById("dashboardDate"),

        pendingCount: document.getElementById("pendingProcessingCount"),
        processingCount: document.getElementById("currentlyProcessingCount"),
        completedCount: document.getElementById("completedProcessingCount"),
        totalCount: document.getElementById("totalProcessingSamples"),

        search: document.getElementById("processingSearch"),
        statusFilter: document.getElementById("processingStatusFilter"),
        specimenFilter: document.getElementById("processingSpecimenFilter"),

        refreshButton: document.getElementById("refreshProcessing"),

        processingBody: document.getElementById("processingSamplesBody"),
        completedBody: document.getElementById("completedProcessingBody"),

        tableNote: document.getElementById("processingTableNote"),

        modal: document.getElementById("processingModal"),
        form: document.getElementById("processingForm"),

        closeModal: document.getElementById("closeProcessingModal"),
        cancelButton: document.getElementById("cancelProcessing"),

        sampleId: document.getElementById("processingSampleId"),

        modalSampleId: document.getElementById("modalSampleId"),
        modalRequestId: document.getElementById("modalProcessingRequestId"),
        modalPatient: document.getElementById("modalProcessingPatient"),
        modalTest: document.getElementById("modalProcessingTest"),
        modalSpecimen: document.getElementById("modalProcessingSpecimen"),
        modalCollectionDate: document.getElementById("modalProcessingCollectionDate"),

        processingStatus: document.getElementById("processingStatus"),

        startDate: document.getElementById("processingStartDate"),
        startTime: document.getElementById("processingStartTime"),

        endDate: document.getElementById("processingEndDate"),
        endTime: document.getElementById("processingEndTime"),

        processedBy: document.getElementById("processedBy"),
        observations: document.getElementById("processingObservations"),

        logoutButton: document.getElementById("logoutBtn"),
        menuToggle: document.getElementById("menuToggle"),
        sidebar: document.getElementById("sidebar")
    };


    /* =========================================
       4. GENERAL HELPERS
    ========================================= */

    function getStorageArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key));

            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Storage read error:", key, error);
            return [];
        }
    }

    function saveStorageArray(key, data) {
        localStorage.setItem(key, JSON.stringify(data));

        window.dispatchEvent(
            new CustomEvent(
                key === SAMPLE_KEY
                    ? "labSamplesUpdated"
                    : "labRequestsUpdated"
            )
        );
    }

    function getLocalDate() {
        const date = new Date();

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getLocalTime() {
        const date = new Date();

        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");

        return `${hours}:${minutes}`;
    }

    function formatDate(dateValue) {
        if (!dateValue) return "—";

        const date = new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => {
            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        });
    }

    function getSamples() {
        return getStorageArray(SAMPLE_KEY);
    }

    function getRequests() {
        return getStorageArray(REQUEST_KEY);
    }

    function getSampleId(sample) {
        return String(
            sample.sampleId ||
            sample.id ||
            ""
        );
    }

    function getRequestId(sample) {
        return (
            sample.requestId ||
            sample.labRequestId ||
            sample.orderId ||
            "—"
        );
    }

    function getPatientName(sample) {
        if (typeof sample.patient === "object" && sample.patient !== null) {
            return (
                sample.patient.name ||
                sample.patient.fullName ||
                sample.patientName ||
                "Unknown Patient"
            );
        }

        return (
            sample.patientName ||
            sample.patient ||
            "Unknown Patient"
        );
    }

    function getTestName(sample) {
        if (Array.isArray(sample.tests)) {
            return sample.tests.join(", ");
        }

        return (
            sample.testName ||
            sample.test ||
            sample.tests ||
            "Laboratory Test"
        );
    }

    function getSpecimen(sample) {
        return (
            sample.specimenType ||
            sample.specimen ||
            "Not specified"
        );
    }

    function getCollectionDate(sample) {
        return (
            sample.collectionDate ||
            sample.collectedAt?.split("T")[0] ||
            ""
        );
    }


    /* =========================================
       5. PROCESSING STATUS
    ========================================= */

    function getProcessingStatus(sample) {
        const status = String(
            sample.processingStatus || ""
        ).toLowerCase().trim();

        if (
            status === "completed" ||
            status === "complete" ||
            status === "finished"
        ) {
            return "Completed";
        }

        if (
            status === "processing" ||
            status === "in progress" ||
            status === "in-progress"
        ) {
            return "Processing";
        }

        // Samples collected before this module was
        // created are treated as pending processing.

        return "Pending";
    }

    function getStatusClass(status) {
        if (status === "Completed") {
            return "completed";
        }

        if (status === "Processing") {
            return "in-progress";
        }

        return "pending";
    }

    function getStatusBadge(status) {
        return `
            <span class="processing-status ${getStatusClass(status)}">
                ${escapeHTML(status)}
            </span>
        `;
    }


    /* =========================================
       6. INITIAL PAGE SETUP
    ========================================= */

    function initializePage() {
        const name = technicianName;

        if (elements.laboratoryName) {
            elements.laboratoryName.textContent = name;
        }

        if (elements.headerName) {
            elements.headerName.textContent = name;
        }

        if (elements.dashboardDate) {
            elements.dashboardDate.textContent =
                new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });
        }

        if (elements.processedBy) {
            elements.processedBy.value = name;
        }

        if (elements.startDate) {
            elements.startDate.value = getLocalDate();
        }

        if (elements.startTime) {
            elements.startTime.value = getLocalTime();
        }

        if (elements.endDate) {
            elements.endDate.value = getLocalDate();
        }

        if (elements.endTime) {
            elements.endTime.value = getLocalTime();
        }

        updateProcessingDateFields();
    }


    /* =========================================
       7. RENDER PROCESSING TABLE
    ========================================= */

    function renderProcessingTable() {
        if (!elements.processingBody) return;

        const samples = getSamples();

        const searchTerm = (
            elements.search?.value || ""
        ).toLowerCase().trim();

        const statusFilter = (
            elements.statusFilter?.value || "all"
        ).toLowerCase();

        const specimenFilter = (
            elements.specimenFilter?.value || "all"
        ).toLowerCase();

        const filteredSamples = samples.filter(sample => {
            const status = getProcessingStatus(sample);

            const searchText = [
                getSampleId(sample),
                getRequestId(sample),
                getPatientName(sample),
                getTestName(sample),
                getSpecimen(sample)
            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchTerm || searchText.includes(searchTerm);

            const matchesStatus =
                statusFilter === "all" ||
                status.toLowerCase() === statusFilter;

            const specimen = getSpecimen(sample).toLowerCase();

            const matchesSpecimen =
                specimenFilter === "all" ||
                specimen.includes(specimenFilter);

            return (
                status !== "Completed" &&
                matchesSearch &&
                matchesStatus &&
                matchesSpecimen
            );
        });

        if (filteredSamples.length === 0) {
            elements.processingBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-microscope"></i>
                        <p>No samples found for processing.</p>
                    </td>
                </tr>
            `;

            return;
        }

        elements.processingBody.innerHTML = filteredSamples.map(sample => {
            const status = getProcessingStatus(sample);

            const sampleId = getSampleId(sample);

            const actionLabel =
                status === "Processing"
                    ? "Update"
                    : "Start Processing";

            const actionClass =
                status === "Processing"
                    ? "secondary"
                    : "";

            return `
                <tr>
                    <td>
                        <span class="sample-id">
                            ${escapeHTML(sampleId)}
                        </span>
                    </td>

                    <td>
                        <div class="patient-name">
                            ${escapeHTML(getPatientName(sample))}
                        </div>
                        <div class="patient-subtext">
                            ${escapeHTML(getRequestId(sample))}
                        </div>
                    </td>

                    <td>
                        <span class="test-name">
                            ${escapeHTML(getTestName(sample))}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(getSpecimen(sample))}
                    </td>

                    <td>
                        ${escapeHTML(formatDate(getCollectionDate(sample)))}
                    </td>

                    <td>
                        ${getStatusBadge(status)}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="processing-action ${actionClass}"
                            data-action="edit"
                            data-sample-id="${escapeHTML(sampleId)}"
                        >
                            <i class="fas fa-${status === "Processing" ? "edit" : "play"}"></i>
                            ${actionLabel}
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }


    /* =========================================
       8. RENDER COMPLETED TABLE
    ========================================= */

    function renderCompletedTable() {
        if (!elements.completedBody) return;

        const samples = getSamples();

        const completedSamples = samples.filter(sample => {
            return getProcessingStatus(sample) === "Completed";
        });

        if (completedSamples.length === 0) {
            elements.completedBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No completed processing records yet.</p>
                    </td>
                </tr>
            `;

            return;
        }

        elements.completedBody.innerHTML = completedSamples
            .slice()
            .sort((a, b) => {
                return String(b.processingEndAt || "").localeCompare(
                    String(a.processingEndAt || "")
                );
            })
            .map(sample => {
                const completedDate =
                    sample.processingEndDate ||
                    sample.processingEndAt?.split("T")[0] ||
                    "";

                return `
                    <tr>
                        <td>
                            <span class="sample-id">
                                ${escapeHTML(getSampleId(sample))}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(getRequestId(sample))}
                        </td>

                        <td>
                            <span class="patient-name">
                                ${escapeHTML(getPatientName(sample))}
                            </span>
                        </td>

                        <td>
                            ${escapeHTML(getTestName(sample))}
                        </td>

                        <td>
                            ${escapeHTML(formatDate(completedDate))}
                        </td>

                        <td>
                            ${escapeHTML(sample.processedBy || "—")}
                        </td>

                        <td>
                            ${getStatusBadge("Completed")}
                        </td>
                    </tr>
                `;
            }).join("");
    }


    /* =========================================
       9. UPDATE DASHBOARD STATISTICS
    ========================================= */

    function updateStatistics() {
        const samples = getSamples();

        const pending = samples.filter(sample =>
            getProcessingStatus(sample) === "Pending"
        ).length;

        const processing = samples.filter(sample =>
            getProcessingStatus(sample) === "Processing"
        ).length;

        const completed = samples.filter(sample =>
            getProcessingStatus(sample) === "Completed"
        ).length;

        if (elements.pendingCount) {
            elements.pendingCount.textContent = pending;
        }

        if (elements.processingCount) {
            elements.processingCount.textContent = processing;
        }

        if (elements.completedCount) {
            elements.completedCount.textContent = completed;
        }

        if (elements.totalCount) {
            elements.totalCount.textContent = samples.length;
        }

        if (elements.tableNote) {
            elements.tableNote.textContent =
                `${pending + processing} sample(s) awaiting processing completion.`;
        }
    }

    /* =========================================
       UPDATE TEST REQUESTS SIDEBAR BADGE
    ========================================= */

    function updateSidebarBadge() {
        const badge = document.getElementById("pendingLabBadge");

        if (!badge) return;

        const requests = getRequests();

        // Count requests that are still awaiting sample collection.
        const awaitingCount = requests.filter(request => {
            const status = String(request.status || "")
                .toLowerCase()
                .trim()
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ");

            return status === "awaiting sample";
        }).length;

        badge.textContent = awaitingCount;
    }
    /* =========================================
       10. REFRESH ALL PAGE DATA
    ========================================= */

    function refreshPage() {
        updateSidebarBadge();
        updateStatistics();
        renderProcessingTable();
        renderCompletedTable();
    }


    /* =========================================
       11. OPEN PROCESSING MODAL
    ========================================= */

    function openProcessingModal(sampleId) {
        const samples = getSamples();

        const sample = samples.find(item =>
            getSampleId(item) === String(sampleId)
        );

        if (!sample) {
            alert("Sample record not found.");
            return;
        }

        const status = getProcessingStatus(sample);

        if (status === "Completed") {
            alert("This sample has already been completed.");
            return;
        }

        elements.form?.reset();

        if (elements.sampleId) {
            elements.sampleId.value = getSampleId(sample);
        }

        if (elements.modalSampleId) {
            elements.modalSampleId.textContent = getSampleId(sample);
        }

        if (elements.modalRequestId) {
            elements.modalRequestId.textContent = getRequestId(sample);
        }

        if (elements.modalPatient) {
            elements.modalPatient.textContent = getPatientName(sample);
        }

        if (elements.modalTest) {
            elements.modalTest.textContent = getTestName(sample);
        }

        if (elements.modalSpecimen) {
            elements.modalSpecimen.textContent = getSpecimen(sample);
        }

        if (elements.modalCollectionDate) {
            elements.modalCollectionDate.textContent =
                formatDate(getCollectionDate(sample));
        }

        if (elements.processingStatus) {
            elements.processingStatus.value =
                status === "Processing" ? "Processing" : "Pending";
        }

        if (elements.startDate) {
            elements.startDate.value =
                sample.processingStartDate || getLocalDate();
        }

        if (elements.startTime) {
            elements.startTime.value =
                sample.processingStartTime || getLocalTime();
        }

        if (elements.endDate) {
            elements.endDate.value =
                sample.processingEndDate || getLocalDate();
        }

        if (elements.endTime) {
            elements.endTime.value =
                sample.processingEndTime || getLocalTime();
        }

        if (elements.processedBy) {
            elements.processedBy.value =
                sample.processedBy || technicianName;
        }

        if (elements.observations) {
            elements.observations.value =
                sample.processingObservations || "";
        }

        updateProcessingDateFields();

        elements.modal?.classList.add("active");
        elements.modal?.setAttribute("aria-hidden", "false");
    }


    /* =========================================
       12. CLOSE PROCESSING MODAL
    ========================================= */

    function closeProcessingModal() {
        elements.modal?.classList.remove("active");
        elements.modal?.setAttribute("aria-hidden", "true");
        elements.form?.reset();
    }


    /* =========================================
       13. PROCESSING DATE FIELD CONTROL
    ========================================= */

    function updateProcessingDateFields() {
        const status = elements.processingStatus?.value;

        if (!elements.startDate || !elements.startTime ||
            !elements.endDate || !elements.endTime) {
            return;
        }

        const isPending = status === "Pending";
        const isProcessing = status === "Processing";
        const isCompleted = status === "Completed";

        elements.startDate.required = !isPending;
        elements.startTime.required = !isPending;

        elements.endDate.required = isCompleted;
        elements.endTime.required = isCompleted;

        elements.endDate.disabled = !isCompleted;
        elements.endTime.disabled = !isCompleted;

        if (isPending) {
            elements.endDate.value = "";
            elements.endTime.value = "";
        }

        if (isProcessing && !elements.startDate.value) {
            elements.startDate.value = getLocalDate();
            elements.startTime.value = getLocalTime();
        }

        if (isCompleted && !elements.endDate.value) {
            elements.endDate.value = getLocalDate();
            elements.endTime.value = getLocalTime();
        }
    }


    /* =========================================
       14. VALIDATE PROCESSING DATES
    ========================================= */

    function validateProcessingDates() {
        const status = elements.processingStatus.value;

        const startDate = elements.startDate.value;
        const startTime = elements.startTime.value;

        const endDate = elements.endDate.value;
        const endTime = elements.endTime.value;

        if (status !== "Pending" && (!startDate || !startTime)) {
            alert("Please enter the processing start date and time.");
            return false;
        }

        if (status === "Completed") {
            if (!endDate || !endTime) {
                alert("Please enter the processing completion date and time.");
                return false;
            }

            const start = new Date(`${startDate}T${startTime}`);
            const end = new Date(`${endDate}T${endTime}`);

            if (Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())) {
                alert("Please enter valid processing dates and times.");
                return false;
            }

            if (end < start) {
                alert("Completion date and time cannot be before the start date and time.");
                return false;
            }

            if (end > new Date()) {
                alert("Completion date and time cannot be in the future.");
                return false;
            }
        }

        return true;
    }


    /* =========================================
       15. SAVE PROCESSING DETAILS
    ========================================= */

    function saveProcessing(event) {
        event.preventDefault();

        if (!validateProcessingDates()) {
            return;
        }

        const sampleId = elements.sampleId.value;

        const samples = getSamples();

        const sampleIndex = samples.findIndex(sample =>
            getSampleId(sample) === String(sampleId)
        );

        if (sampleIndex === -1) {
            alert("Sample record not found.");
            return;
        }

        const status = elements.processingStatus.value;

        const sample = samples[sampleIndex];

        sample.processingStatus = status;

        sample.processingStartDate =
            status === "Pending" ? "" : elements.startDate.value;

        sample.processingStartTime =
            status === "Pending" ? "" : elements.startTime.value;

        sample.processingStartAt =
            status === "Pending"
                ? ""
                : `${elements.startDate.value}T${elements.startTime.value}`;

        sample.processingEndDate =
            status === "Completed" ? elements.endDate.value : "";

        sample.processingEndTime =
            status === "Completed" ? elements.endTime.value : "";

        sample.processingEndAt =
            status === "Completed"
                ? `${elements.endDate.value}T${elements.endTime.value}`
                : "";

        sample.processedBy = elements.processedBy.value.trim();

        sample.processingObservations =
            elements.observations.value.trim();

        sample.processingUpdatedAt = new Date().toISOString();

        if (status === "Completed") {
            sample.processingCompletedAt = new Date().toISOString();
        } else {
            sample.processingCompletedAt = "";
        }

        samples[sampleIndex] = sample;

        saveStorageArray(SAMPLE_KEY, samples);

        closeProcessingModal();

        refreshPage();

        if (status === "Completed") {
            alert("Test processing completed successfully. The sample is now ready for Result Entry.");
        } else if (status === "Processing") {
            alert("Test processing has been started/updated successfully.");
        } else {
            alert("Processing status updated successfully.");
        }
    }


    /* =========================================
       16. TABLE ACTION EVENTS
    ========================================= */

    elements.processingBody?.addEventListener("click", event => {
        const button = event.target.closest(
            'button[data-action="edit"]'
        );

        if (!button) return;

        const sampleId = button.dataset.sampleId;

        openProcessingModal(sampleId);
    });


    /* =========================================
       17. SEARCH AND FILTER EVENTS
    ========================================= */

    elements.search?.addEventListener("input", renderProcessingTable);

    elements.statusFilter?.addEventListener(
        "change",
        renderProcessingTable
    );

    elements.specimenFilter?.addEventListener(
        "change",
        renderProcessingTable
    );

    elements.refreshButton?.addEventListener("click", refreshPage);


    /* =========================================
       18. MODAL EVENTS
    ========================================= */

    elements.closeModal?.addEventListener(
        "click",
        closeProcessingModal
    );

    elements.cancelButton?.addEventListener(
        "click",
        closeProcessingModal
    );

    elements.modal?.addEventListener("click", event => {
        if (event.target === elements.modal) {
            closeProcessingModal();
        }
    });

    elements.processingStatus?.addEventListener(
        "change",
        updateProcessingDateFields
    );

    elements.form?.addEventListener("submit", saveProcessing);



    /* =========================================
       19. LOGOUT
    ========================================= */
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            const shouldLogout = window.confirm(
                "Are you sure you want to logout?"
            );

            if (!shouldLogout) return;

            SemasaAuth.logout();
            window.location.href = "../login.html";
        });
    }

    /* =========================================
       20. SIDEBAR MENU
    ========================================= */

    elements.menuToggle?.addEventListener("click", () => {
        elements.sidebar?.classList.toggle("active");
    });

    // Close sidebar after selecting a menu item
    elements.sidebar?.querySelectorAll(".menu-item").forEach(link => {

        link.addEventListener("click", () => {
            elements.sidebar.classList.remove("active");
        });

    });

    /* =========================================
       21. STORAGE SYNCHRONIZATION
    ========================================= */

    window.addEventListener("storage", event => {
        if (
            event.key === SAMPLE_KEY ||
            event.key === REQUEST_KEY
        ) {
            refreshPage();
        }
    });

    window.addEventListener("labSamplesUpdated", refreshPage);

    window.addEventListener("labRequestsUpdated", refreshPage);


    /* =========================================
       22. INITIAL LOAD
    ========================================= */

    initializePage();
    refreshPage();

    console.log("Laboratory Test Processing module initialized.");
});
// function updateSidebarBadge() {
//     const badge = document.getElementById("pendingLabBadge");

//     if (!badge) return;

//     const requests = getRequests();

// Match the Test Requests page:
// Count only requests awaiting sample collection.
//     const awaitingCount = requests.filter(request => {
//         const status = String(request.status || "")
//             .toLowerCase()
//             .trim();

//         return (
//             status === "awaiting sample" ||
//             status === "awaiting_sample"
//         );
//     }).length;

//     badge.textContent = awaitingCount;
// }