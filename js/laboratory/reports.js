
(function () {
    "use strict";

    // --------------------------------------------------
    // 1. AUTHENTICATION
    // --------------------------------------------------

    if (typeof SemasaAuth === "undefined") {
        window.location.href = "../login.html";
        return;
    }

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "laboratory") {
        window.location.href = "../login.html";
        return;
    }

    const laboratoryName =
        currentUser.name ||
        currentUser.fullName ||
        currentUser.username ||
        "Laboratory Staff";

    const laboratoryId = currentUser.id || currentUser.userId || "";

    // --------------------------------------------------
    // 2. STORAGE KEYS
    // --------------------------------------------------

    const RESULT_KEY = "semasacareLabResults";
    const SAMPLE_KEY = "semasacareLabSamples";
    const REQUEST_KEY = "semasacareLabRequests";
    const REPORT_KEY = "semasacareLabReports";

    let selectedResultId = null;
    let selectedReportId = null;

    // --------------------------------------------------
    // 3. ELEMENTS
    // --------------------------------------------------

    const pendingReportsBody =
        document.getElementById("pendingReportsBody");

    const releasedReportsBody =
        document.getElementById("releasedReportsBody");

    const reviewModal = document.getElementById("reviewModal");
    const viewReportModal = document.getElementById("viewReportModal");

    // --------------------------------------------------
    // 4. STORAGE HELPERS
    // --------------------------------------------------

    function getArray(key) {
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

        window.dispatchEvent(new CustomEvent(
            key === RESULT_KEY ? "labResultsUpdated" :
                key === SAMPLE_KEY ? "labSamplesUpdated" :
                    key === REQUEST_KEY ? "labRequestsUpdated" :
                        "labReportsUpdated"
        ));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[char];
        });
    }

    function valueOf(object, fields, fallback = "-") {
        for (const field of fields) {
            if (
                object &&
                object[field] !== undefined &&
                object[field] !== null &&
                object[field] !== ""
            ) {
                return object[field];
            }
        }

        return fallback;
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function formatDateTime(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return value;

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function generateReportId() {
        const reports = getArray(REPORT_KEY);

        let reportId;

        do {
            reportId =
                "LAB-RPT-" +
                Date.now().toString().slice(-7) +
                Math.floor(100 + Math.random() * 900);
        } while (
            reports.some(report => report.reportId === reportId)
        );

        return reportId;
    }

    // --------------------------------------------------
    // 5. LOOKUP HELPERS
    // --------------------------------------------------

    function getResultId(result) {
        return String(valueOf(result, ["resultId", "id"], ""));
    }

    function getSampleId(result) {
        return String(valueOf(result, ["sampleId"], ""));
    }

    function getRequestId(result) {
        return String(valueOf(result, ["requestId", "labRequestId"], ""));
    }

    function getResultStatus(result) {
        return String(valueOf(result, ["status"], "Draft"))
            .trim()
            .toLowerCase();
    }

    function findSample(sampleId) {
        return getArray(SAMPLE_KEY).find(sample =>
            String(sample.sampleId) === String(sampleId)
        );
    }

    function isSampleProcessingCompleted(sample) {
        if (!sample) return false;

        return String(sample.processingStatus || "")
            .trim()
            .toLowerCase() === "completed";
    }

    function findMatchingSample(result) {
        return findSample(getSampleId(result));
    }

    function isEligibleForVerification(result) {
        if (getResultStatus(result) !== "submitted") {
            return false;
        }

        const sample = findMatchingSample(result);

        return isSampleProcessingCompleted(sample);
    }

    function isAlreadyReleased(result) {
        return getArray(REPORT_KEY).some(report =>
            String(report.resultId) === getResultId(result)
        );
    }

    // --------------------------------------------------
    // 6. DISPLAY HELPERS
    // --------------------------------------------------

    function resultValue(result) {
        const value = valueOf(result, ["resultValue"]);
        const unit = valueOf(result, ["unit"], "");

        return unit && unit !== "-"
            ? `${value} ${unit}`
            : value;
    }

    function updateStatistics() {
        const results = getArray(RESULT_KEY);
        const reports = getArray(REPORT_KEY);

        const pending = results.filter(result =>
            isEligibleForVerification(result) &&
            !isAlreadyReleased(result)
        );

        document.getElementById("pendingReportCount").textContent =
            pending.length;

        document.getElementById("verifiedReportCount").textContent =
            reports.filter(report =>
                report.status === "Verified" ||
                report.status === "Released"
            ).length;

        document.getElementById("releasedReportCount").textContent =
            reports.filter(report =>
                report.status === "Released"
            ).length;

        document.getElementById("totalReportCount").textContent =
            reports.length;
    }

    // --------------------------------------------------
    // 7. PENDING VERIFICATION TABLE
    // --------------------------------------------------

    function renderPendingReports() {
        const results = getArray(RESULT_KEY);

        const search = document.getElementById("pendingSearch")
            .value.trim().toLowerCase();

        const pending = results.filter(result => {
            if (!isEligibleForVerification(result)) return false;
            if (isAlreadyReleased(result)) return false;

            const searchable = [
                getSampleId(result),
                getRequestId(result),
                result.patientName,
                result.testName,
                result.specimenType,
                result.resultValue
            ].join(" ").toLowerCase();

            return searchable.includes(search);
        });

        if (!pending.length) {
            pendingReportsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No results awaiting verification.
                    </td>
                </tr>
            `;
            return;
        }

        pendingReportsBody.innerHTML = pending.map(result => `
            <tr>
                <td>${escapeHTML(getSampleId(result))}</td>
                <td>${escapeHTML(valueOf(result, ["patientName"]))}</td>
                <td>${escapeHTML(valueOf(result, ["testName"]))}</td>
                <td>${escapeHTML(valueOf(result, ["specimenType"]))}</td>
                <td>
                    ${escapeHTML(resultValue(result))}
                    <br>
                    <small>${escapeHTML(valueOf(result, ["flag"], "No flag"))}</small>
                </td>
                <td>${escapeHTML(valueOf(result, ["enteredBy"]))}</td>
                <td>
                    <button class="table-action action-review"
                        data-review-id="${escapeHTML(getResultId(result))}">
                        <i class="fas fa-eye"></i> Review
                    </button>
                </td>
            </tr>
        `).join("");
    }

    // --------------------------------------------------
    // 8. RELEASED REPORTS TABLE
    // --------------------------------------------------

    function renderReleasedReports() {
        const reports = getArray(REPORT_KEY);

        const search = document.getElementById("releasedSearch")
            .value.trim().toLowerCase();

        const statusFilter = document.getElementById(
            "releasedStatusFilter"
        ).value;

        const filtered = reports.filter(report => {
            const searchable = [
                report.reportId,
                report.patientName,
                report.testName,
                report.sampleId,
                report.requestId,
                report.verifiedBy
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(search);

            const matchesStatus =
                statusFilter === "all" ||
                report.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            releasedReportsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No released reports found.
                    </td>
                </tr>
            `;
            return;
        }

        releasedReportsBody.innerHTML = filtered
            .sort((a, b) =>
                new Date(b.releasedAt || b.verifiedAt || 0) -
                new Date(a.releasedAt || a.verifiedAt || 0)
            )
            .map(report => `
                <tr>
                    <td>${escapeHTML(report.reportId)}</td>
                    <td>${escapeHTML(report.patientName)}</td>
                    <td>${escapeHTML(report.testName)}</td>
                    <td>${escapeHTML(report.sampleId)}</td>
                    <td>${escapeHTML(report.verifiedBy)}</td>
                    <td>${escapeHTML(formatDate(report.releasedAt))}</td>
                    <td>
                        <button class="table-action action-view"
                            data-report-id="${escapeHTML(report.reportId)}">
                            <i class="fas fa-file-alt"></i> View
                        </button>
                    </td>
                </tr>
            `).join("");
    }

    // --------------------------------------------------
    // 9. REVIEW RESULT
    // --------------------------------------------------

    function openReviewModal(resultId) {
        const result = getArray(RESULT_KEY).find(item =>
            getResultId(item) === String(resultId)
        );

        if (!result || !isEligibleForVerification(result)) {
            alert("This result is no longer eligible for verification.");
            refreshPage();
            return;
        }

        if (isAlreadyReleased(result)) {
            alert("A report has already been released for this result.");
            refreshPage();
            return;
        }

        selectedResultId = String(resultId);

        document.getElementById("reviewPatient").textContent =
            valueOf(result, ["patientName"]);

        document.getElementById("reviewSampleId").textContent =
            getSampleId(result);

        document.getElementById("reviewRequestId").textContent =
            getRequestId(result);

        document.getElementById("reviewTestName").textContent =
            valueOf(result, ["testName"]);

        document.getElementById("reviewSpecimen").textContent =
            valueOf(result, ["specimenType"]);

        document.getElementById("reviewResult").textContent =
            resultValue(result);

        document.getElementById("reviewReference").textContent =
            valueOf(result, ["referenceRange"]);

        document.getElementById("reviewFlag").textContent =
            valueOf(result, ["flag"]);

        document.getElementById("reviewEnteredBy").textContent =
            valueOf(result, ["enteredBy"]);

        document.getElementById("reviewRemarks").textContent =
            valueOf(result, ["remarks"]);

        reviewModal.classList.add("active");
        reviewModal.setAttribute("aria-hidden", "false");
    }

    function closeReviewModal() {
        reviewModal.classList.remove("active");
        reviewModal.setAttribute("aria-hidden", "true");
        selectedResultId = null;
    }

    // --------------------------------------------------
    // 10. VERIFY AND RELEASE REPORT
    // --------------------------------------------------

    function verifyAndReleaseReport() {
        if (!selectedResultId) {
            alert("Please select a result first.");
            return;
        }

        const results = getArray(RESULT_KEY);
        const samples = getArray(SAMPLE_KEY);
        const requests = getArray(REQUEST_KEY);
        const reports = getArray(REPORT_KEY);

        const resultIndex = results.findIndex(result =>
            getResultId(result) === selectedResultId
        );

        if (resultIndex === -1) {
            alert("Result record could not be found.");
            closeReviewModal();
            refreshPage();
            return;
        }

        const result = results[resultIndex];

        if (!isEligibleForVerification(result)) {
            alert("This result is no longer eligible for verification.");
            closeReviewModal();
            refreshPage();
            return;
        }

        if (reports.some(report =>
            String(report.resultId) === selectedResultId
        )) {
            alert("A report already exists for this result.");
            closeReviewModal();
            refreshPage();
            return;
        }

        const sampleId = getSampleId(result);

        const sampleIndex = samples.findIndex(sample =>
            String(sample.sampleId) === sampleId
        );

        if (sampleIndex === -1) {
            alert("Linked sample record could not be found.");
            return;
        }

        if (!isSampleProcessingCompleted(samples[sampleIndex])) {
            alert("The linked sample has not completed processing.");
            return;
        }

        const requestId = getRequestId(result);

        const reportId = generateReportId();
        const now = new Date().toISOString();

        // Create report record
        const report = {
            reportId: reportId,
            resultId: getResultId(result),
            sampleId: sampleId,
            requestId: requestId,

            patientId: valueOf(result, ["patientId"], ""),
            patientName: valueOf(result, ["patientName"]),
            doctorId: valueOf(result, ["doctorId"], ""),
            doctorName: valueOf(result, ["doctorName"]),

            testName: valueOf(result, ["testName"]),
            specimenType: valueOf(result, ["specimenType"]),

            resultValue: valueOf(result, ["resultValue"]),
            unit: valueOf(result, ["unit"], ""),
            referenceRange: valueOf(result, ["referenceRange"]),
            flag: valueOf(result, ["flag"]),
            remarks: valueOf(result, ["remarks"]),

            enteredBy: valueOf(result, ["enteredBy"]),
            enteredById: valueOf(result, ["enteredById"], ""),

            verifiedBy: laboratoryName,
            verifiedById: laboratoryId,
            verifiedAt: now,

            releasedBy: laboratoryName,
            releasedById: laboratoryId,
            releasedAt: now,

            status: "Released",
            createdAt: now,
            updatedAt: now
        };

        // Update result
        results[resultIndex].status = "Verified";
        results[resultIndex].verifiedBy = laboratoryName;
        results[resultIndex].verifiedById = laboratoryId;
        results[resultIndex].verifiedAt = now;
        results[resultIndex].reportId = reportId;
        results[resultIndex].updatedAt = now;

        // Update linked sample
        samples[sampleIndex].resultStatus = "Verified";
        samples[sampleIndex].resultVerifiedAt = now;
        samples[sampleIndex].reportId = reportId;

        // Update linked request
        const requestIndex = requests.findIndex(request =>
            String(
                request.requestId ||
                request.id ||
                request.labRequestId ||
                ""
            ) === requestId
        );

        if (requestIndex !== -1) {
            requests[requestIndex].status = "Report Released";
            requests[requestIndex].reportId = reportId;
            requests[requestIndex].reportReleasedAt = now;
        }

        // Save all records
        reports.push(report);

        saveArray(RESULT_KEY, results);
        saveArray(SAMPLE_KEY, samples);

        if (requestIndex !== -1) {
            saveArray(REQUEST_KEY, requests);
        }

        saveArray(REPORT_KEY, reports);

        closeReviewModal();
        refreshPage();

        alert(
            "Laboratory report verified and released successfully.\n\n" +
            "Report ID: " + reportId
        );
    }

    // --------------------------------------------------
    // 11. VIEW RELEASED REPORT
    // --------------------------------------------------

    function openReportView(reportId) {
        const report = getArray(REPORT_KEY).find(item =>
            String(item.reportId) === String(reportId)
        );

        if (!report || report.status !== "Released") {
            alert("Released report could not be found.");
            return;
        }

        selectedReportId = String(reportId);

        const fields = [
            ["Report ID", report.reportId],
            ["Patient Name", report.patientName],
            ["Patient ID", report.patientId],
            ["Doctor Name", report.doctorName],
            ["Request ID", report.requestId],
            ["Sample ID", report.sampleId],
            ["Test Name", report.testName],
            ["Specimen Type", report.specimenType],
            ["Result", resultValue(report)],
            ["Reference Range", report.referenceRange],
            ["Result Flag", report.flag],
            ["Remarks", report.remarks],
            ["Entered By", report.enteredBy],
            ["Verified By", report.verifiedBy],
            ["Verified At", formatDateTime(report.verifiedAt)],
            ["Released At", formatDateTime(report.releasedAt)],
            ["Report Status", report.status]
        ];

        document.getElementById("reportPrintDetails").innerHTML =
            fields.map(([label, value]) => `
                <div class="print-field">
                    <span>${escapeHTML(label)}</span>
                    <strong>${escapeHTML(valueOf({ value }, ["value"]))}</strong>
                </div>
            `).join("");

        viewReportModal.classList.add("active");
        viewReportModal.setAttribute("aria-hidden", "false");
    }

    function closeReportView() {
        viewReportModal.classList.remove("active");
        viewReportModal.setAttribute("aria-hidden", "true");
        selectedReportId = null;
    }

    // --------------------------------------------------
    // 12. REFRESH
    // --------------------------------------------------

    function refreshPage() {
        updateStatistics();
        renderPendingReports();
        renderReleasedReports();
    }

    // --------------------------------------------------
    // 13. EVENT LISTENERS
    // --------------------------------------------------

    document.getElementById("pendingSearch")
        .addEventListener("input", renderPendingReports);

    document.getElementById("releasedSearch")
        .addEventListener("input", renderReleasedReports);

    document.getElementById("releasedStatusFilter")
        .addEventListener("change", renderReleasedReports);

    document.getElementById("refreshReports")
        .addEventListener("click", refreshPage);

    pendingReportsBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-review-id]");

        if (button) {
            openReviewModal(button.dataset.reviewId);
        }
    });

    releasedReportsBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-report-id]");

        if (button) {
            openReportView(button.dataset.reportId);
        }
    });

    document.getElementById("verifyReleaseBtn")
        .addEventListener("click", verifyAndReleaseReport);

    document.getElementById("closeReviewModal")
        .addEventListener("click", closeReviewModal);

    document.getElementById("cancelReview")
        .addEventListener("click", closeReviewModal);

    document.getElementById("closeViewReport")
        .addEventListener("click", closeReportView);

    document.getElementById("closeReportView")
        .addEventListener("click", closeReportView);

    document.getElementById("printReportBtn")
        .addEventListener("click", function () {
            if (!selectedReportId) return;
            window.print();
        });

    // Close modals by clicking outside
    reviewModal.addEventListener("click", function (event) {
        if (event.target === reviewModal) {
            closeReviewModal();
        }
    });

    viewReportModal.addEventListener("click", function (event) {
        if (event.target === viewReportModal) {
            closeReportView();
        }
    });

    // --------------------------------------------------
    // 14. SIDEBAR AND LOGOUT
    // --------------------------------------------------

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });
    }

    document.getElementById("logoutBtn")
        .addEventListener("click", function () {
            const confirmed = confirm("Are you sure you want to logout?");

            if (!confirmed) return;

            SemasaAuth.logout();
            window.location.href = "../login.html";
        });

    // --------------------------------------------------
    // 15. DATE AND PROFILE
    // --------------------------------------------------

    document.getElementById("headerName").textContent = laboratoryName;

    document.getElementById("dashboardDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    // --------------------------------------------------
    // 16. LIVE STORAGE UPDATES
    // --------------------------------------------------

    window.addEventListener("storage", function (event) {
        if (
            !event.key ||
            [
                RESULT_KEY,
                SAMPLE_KEY,
                REQUEST_KEY,
                REPORT_KEY
            ].includes(event.key)
        ) {
            refreshPage();
        }
    });

    window.addEventListener("labResultsUpdated", refreshPage);
    window.addEventListener("labSamplesUpdated", refreshPage);
    window.addEventListener("labRequestsUpdated", refreshPage);
    window.addEventListener("labReportsUpdated", refreshPage);

    // Initial load
    refreshPage();

})();
