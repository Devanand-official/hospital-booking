
/* ==========================================
   SEMASACARE - LABORATORY SAMPLE COLLECTION
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
    document.getElementById("collectedBy").value = technicianName;


    // =====================================
    // 2. STORAGE KEYS
    // =====================================

    const REQUEST_KEY = "semasacareLabRequests";
    const SAMPLE_KEY = "semasacareLabSamples";

    function getStorageArray(key) {

        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];

        } catch (error) {
            console.error("Unable to read " + key, error);
            return [];
        }
    }

    function getRequests() {
        return getStorageArray(REQUEST_KEY);
    }

    function getSamples() {
        return getStorageArray(SAMPLE_KEY);
    }

    function saveRequests(requests) {
        localStorage.setItem(REQUEST_KEY, JSON.stringify(requests));
        window.dispatchEvent(new CustomEvent("labRequestsUpdated"));
    }

    function saveSamples(samples) {
        localStorage.setItem(SAMPLE_KEY, JSON.stringify(samples));
        window.dispatchEvent(new CustomEvent("labSamplesUpdated"));
    }


    // =====================================
    // 3. HTML ELEMENTS
    // =====================================

    const pendingSamplesBody =
        document.getElementById("pendingSamplesBody");

    const collectedSamplesBody =
        document.getElementById("collectedSamplesBody");

    const pendingSearch =
        document.getElementById("pendingSearch");

    const pendingPriorityFilter =
        document.getElementById("pendingPriorityFilter");

    const collectedSearch =
        document.getElementById("collectedSearch");

    const specimenFilter =
        document.getElementById("specimenFilter");

    const pendingTableNote =
        document.getElementById("pendingTableNote");

    const collectedTableNote =
        document.getElementById("collectedTableNote");

    const sampleModal =
        document.getElementById("sampleModal");

    const sampleForm =
        document.getElementById("sampleCollectionForm");

    const specimenEntries = document.getElementById("specimenEntries");

    const addSpecimenBtn = document.getElementById("addSpecimenBtn");

    let selectedRequestId = null;


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

    function getRequestId(record) {

        return String(firstAvailableValue(record, [
            "requestId",
            "labRequestId",
            "id",
            "orderId"
        ], "N/A"));
    }

    function getPatientName(record) {

        const patient = record.patient;

        if (patient && typeof patient === "object") {

            const name = firstAvailableValue(patient, [
                "name",
                "fullName",
                "patientName"
            ]);

            if (name) return name;
        }

        return firstAvailableValue(record, [
            "patientName",
            "patientFullName"
        ], "Unknown Patient");
    }

    function getPatientId(record) {

        const patient = record.patient;

        return firstAvailableValue(record, [
            "patientId",
            "patientID",
            "patient_id"
        ], patient && typeof patient === "object"
            ? firstAvailableValue(patient, ["id", "patientId"], "N/A")
            : patient || "N/A");
    }

    function getDoctorName(record) {

        const doctor = firstAvailableValue(record, [
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

    function getTests(record) {

        const directTest = firstAvailableValue(record, [
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

        const tests =
            record.tests ||
            record.testNames ||
            record.investigations;

        if (Array.isArray(tests) && tests.length) {

            return tests.map(function (item) {

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

    function getPriority(record) {

        return String(firstAvailableValue(record, [
            "priority",
            "urgency",
            "severity"
        ], "Routine")).trim();
    }

    function getRequestDate(record) {

        return firstAvailableValue(record, [
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

    function getTodayDate() {

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function displayDashboardDate() {

        const element =
            document.querySelector("#dashboardDate span");

        if (!element) return;

        element.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }


    // =====================================
    // 5. STATUS HELPERS
    // =====================================

    function getNormalizedStatus(request) {

        const status = String(firstAvailableValue(request, [
            "status",
            "requestStatus",
            "workflowStatus",
            "testStatus"
        ], "Pending"))
            .trim()
            .toLowerCase()
            .replace(/[_-]+/g, " ");

        if (/reject|cancel/.test(status)) return "rejected";

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

        return "pending";
    }

    function isAwaitingCollection(request) {
        return getNormalizedStatus(request) === "awaiting";
    }

    function getPriorityBadge(record) {

        const priority = getPriority(record);

        const safePriority = priority
            .toLowerCase()
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
            <span class="lab-sample-priority ${priorityClass}">
                ${escapeHTML(priority)}
            </span>
        `;
    }


    // =====================================
    // 6. STATISTICS
    // =====================================

    function updateStatistics() {

        const requests = getRequests();
        const samples = getSamples();

        const awaiting = requests.filter(isAwaitingCollection);

        const today = getTodayDate();

        const todaySamples = samples.filter(sample => {

            const collectionDate = firstAvailableValue(sample, [
                "collectionDate",
                "sampleDate"
            ], "");

            return String(collectionDate).slice(0, 10) === today;
        });

        document.getElementById("awaitingCollectionCount").textContent =
            awaiting.length;

        document.getElementById("totalSamplesCount").textContent =
            samples.length;

        document.getElementById("todaySamplesCount").textContent =
            todaySamples.length;

        document.getElementById("collectionRecordsCount").textContent =
            samples.length;

        // Match dashboard badge behavior.
        document.getElementById("pendingLabBadge").textContent =
            awaiting.length;
    }


    // =====================================
    // 7. PENDING COLLECTION TABLE
    // =====================================

    function displayPendingRequests() {

        const requests = getRequests();

        const searchTerm =
            pendingSearch.value.trim().toLowerCase();

        const selectedPriority =
            pendingPriorityFilter.value;

        const filteredRequests = requests
            .filter(isAwaitingCollection)
            .filter(function (request) {

                const searchableContent = [
                    getRequestId(request),
                    getPatientName(request),
                    getPatientId(request),
                    getTests(request),
                    getDoctorName(request)
                ].join(" ").toLowerCase();

                const matchesSearch =
                    !searchTerm || searchableContent.includes(searchTerm);

                const matchesPriority =
                    selectedPriority === "all" ||
                    getPriority(request).toLowerCase() === selectedPriority;

                return matchesSearch && matchesPriority;
            })
            .sort(function (a, b) {

                return new Date(getRequestDate(b) || 0) -
                    new Date(getRequestDate(a) || 0);
            });

        if (!filteredRequests.length) {

            pendingSamplesBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        ${requests.some(isAwaitingCollection)
                    ? "No requests match your search or selected filter."
                    : "No accepted requests are currently awaiting sample collection."
                }
                    </td>
                </tr>
            `;

            pendingTableNote.textContent = "";
            return;
        }

        pendingSamplesBody.innerHTML = filteredRequests.map(function (request) {

            const requestId = getRequestId(request);

            return `
                <tr>
                    <td class="lab-sample-primary-cell">
                        ${escapeHTML(requestId)}
                    </td>

                    <td>
                        <strong>${escapeHTML(getPatientName(request))}</strong>
                        <span class="lab-sample-secondary-cell">
                            ID: ${escapeHTML(getPatientId(request))}
                        </span>
                    </td>

                    <td>${escapeHTML(getTests(request))}</td>

                    <td>${escapeHTML(getDoctorName(request))}</td>

                    <td>${escapeHTML(formatDate(getRequestDate(request)))}</td>

                    <td>${getPriorityBadge(request)}</td>

                    <td>
                        <button type="button"
                            class="lab-collect-btn"
                            data-action="collect"
                            data-id="${escapeHTML(requestId)}">
                            <i class="fas fa-vial"></i>
                            Collect Sample
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        pendingTableNote.textContent =
            `${filteredRequests.length} request(s) awaiting collection.`;
    }


    // =====================================
    // 8. COLLECTED SAMPLES TABLE
    // =====================================

    function getSampleDate(sample) {

        return firstAvailableValue(sample, [
            "collectionDate",
            "sampleDate",
            "collectedAt",
            "createdAt"
        ], "");
    }

    function displayCollectedSamples() {

        const samples = getSamples();

        const searchTerm =
            collectedSearch.value.trim().toLowerCase();

        const selectedSpecimen =
            specimenFilter.value;

        const filteredSamples = samples
            .filter(function (sample) {

                const sampleId = firstAvailableValue(sample, [
                    "sampleId",
                    "id",
                    "specimenId"
                ], "N/A");

                const specimen = firstAvailableValue(sample, [
                    "specimenType",
                    "sampleType",
                    "type"
                ], "Other");

                const searchableContent = [
                    sampleId,
                    getRequestId(sample),
                    getPatientName(sample),
                    specimen,
                    firstAvailableValue(sample, [
                        "collectedBy",
                        "technicianName"
                    ], "")
                ].join(" ").toLowerCase();

                const matchesSearch =
                    !searchTerm || searchableContent.includes(searchTerm);

                const specimenValue = specimen.toLowerCase();

                const matchesSpecimen =
                    selectedSpecimen === "all" ||
                    (selectedSpecimen === "other"
                        ? ![
                            "blood", "urine", "stool",
                            "swab", "sputum"
                        ].includes(specimenValue)
                        : specimenValue === selectedSpecimen);

                return matchesSearch && matchesSpecimen;
            })
            .sort(function (a, b) {

                const dateA = new Date(
                    a.collectedAt || getSampleDate(a) || 0
                ).getTime();

                const dateB = new Date(
                    b.collectedAt || getSampleDate(b) || 0
                ).getTime();

                return (Number.isNaN(dateB) ? 0 : dateB) -
                    (Number.isNaN(dateA) ? 0 : dateA);
            });

        if (!filteredSamples.length) {

            collectedSamplesBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        ${samples.length
                    ? "No collected samples match your search or filter."
                    : "No sample collections recorded yet."
                }
                    </td>
                </tr>
            `;

            collectedTableNote.textContent = "";
            return;
        }

        collectedSamplesBody.innerHTML = filteredSamples.map(function (sample) {

            const sampleId = firstAvailableValue(sample, [
                "sampleId",
                "id",
                "specimenId"
            ], "N/A");

            const specimenType = firstAvailableValue(sample, [
                "specimenType",
                "sampleType",
                "type"
            ], "Other");

            const collectedBy = firstAvailableValue(sample, [
                "collectedBy",
                "technicianName"
            ], "Not specified");

            return `
                <tr>
                    <td class="lab-sample-primary-cell">
                        ${escapeHTML(sampleId)}
                    </td>

                    <td>${escapeHTML(getRequestId(sample))}</td>

                    <td>${escapeHTML(getPatientName(sample))}</td>

                    <td>${escapeHTML(specimenType)}</td>

                    <td>${escapeHTML(formatDate(getSampleDate(sample)))}</td>

                    <td>${escapeHTML(collectedBy)}</td>

                    <td>
                        <span class="lab-sample-status collected">
                            Collected
                        </span>
                    </td>
                </tr>
            `;
        }).join("");

        collectedTableNote.textContent =
            `${filteredSamples.length} sample record(s) shown.`;
    }


    // =====================================
    // 9. SAMPLE ID GENERATOR
    // =====================================

    function generateSampleId() {

        const datePart = getTodayDate().replace(/-/g, "");

        const randomPart = Math.floor(1000 + Math.random() * 9000);

        return `SMP-${datePart}-${randomPart}`;
    }

    // =====================================
    // SPECIMEN ROW MANAGEMENT
    // =====================================

    function addSpecimenRow() {

        const sampleId = generateSampleId();

        const row = document.createElement("div");
        row.className = "specimen-entry";
        row.style.cssText = `
        border: 1px solid #dce3ea;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 14px;
        background: #f9fbfd;
    `;

        row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <strong class="specimen-heading">Specimen</strong>

            <button type="button" class="remove-specimen-btn"
                style="border:0; background:none; color:#dc3545; cursor:pointer;">
                <i class="fas fa-trash"></i> Remove
            </button>
        </div>

        <div class="lab-form-group">
            <label>Sample ID *</label>
            <input type="text" class="entry-sample-id"
                value="${escapeHTML(sampleId)}" readonly required>
        </div>

        <div class="lab-form-group">
            <label>Specimen Type *</label>
            <select class="entry-specimen-type" required>
                <option value="">Select specimen type</option>
                <option value="Blood">Blood</option>
                <option value="Urine">Urine</option>
                <option value="Stool">Stool</option>
                <option value="Swab">Swab</option>
                <option value="Sputum">Sputum</option>
                <option value="Saliva">Saliva</option>
                <option value="Other">Other</option>
            </select>
        </div>

        <div class="lab-form-group entry-other-group" hidden>
            <label>Specify Specimen *</label>
            <input type="text" class="entry-other-specimen"
                placeholder="Enter specimen type">
        </div>

        <div class="lab-form-group">
            <label>Collection Date *</label>
            <input type="date" class="entry-collection-date"
                value="${getTodayDate()}" max="${getTodayDate()}" required>
        </div>

        <div class="lab-form-group">
            <label>Collection Time *</label>
            <input type="time" class="entry-collection-time"
                value="${getCurrentTime()}" required>
        </div>

        <div class="lab-form-group full-width">
            <label>Collection Notes</label>
            <textarea class="entry-collection-notes" rows="2"
                placeholder="Enter collection observations..."></textarea>
        </div>
    `;

        specimenEntries.appendChild(row);

        row.querySelector(".remove-specimen-btn")
            .addEventListener("click", function () {

                if (specimenEntries.querySelectorAll(".specimen-entry").length === 1) {
                    alert("At least one specimen entry is required.");
                    return;
                }

                row.remove();
                updateSpecimenHeadings();
            });

        row.querySelector(".entry-specimen-type")
            .addEventListener("change", function () {

                const otherGroup = row.querySelector(".entry-other-group");
                const otherInput = row.querySelector(".entry-other-specimen");

                const isOther = this.value === "Other";

                otherGroup.hidden = !isOther;
                otherInput.required = isOther;

                if (!isOther) {
                    otherInput.value = "";
                }
            });

        updateSpecimenHeadings();
    }

    function getCurrentTime() {

        const now = new Date();

        return String(now.getHours()).padStart(2, "0") + ":" +
            String(now.getMinutes()).padStart(2, "0");
    }

    function updateSpecimenHeadings() {

        specimenEntries.querySelectorAll(".specimen-entry")
            .forEach(function (row, index) {

                row.querySelector(".specimen-heading").textContent =
                    `Specimen ${index + 1}`;
            });
    }

    addSpecimenBtn.addEventListener("click", addSpecimenRow);

    // =====================================
    // 10. OPEN COLLECTION FORM
    // =====================================

    function openSampleModal(requestId) {

        const request = getRequests().find(item =>
            getRequestId(item) === String(requestId)
        );

        if (!request) {
            alert("Laboratory request not found.");
            return;
        }

        if (!isAwaitingCollection(request)) {
            alert("This request is no longer awaiting sample collection.");
            return;
        }

        selectedRequestId = String(requestId);

        document.getElementById("selectedRequestId").value = selectedRequestId;
        document.getElementById("modalRequestId").textContent = getRequestId(request);
        document.getElementById("modalPatientName").textContent = getPatientName(request);
        document.getElementById("modalTestName").textContent = getTests(request);
        document.getElementById("collectedBy").value = technicianName;

        specimenEntries.innerHTML = "";
        addSpecimenRow();

        sampleModal.classList.add("active");
        sampleModal.setAttribute("aria-hidden", "false");
    }
    // =====================================
    // 11. CLOSE COLLECTION FORM
    // =====================================

    function closeSampleModal() {

        sampleModal.classList.remove("active");
        sampleModal.setAttribute("aria-hidden", "true");

        sampleForm.reset();
        specimenEntries.innerHTML = "";

        document.getElementById("collectedBy").value = technicianName;

        selectedRequestId = null;
    }
    // =====================================
    // 12. SPECIMEN TYPE CHANGE
    // =====================================

    // document.getElementById("specimenType")
    //     .addEventListener("change", function () {

    //         const otherGroup =
    //             document.getElementById("otherSpecimenGroup");

    //         const otherInput =
    //             document.getElementById("otherSpecimen");

    //         const isOther = this.value === "Other";

    //         otherGroup.hidden = !isOther;
    //         otherInput.required = isOther;

    //         if (!isOther) {
    //             otherInput.value = "";
    //         }
    //     });


    // =====================================
    // 13. SAVE MULTIPLE SAMPLE COLLECTIONS
    // =====================================

    sampleForm.addEventListener("submit", function (event) {

        event.preventDefault();

        if (!selectedRequestId) {
            alert("Please select a valid laboratory request.");
            return;
        }

        const requests = getRequests();

        const requestIndex = requests.findIndex(request =>
            getRequestId(request) === selectedRequestId
        );

        if (requestIndex === -1) {
            alert("The selected request could not be found.");
            return;
        }

        const request = requests[requestIndex];

        if (!isAwaitingCollection(request)) {
            alert("This request is no longer awaiting sample collection.");
            closeSampleModal();
            refreshPage();
            return;
        }

        const samples = getSamples();
        const rows = Array.from(
            specimenEntries.querySelectorAll(".specimen-entry")
        );

        if (!rows.length) {
            alert("Please add at least one specimen.");
            return;
        }

        const newSamples = [];
        const usedIds = new Set(
            samples.map(sample => String(firstAvailableValue(
                sample, ["sampleId", "id", "specimenId"], ""
            )))
        );

        for (let index = 0; index < rows.length; index++) {

            const row = rows[index];

            const sampleId = row.querySelector(".entry-sample-id").value.trim();
            const selectedType = row.querySelector(".entry-specimen-type").value;

            const specimenType = selectedType === "Other"
                ? row.querySelector(".entry-other-specimen").value.trim()
                : selectedType;

            const collectionDate = row.querySelector(".entry-collection-date").value;
            const collectionTime = row.querySelector(".entry-collection-time").value;
            const collectionNotes = row.querySelector(".entry-collection-notes").value.trim();

            if (!sampleId || !specimenType || !collectionDate || !collectionTime) {
                alert(`Please complete all required fields in Specimen ${index + 1}.`);
                return;
            }

            if (collectionDate > getTodayDate()) {
                alert(`Collection date for Specimen ${index + 1} cannot be in the future.`);
                return;
            }

            if (usedIds.has(sampleId)) {
                alert(`Duplicate Sample ID found: ${sampleId}. Please add the specimen again.`);
                return;
            }

            const collectedAt = new Date(`${collectionDate}T${collectionTime}`);

            if (Number.isNaN(collectedAt.getTime())) {
                alert(`Invalid collection date or time in Specimen ${index + 1}.`);
                return;
            }

            if (collectedAt > new Date()) {
                alert(`Collection time for Specimen ${index + 1} cannot be in the future.`);
                return;
            }

            usedIds.add(sampleId);

            newSamples.push({
                sampleId: sampleId,
                requestId: selectedRequestId,

                patientId: getPatientId(request),
                patientName: getPatientName(request),
                doctorName: getDoctorName(request),

                testName: getTests(request),
                specimenType: specimenType,

                collectionDate: collectionDate,
                collectionTime: collectionTime,
                collectedAt: collectedAt.toISOString(),

                collectedBy: technicianName,
                collectionNotes: collectionNotes,

                status: "Collected",
                createdAt: new Date().toISOString()
            });
        }

        // Save every specimen as an individual sample record.
        samples.push(...newSamples);
        saveSamples(samples);

        // Update the original request only once.
        const collectedAtValues = newSamples.map(sample => sample.collectedAt);

        requests[requestIndex].status = "Sample Collected";

        requests[requestIndex].sampleId = newSamples[0].sampleId;

        requests[requestIndex].sampleIds =
            newSamples.map(sample => sample.sampleId);

        requests[requestIndex].sampleCount = newSamples.length;

        requests[requestIndex].sampleCollectedAt =
            new Date().toISOString();

        requests[requestIndex].sampleCollectedBy = technicianName;

        saveRequests(requests);

        closeSampleModal();
        refreshPage();

        alert(
            `${newSamples.length} specimen(s) collected and registered successfully.`
        );
    });
    // =====================================
    // 14. TABLE ACTION EVENTS
    // =====================================

    pendingSamplesBody.addEventListener("click", function (event) {

        const button = event.target.closest(
            'button[data-action="collect"]'
        );

        if (!button) return;

        openSampleModal(button.dataset.id);
    });


    // =====================================
    // 15. MODAL EVENTS
    // =====================================

    document.getElementById("closeSampleModal")
        .addEventListener("click", closeSampleModal);

    document.getElementById("cancelSample")
        .addEventListener("click", closeSampleModal);

    sampleModal.addEventListener("click", function (event) {

        if (event.target === sampleModal) {
            closeSampleModal();
        }
    });

    document.addEventListener("keydown", function (event) {

        if (
            event.key === "Escape" &&
            sampleModal.classList.contains("active")
        ) {
            closeSampleModal();
        }
    });


    // =====================================
    // 16. SEARCH AND FILTER EVENTS
    // =====================================

    pendingSearch.addEventListener("input", displayPendingRequests);

    pendingPriorityFilter.addEventListener(
        "change",
        displayPendingRequests
    );

    collectedSearch.addEventListener("input", displayCollectedSamples);

    specimenFilter.addEventListener(
        "change",
        displayCollectedSamples
    );


    // =====================================
    // 17. REFRESH
    // =====================================

    function refreshPage() {

        updateStatistics();
        displayPendingRequests();
        displayCollectedSamples();
    }

    document.getElementById("refreshSamples")
        .addEventListener("click", refreshPage);


    // =====================================
    // 18. SIDEBAR
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
    // 19. LOGOUT
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
    // 20. STORAGE UPDATES
    // =====================================

    window.addEventListener("storage", function (event) {

        if (
            event.key === REQUEST_KEY ||
            event.key === SAMPLE_KEY ||
            event.key === null
        ) {
            refreshPage();
        }
    });

    window.addEventListener("labRequestsUpdated", refreshPage);
    window.addEventListener("labSamplesUpdated", refreshPage);


    // =====================================
    // 21. INITIALIZE
    // =====================================

    displayDashboardDate();
    refreshPage();

});
