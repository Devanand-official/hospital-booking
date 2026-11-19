
document.addEventListener("DOMContentLoaded", function () {

    // =========================================
    // 1. AUTHENTICATION
    // =========================================

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
        currentUser.name ||
        currentUser.fullName ||
        "Lab Technician";

    document.getElementById("laboratoryName").textContent = technicianName;
    document.getElementById("headerName").textContent = technicianName;

    // =========================================
    // 2. STORAGE KEYS
    // =========================================

    const SAMPLE_KEY = "semasacareLabSamples";
    const RESULT_KEY = "semasacareLabResults";

    function readArray(key) {
        try {
            const data = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Storage read error:", key, error);
            return [];
        }
    }

    function saveArray(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function getSamples() {
        return readArray(SAMPLE_KEY);
    }

    function getResults() {
        return readArray(RESULT_KEY);
    }

    // =========================================
    // 3. DOM ELEMENTS
    // =========================================

    const elements = {
        readyBody: document.getElementById("readyResultsBody"),
        recentBody: document.getElementById("recentResultsBody"),
        search: document.getElementById("resultSearch"),
        statusFilter: document.getElementById("resultStatusFilter"),
        refresh: document.getElementById("refreshResults"),
        note: document.getElementById("readyResultsNote"),

        readyCount: document.getElementById("readyResultCount"),
        draftCount: document.getElementById("draftResultCount"),
        submittedCount: document.getElementById("submittedResultCount"),
        totalCount: document.getElementById("totalResultCount"),

        modal: document.getElementById("resultModal"),
        form: document.getElementById("resultForm"),
        closeModal: document.getElementById("closeResultModal"),
        cancelModal: document.getElementById("cancelResult"),
        saveDraft: document.getElementById("saveResultDraft"),

        sampleId: document.getElementById("resultSampleId"),
        existingResultId: document.getElementById("existingResultId"),

        modalSample: document.getElementById("modalResultSample"),
        modalRequest: document.getElementById("modalResultRequest"),
        modalPatient: document.getElementById("modalResultPatient"),
        modalTest: document.getElementById("modalResultTest"),
        modalSpecimen: document.getElementById("modalResultSpecimen"),
        modalCompletedDate: document.getElementById("modalResultCompletedDate"),

        testResult: document.getElementById("testResult"),
        unit: document.getElementById("resultUnit"),
        referenceRange: document.getElementById("referenceRange"),
        flag: document.getElementById("resultFlag"),
        remarks: document.getElementById("resultRemarks"),
        enteredBy: document.getElementById("resultEnteredBy"),
        entryDate: document.getElementById("resultEntryDate")
    };

    // =========================================
    // 4. GENERAL HELPERS
    // =========================================

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
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

    function firstValue(object, keys, fallback = "N/A") {
        for (const key of keys) {
            const value = object?.[key];

            if (value !== undefined && value !== null && String(value).trim() !== "") {
                return value;
            }
        }

        return fallback;
    }

    function getSampleId(sample) {
        return String(firstValue(sample, [
            "sampleId", "id", "labSampleId"
        ]));
    }

    function getRequestId(sample) {
        return firstValue(sample, [
            "requestId", "labRequestId", "orderId"
        ]);
    }

    function getPatientName(sample) {
        if (sample.patient && typeof sample.patient === "object") {
            return firstValue(sample.patient, [
                "name", "fullName", "patientName"
            ], "Unknown Patient");
        }

        return firstValue(sample, [
            "patientName", "name", "fullName"
        ], "Unknown Patient");
    }

    function getTestName(sample) {
        const directTest = firstValue(sample, [
            "testName", "test", "testType", "investigation"
        ], "");

        if (directTest) {
            return typeof directTest === "object"
                ? firstValue(directTest, ["name", "testName", "label"], "Lab Test")
                : directTest;
        }

        const tests = sample.tests || sample.testNames || [];

        if (Array.isArray(tests) && tests.length) {
            return tests.map(function (item) {
                return typeof item === "string"
                    ? item
                    : firstValue(item, ["name", "testName", "label"], "Lab Test");
            }).join(", ");
        }

        return "Lab Test";
    }

    function getSpecimen(sample) {
        return firstValue(sample, [
            "specimenType", "specimen", "sampleType", "type"
        ]);
    }

    function getCompletedDate(sample) {
        return firstValue(sample, [
            "processingEndDate",
            "processingEndAt",
            "processingCompletedAt",
            "completedAt"
        ], "");
    }

    function getEntryStatus(result) {
        const status = String(result?.status || "Draft").toLowerCase();

        if (status === "submitted") return "submitted";
        return "draft";
    }

    function getStatusLabel(sample, result) {
        if (!result) return "Not Entered";
        return getEntryStatus(result) === "submitted" ? "Submitted" : "Draft";
    }

    function getStatusClass(sample, result) {
        if (!result) return "not-entered";
        return getEntryStatus(result);
    }

    function getLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function formatDate(value) {
        if (!value) return "N/A";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function getResultForSample(sample) {
        const sampleId = getSampleId(sample);

        return getResults().find(function (result) {
            return String(result.sampleId) === sampleId;
        }) || null;
    }

    // =========================================
    // 5. FIND SAMPLES READY FOR RESULT ENTRY
    // =========================================

    function isProcessingCompleted(sample) {
        return String(sample.processingStatus || "").toLowerCase() === "completed";
    }

    function getReadySamples() {
        return getSamples()
            .filter(isProcessingCompleted)
            .sort(function (a, b) {
                const dateA = new Date(getCompletedDate(a) || a.createdAt || 0);
                const dateB = new Date(getCompletedDate(b) || b.createdAt || 0);

                return dateB - dateA;
            });
    }

    // =========================================
    // 6. UPDATE STATISTICS
    // =========================================

    function updateStatistics() {
        const samples = getReadySamples();
        const results = getResults();

        const drafts = results.filter(result =>
            getEntryStatus(result) === "draft"
        );

        const submitted = results.filter(result =>
            getEntryStatus(result) === "submitted"
        );

        const readyForEntry = samples.filter(sample => {
            const result = getResultForSample(sample);
            return !result || getEntryStatus(result) !== "submitted";
        });

        elements.readyCount.textContent = readyForEntry.length;
        elements.draftCount.textContent = drafts.length;
        elements.submittedCount.textContent = submitted.length;
        elements.totalCount.textContent = results.length;
    }

    // =========================================
    // 7. DISPLAY READY SAMPLES
    // =========================================

    function renderReadySamples() {
        const searchTerm = elements.search.value.trim().toLowerCase();
        const selectedStatus = elements.statusFilter.value;

        const allSamples = getReadySamples();

        const filteredSamples = allSamples.filter(function (sample) {
            const result = getResultForSample(sample);

            const searchableText = [
                getSampleId(sample),
                getRequestId(sample),
                getPatientName(sample),
                getTestName(sample),
                getSpecimen(sample)
            ].join(" ").toLowerCase();

            const matchesSearch = !searchTerm ||
                searchableText.includes(searchTerm);

            let matchesStatus = true;

            if (selectedStatus === "not-entered") {
                matchesStatus = !result;
            } else if (selectedStatus === "draft") {
                matchesStatus = result && getEntryStatus(result) === "draft";
            } else if (selectedStatus === "submitted") {
                matchesStatus = result && getEntryStatus(result) === "submitted";
            }

            return matchesSearch && matchesStatus;
        });

        if (!filteredSamples.length) {
            const message = allSamples.length
                ? "No samples match your search or selected filter."
                : "No completed samples are ready for result entry.";

            elements.readyBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        ${escapeHTML(message)}
                    </td>
                </tr>
            `;

            elements.note.textContent = "";
            return;
        }

        elements.readyBody.innerHTML = filteredSamples.map(function (sample) {
            const result = getResultForSample(sample);
            const sampleId = getSampleId(sample);
            const status = getStatusLabel(sample, result);
            const statusClass = getStatusClass(sample, result);

            const actionLabel = result ? "Edit Result" : "Enter Result";

            return `
                <tr>
                    <td class="result-primary-cell">${escapeHTML(sampleId)}</td>
                    <td>${escapeHTML(getPatientName(sample))}</td>
                    <td>${escapeHTML(getTestName(sample))}</td>
                    <td>${escapeHTML(getSpecimen(sample))}</td>
                    <td>${escapeHTML(formatDate(getCompletedDate(sample)))}</td>
                    <td>
                        <span class="result-status ${statusClass}">
                            ${escapeHTML(status)}
                        </span>
                    </td>
                    <td>
                        <button
                            type="button"
                            class="result-action-btn"
                            data-sample-id="${escapeHTML(sampleId)}">
                            <i class="fas fa-pen"></i> ${actionLabel}
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        elements.note.textContent =
            `Showing ${filteredSamples.length} of ${allSamples.length} completed samples.`;
    }

    // =========================================
    // 8. DISPLAY RECENT RESULTS
    // =========================================

    function renderRecentResults() {
        const results = getResults().sort(function (a, b) {
            return new Date(b.updatedAt || b.createdAt || 0) -
                new Date(a.updatedAt || a.createdAt || 0);
        });

        if (!results.length) {
            elements.recentBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-message">
                        No results recorded yet.
                    </td>
                </tr>
            `;
            return;
        }

        elements.recentBody.innerHTML = results.map(function (result) {
            const sample = getSamples().find(item =>
                getSampleId(item) === String(result.sampleId)
            );

            const status = getEntryStatus(result);

            return `
                <tr>
                    <td class="result-primary-cell">${escapeHTML(result.resultId)}</td>
                    <td>${escapeHTML(result.sampleId)}</td>
                    <td>${escapeHTML(result.patientName || getPatientName(sample || {}))}</td>
                    <td>${escapeHTML(result.testName || getTestName(sample || {}))}</td>
                    <td>
                        ${escapeHTML(result.resultValue)}
                        ${escapeHTML(result.unit || "")}
                    </td>
                    <td>${escapeHTML(formatDate(result.updatedAt || result.createdAt))}</td>
                    <td>
                        <span class="result-status ${status}">
                            ${status === "submitted" ? "Submitted" : "Draft"}
                        </span>
                    </td>
                    <td>
                        <button
                            type="button"
                            class="result-action-btn"
                            data-edit-result="${escapeHTML(result.sampleId)}">
                            <i class="fas fa-eye"></i> View / Edit
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // =========================================
    // 9. OPEN RESULT MODAL
    // =========================================

    function openResultModal(sampleId) {
        const sample = getSamples().find(item =>
            getSampleId(item) === String(sampleId)
        );

        if (!sample || !isProcessingCompleted(sample)) {
            alert("This sample is not ready for result entry.");
            return;
        }

        const existingResult = getResultForSample(sample);

        elements.form.reset();

        elements.sampleId.value = getSampleId(sample);
        elements.existingResultId.value = existingResult?.resultId || "";

        elements.modalSample.textContent = getSampleId(sample);
        elements.modalRequest.textContent = getRequestId(sample);
        elements.modalPatient.textContent = getPatientName(sample);
        elements.modalTest.textContent = getTestName(sample);
        elements.modalSpecimen.textContent = getSpecimen(sample);
        elements.modalCompletedDate.textContent =
            formatDate(getCompletedDate(sample));

        elements.testResult.value = existingResult?.resultValue || "";
        elements.unit.value = existingResult?.unit || "";
        elements.referenceRange.value = existingResult?.referenceRange || "";
        elements.flag.value = existingResult?.flag || "Normal";
        elements.remarks.value = existingResult?.remarks || "";

        elements.enteredBy.value =
            existingResult?.enteredBy || technicianName;

        elements.entryDate.value =
            getLocalDate();

        document.getElementById("resultModalTitle").textContent =
            existingResult ? "Edit Test Result" : "Enter Test Result";

        elements.modal.classList.add("active");
        document.body.style.overflow = "hidden";

        elements.testResult.focus();
    }

    function closeResultModal() {
        elements.modal.classList.remove("active");
        document.body.style.overflow = "";
        elements.form.reset();
    }

    // =========================================
    // 10. SAVE RESULT
    // =========================================

    function saveResult(status) {
        const sampleId = elements.sampleId.value;

        const sample = getSamples().find(item =>
            getSampleId(item) === sampleId
        );

        if (!sample || !isProcessingCompleted(sample)) {
            alert("The selected sample is no longer available for result entry.");
            closeResultModal();
            renderPage();
            return;
        }

        const resultValue = elements.testResult.value.trim();

        if (!resultValue) {
            alert("Please enter the test result.");
            elements.testResult.focus();
            return;
        }

        const results = getResults();
        const existingIndex = results.findIndex(result =>
            String(result.sampleId) === sampleId
        );

        const now = new Date().toISOString();

        const existingResult = existingIndex >= 0
            ? results[existingIndex]
            : null;

        const resultRecord = {
            resultId: existingResult?.resultId ||
                `RES-${Date.now()}`,

            sampleId: sampleId,
            requestId: getRequestId(sample),

            patientId: firstValue(sample, ["patientId"], ""),
            patientName: getPatientName(sample),

            doctorId: firstValue(sample, ["doctorId"], ""),
            doctorName: firstValue(sample, ["doctorName"], ""),

            testName: getTestName(sample),
            specimenType: getSpecimen(sample),

            resultValue: resultValue,
            unit: elements.unit.value.trim(),
            referenceRange: elements.referenceRange.value.trim(),
            flag: elements.flag.value,
            remarks: elements.remarks.value.trim(),

            status: status,

            enteredBy: technicianName,
            enteredById: currentUser.id || "",

            createdAt: existingResult?.createdAt || now,
            updatedAt: now
        };

        if (existingIndex >= 0) {
            results[existingIndex] = resultRecord;
        } else {
            results.push(resultRecord);
        }

        saveArray(RESULT_KEY, results);

        // Link the result to the original sample.
        const samples = getSamples();
        const sampleIndex = samples.findIndex(item =>
            getSampleId(item) === sampleId
        );

        if (sampleIndex >= 0) {
            samples[sampleIndex].resultId = resultRecord.resultId;
            samples[sampleIndex].resultStatus = status;
            samples[sampleIndex].resultEnteredAt = now;

            saveArray(SAMPLE_KEY, samples);
        }

        window.dispatchEvent(new CustomEvent("labResultsUpdated"));

        closeResultModal();
        renderPage();

        alert(
            status === "submitted"
                ? "Result submitted successfully."
                : "Result saved as draft successfully."
        );
    }

    // =========================================
    // 11. EVENT LISTENERS
    // =========================================

    elements.readyBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-sample-id]");

        if (button) {
            openResultModal(button.dataset.sampleId);
        }
    });

    elements.recentBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-edit-result]");

        if (button) {
            openResultModal(button.dataset.editResult);
        }
    });

    elements.search.addEventListener("input", renderReadySamples);
    elements.statusFilter.addEventListener("change", renderReadySamples);

    elements.refresh.addEventListener("click", renderPage);

    elements.closeModal.addEventListener("click", closeResultModal);
    elements.cancelModal.addEventListener("click", closeResultModal);

    elements.modal.addEventListener("click", function (event) {
        if (event.target === elements.modal) {
            closeResultModal();
        }
    });

    elements.saveDraft.addEventListener("click", function () {
        if (!elements.form.reportValidity()) return;
        saveResult("Draft");
    });

    elements.form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!elements.form.reportValidity()) return;

        const confirmed = window.confirm(
            "Submit this result? You can still edit it later, but it will be marked as submitted."
        );

        if (!confirmed) return;

        saveResult("Submitted");
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && elements.modal.classList.contains("active")) {
            closeResultModal();
        }
    });

    // =========================================
    // 12. SIDEBAR
    // =========================================

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

        sidebar.querySelectorAll(".menu-item").forEach(function (link) {
            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });
        });
    }

    // =========================================
    // 13. LOGOUT
    // =========================================

    document.getElementById("logoutBtn").addEventListener("click", function () {
        const shouldLogout = window.confirm(
            "Are you sure you want to logout?"
        );

        if (!shouldLogout) return;

        localStorage.removeItem("semasacareSession");
        window.location.href = "../login.html";
    });

    // =========================================
    // 14. DATE
    // =========================================

    const dateElement = document.querySelector("#dashboardDate span");

    if (dateElement) {
        dateElement.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    // =========================================
    // 15. REFRESH WHEN OTHER PAGES CHANGE DATA
    // =========================================

    window.addEventListener("storage", function (event) {
        if (
            event.key === SAMPLE_KEY ||
            event.key === RESULT_KEY ||
            event.key === null
        ) {
            renderPage();
        }
    });

    window.addEventListener("labSamplesUpdated", renderPage);
    window.addEventListener("labResultsUpdated", renderPage);

    // =========================================
    // 16. INITIAL RENDER
    // =========================================

    function renderPage() {
        updateStatistics();
        renderReadySamples();
        renderRecentResults();
    }

    renderPage();
});
