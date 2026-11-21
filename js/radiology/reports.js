
/* ==========================================
   SEMASACARE - RADIOLOGY REPORTS
   File: js/radiology/reports.js
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
    const RESULTS_KEY = "semasacareRadiologyResults";
    const REPORTS_KEY = "semasacareRadiologyReports";

    // ELEMENTS
    const el = {
        radiologyName: document.getElementById("radiologyName"),
        headerName: document.getElementById("headerName"),
        dashboardDate: document.querySelector("#dashboardDate span"),

        awaitingReviewCount: document.getElementById("awaitingReviewCount"),
        draftReportCount: document.getElementById("draftReportCount"),
        releasedReportCount: document.getElementById("releasedReportCount"),
        totalReportCount: document.getElementById("totalReportCount"),

        pendingReportsBody: document.getElementById("pendingReportsBody"),
        generatedReportsBody: document.getElementById("generatedReportsBody"),
        pendingReportsNote: document.getElementById("pendingReportsNote"),
        generatedReportsNote: document.getElementById("generatedReportsNote"),

        pendingReportSearch: document.getElementById("pendingReportSearch"),
        generatedReportSearch: document.getElementById("generatedReportSearch"),
        reportStatusFilter: document.getElementById("reportStatusFilter"),
        refreshReports: document.getElementById("refreshReports"),

        reportModal: document.getElementById("reportModal"),
        reportForm: document.getElementById("reportForm"),
        reportModalTitle: document.getElementById("reportModalTitle"),
        reportResultId: document.getElementById("reportResultId"),
        reportFormMessage: document.getElementById("reportFormMessage"),

        modalResultId: document.getElementById("modalResultId"),
        modalPatientName: document.getElementById("modalPatientName"),
        modalPatientId: document.getElementById("modalPatientId"),
        modalExamination: document.getElementById("modalExamination"),
        modalDoctorName: document.getElementById("modalDoctorName"),
        modalResultDate: document.getElementById("modalResultDate"),

        sourceFindings: document.getElementById("sourceFindings"),
        sourceImpression: document.getElementById("sourceImpression"),
        sourceRecommendations: document.getElementById("sourceRecommendations"),

        reportTitle: document.getElementById("reportTitle"),
        reportContent: document.getElementById("reportContent"),
        reviewerName: document.getElementById("reviewerName"),

        saveReportDraft: document.getElementById("saveReportDraft"),

        viewReportModal: document.getElementById("viewReportModal"),
        viewReportId: document.getElementById("viewReportId"),
        viewReportPatient: document.getElementById("viewReportPatient"),
        viewReportExamination: document.getElementById("viewReportExamination"),
        viewReportDate: document.getElementById("viewReportDate"),
        viewReportStatus: document.getElementById("viewReportStatus"),
        viewReportReviewer: document.getElementById("viewReportReviewer"),
        viewReportContent: document.getElementById("viewReportContent"),

        printViewReport: document.getElementById("printViewReport"),

        sidebar: document.getElementById("sidebar"),
        menuToggle: document.getElementById("menuToggle"),
        logoutBtn: document.getElementById("logoutBtn")
    };

    let activeResult = null;
    let activeReport = null;

    // STORAGE HELPERS
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

    // GENERAL HELPERS
    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
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

    function generateReportId() {
        return `RAD-REP-${Date.now().toString().slice(-7)}`;
    }

    function getReportForResult(result, reports) {
        return reports.find(report =>
            String(report.resultId) === String(result.resultId)
        );
    }

    function getPendingResults() {
        const reports = readStorage(REPORTS_KEY);

        return readStorage(RESULTS_KEY).filter(result =>
            result.status === "Completed" &&
            !getReportForResult(result, reports)
        );
    }

    function displayDate() {
        if (!el.dashboardDate) return;

        el.dashboardDate.textContent = new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function displayUser() {
        const name = currentUser.name || "Radiology Technician";

        if (el.radiologyName) el.radiologyName.textContent = name;
        if (el.headerName) el.headerName.textContent = name;
    }

    // STATISTICS
    function loadStatistics() {
        const reports = readStorage(REPORTS_KEY);
        const pending = getPendingResults();

        const drafts = reports.filter(report => report.status === "Draft");
        const released = reports.filter(report => report.status === "Released");

        el.awaitingReviewCount.textContent = pending.length;
        el.draftReportCount.textContent = drafts.length;
        el.releasedReportCount.textContent = released.length;
        el.totalReportCount.textContent = reports.length;
    }

    // STATUS BADGE
    function statusBadge(status) {
        const normalized = String(status || "Draft").toLowerCase();

        return `
            <span class="report-status-badge ${escapeHTML(normalized)}">
                ${escapeHTML(status || "Draft")}
            </span>
        `;
    }

    // PENDING RESULTS TABLE
    function loadPendingReports() {
        const search = el.pendingReportSearch.value.trim().toLowerCase();

        const pending = getPendingResults().filter(result => {
            const searchable = [
                result.resultId,
                result.patientName,
                result.patientId,
                result.examination,
                result.doctorName
            ].join(" ").toLowerCase();

            return searchable.includes(search);
        });

        if (!pending.length) {
            el.pendingReportsBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        No results awaiting report.
                    </td>
                </tr>
            `;
        } else {
            el.pendingReportsBody.innerHTML = pending.map(result => `
                <tr>
                    <td>${escapeHTML(result.resultId)}</td>
                    <td>${escapeHTML(result.patientName || "-")}</td>
                    <td>${escapeHTML(result.examination || "-")}</td>
                    <td>${escapeHTML(formatDateTime(result.updatedAt || result.createdAt))}</td>
                    <td>${escapeHTML(result.recordedBy || "-")}</td>
                    <td>
                        <button
                            type="button"
                            class="report-action-btn report-prepare-btn"
                            data-action="prepare"
                            data-result-id="${escapeHTML(result.resultId)}"
                        >
                            <i class="fas fa-file-alt"></i> Prepare Report
                        </button>
                    </td>
                </tr>
            `).join("");
        }

        el.pendingReportsNote.textContent =
            `${pending.length} submitted result(s) awaiting report preparation.`;
    }

    // GENERATED REPORTS TABLE
    function loadGeneratedReports() {
        const reports = readStorage(REPORTS_KEY);

        const search = el.generatedReportSearch.value.trim().toLowerCase();
        const status = el.reportStatusFilter.value;

        const filtered = reports.filter(report => {
            const searchable = [
                report.reportId,
                report.patientName,
                report.patientId,
                report.examination,
                report.resultId
            ].join(" ").toLowerCase();

            return searchable.includes(search) &&
                (status === "all" || report.status === status);
        }).sort((a, b) =>
            new Date(b.updatedAt || b.createdAt || 0) -
            new Date(a.updatedAt || a.createdAt || 0)
        );

        if (!filtered.length) {
            el.generatedReportsBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        No reports generated.
                    </td>
                </tr>
            `;
        } else {
            el.generatedReportsBody.innerHTML = filtered.map(report => `
                <tr>
                    <td>${escapeHTML(report.reportId)}</td>
                    <td>${escapeHTML(report.patientName || "-")}</td>
                    <td>${escapeHTML(report.examination || "-")}</td>
                    <td>${escapeHTML(formatDateTime(report.updatedAt || report.createdAt))}</td>
                    <td>${statusBadge(report.status)}</td>
                    <td>
                        <button
                            type="button"
                            class="report-action-btn report-view-btn"
                            data-action="view"
                            data-report-id="${escapeHTML(report.reportId)}"
                        >
                            <i class="fas fa-eye"></i> View
                        </button>

                        ${report.status === "Draft" ? `
                            <button
                                type="button"
                                class="report-action-btn report-edit-btn"
                                data-action="edit"
                                data-report-id="${escapeHTML(report.reportId)}"
                            >
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ""}
                    </td>
                </tr>
            `).join("");
        }

        el.generatedReportsNote.textContent =
            `${filtered.length} report(s) displayed.`;
    }

    function loadPage() {
        loadStatistics();
        loadPendingReports();
        loadGeneratedReports();
    }

    // OPEN REPORT MODAL
    function openReportModal(result, existingReport = null) {
        activeResult = result;
        activeReport = existingReport;

        el.reportForm.reset();
        el.reportFormMessage.textContent = "";

        el.reportModalTitle.textContent = existingReport
            ? "Edit Radiology Report"
            : "Prepare Radiology Report";

        el.reportResultId.value = result.resultId;

        el.modalResultId.textContent = result.resultId || "-";
        el.modalPatientName.textContent = result.patientName || "-";
        el.modalPatientId.textContent = result.patientId || "-";
        el.modalExamination.textContent = result.examination || "-";
        el.modalDoctorName.textContent = result.doctorName || "-";
        el.modalResultDate.textContent =
            formatDateTime(result.updatedAt || result.createdAt);

        el.sourceFindings.textContent = result.findings || "-";
        el.sourceImpression.textContent = result.impression || "-";
        el.sourceRecommendations.textContent = result.recommendations || "-";

        if (existingReport) {
            el.reportTitle.value = existingReport.title || "";
            el.reportContent.value = existingReport.content || "";
            el.reviewerName.value = existingReport.reviewerName || "";
        }

        el.reportModal.classList.add("show");
    }

    function closeReportModal() {
        el.reportModal.classList.remove("show");
        el.reportForm.reset();
        el.reportFormMessage.textContent = "";

        activeResult = null;
        activeReport = null;
    }

    // SAVE REPORT
    function saveReport(status) {
        if (!activeResult) return;

        const title = el.reportTitle.value.trim();
        const content = el.reportContent.value.trim();
        const reviewerName = el.reviewerName.value.trim();

        if (!title || !content) {
            el.reportFormMessage.textContent =
                "Please enter the report title and report summary.";
            return;
        }

        if (status === "Released" && !reviewerName) {
            el.reportFormMessage.textContent =
                "Enter the authorized reviewer's name before releasing the report.";
            return;
        }

        const reports = readStorage(REPORTS_KEY);
        const now = new Date().toISOString();

        const existingIndex = reports.findIndex(report =>
            String(report.resultId) === String(activeResult.resultId)
        );

        const existing = existingIndex >= 0
            ? reports[existingIndex]
            : null;
        const newReportId = generateReportId();
        const reportRecord = {
            ...(existing || {}),

            id: existing?.id || newReportId,
            reportId: existing?.reportId || newReportId,

            resultId: activeResult.resultId,
            scheduleId: activeResult.scheduleId || "",
            requestId: activeResult.requestId || "",

            patientId: activeResult.patientId || "",
            patientName: activeResult.patientName || "",
            patientEmail: activeResult.patientEmail || "",
            patientPhone: activeResult.patientPhone || "",

            doctorId: activeResult.doctorId || "",
            doctorEmail: activeResult.doctorEmail || "",
            doctorName: activeResult.doctorName || "",

            examination: activeResult.examination || "",
            priority: activeResult.priority || "Normal",

            findings: activeResult.findings || "",
            impression: activeResult.impression || "",
            recommendations: activeResult.recommendations || "",

            title,
            content,
            reviewerName,
            status,

            createdAt: existing?.createdAt || now,
            updatedAt: now,

            preparedBy: currentUser.name || "Radiology Technician",
            preparedById: currentUser.id || currentUser.email || "",

            releasedAt: status === "Released" ? now : (existing?.releasedAt || null)
        };

        if (existingIndex >= 0) {
            reports[existingIndex] = reportRecord;
        } else {
            reports.push(reportRecord);
        }

        writeStorage(REPORTS_KEY, reports);

        window.dispatchEvent(
            new CustomEvent("semasacare:radiologyReportsUpdated")
        );

        closeReportModal();
        loadPage();
    }

    // =====================================
    // VIEW REPORT
    // =====================================

    function openViewReport(report) {
        activeReport = report;

        el.viewReportId.textContent = report.reportId || "-";
        el.viewReportPatient.textContent = report.patientName || "-";
        el.viewReportExamination.textContent = report.examination || "-";

        el.viewReportDate.textContent = formatDateTime(
            report.releasedAt || report.updatedAt || report.createdAt
        );

        el.viewReportStatus.textContent = report.status || "-";
        el.viewReportReviewer.textContent = report.reviewerName || "-";
        el.viewReportContent.textContent = report.content || "-";

        el.viewReportModal.classList.add("show");
    }

    function closeViewReport() {
        el.viewReportModal.classList.remove("show");
        activeReport = null;
    }

    // =====================================
    // PRINT RADIOLOGY REPORT
    // =====================================

    function printRadiologyReport() {
        if (!activeReport) {
            alert("Please open a report before printing.");
            return;
        }

        const report = activeReport;

        const safe = value => escapeHTML(value || "N/A");

        // Open the print window directly from the button click
        const printWindow = window.open("", "_blank", "width=900,height=750");

        if (!printWindow) {
            alert("Printing was blocked. Please allow pop-ups for this website and try again.");
            return;
        }

        const reportDate = formatDateTime(
            report.releasedAt || report.updatedAt || report.createdAt
        );

        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Radiology Report - ${safe(report.reportId)}</title>

            <style>
                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #183b4a;
                    max-width: 850px;
                    margin: 30px auto;
                    padding: 25px;
                    line-height: 1.6;
                }

                header {
                    border-bottom: 3px solid #0d9488;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }

                header h1 {
                    margin: 0;
                    color: #124354;
                }

                header p {
                    color: #64748b;
                    margin: 5px 0;
                }

                .report-id {
                    color: #087f78;
                    font-weight: bold;
                    margin-top: 12px;
                }

                .details {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    padding: 18px;
                    background: #f3f8f9;
                    border-radius: 8px;
                    margin-bottom: 25px;
                }

                .details small {
                    display: block;
                    color: #64748b;
                }

                .section {
                    margin: 22px 0;
                    page-break-inside: avoid;
                }

                .section h3 {
                    color: #087f78;
                    border-bottom: 1px solid #dce7e9;
                    padding-bottom: 7px;
                }

                .section p {
                    white-space: pre-wrap;
                    overflow-wrap: anywhere;
                }

                .signature {
                    margin-top: 45px;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 12px;
                    width: 260px;
                }

                footer {
                    margin-top: 35px;
                    border-top: 1px solid #dce7e9;
                    padding-top: 12px;
                    text-align: center;
                    font-size: 10px;
                    color: #64748b;
                }

                @page {
                    size: A4;
                    margin: 15mm;
                }

                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>

        <body>
            <header>
                <h1>SemasaCare</h1>
                <p>Radiology Department | Diagnostic Imaging Report</p>
                <div class="report-id">
                    Report ID: ${safe(report.reportId)}
                </div>
            </header>

            <div class="details">
                <div>
                    <small>Patient Name</small>
                    <strong>${safe(report.patientName)}</strong>
                </div>

                <div>
                    <small>Patient ID</small>
                    <strong>${safe(report.patientId)}</strong>
                </div>

                <div>
                    <small>Examination</small>
                    <strong>${safe(report.examination)}</strong>
                </div>

                <div>
                    <small>Doctor</small>
                    <strong>${safe(report.doctorName)}</strong>
                </div>

                <div>
                    <small>Report Date</small>
                    <strong>${safe(reportDate)}</strong>
                </div>

                <div>
                    <small>Status</small>
                    <strong>${safe(report.status)}</strong>
                </div>
            </div>

            <section class="section">
                <h3>Findings</h3>
                <p>${safe(report.findings)}</p>
            </section>

            <section class="section">
                <h3>Impression</h3>
                <p>${safe(report.impression)}</p>
            </section>

            <section class="section">
                <h3>Recommendations</h3>
                <p>${safe(report.recommendations)}</p>
            </section>

            <section class="section">
                <h3>Radiology Report Summary</h3>
                <p>${safe(report.content)}</p>
            </section>

            <div class="signature">
                <strong>${safe(report.reviewerName)}</strong><br>
                Authorized Reviewer<br>
                Radiology Department
            </div>

            <footer>
                Generated by SemasaCare Hospital Management System
            </footer>
        </body>
        </html>
    `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for the print document to render before opening print dialog
        printWindow.setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 700);
    }

    // PENDING TABLE ACTION
    el.pendingReportsBody.addEventListener("click", event => {
        const button = event.target.closest("[data-action='prepare']");
        if (!button) return;

        const result = readStorage(RESULTS_KEY).find(item =>
            String(item.resultId) === String(button.dataset.resultId)
        );

        if (result && result.status === "Completed") {
            openReportModal(result);
        }
    });

    // GENERATED REPORT TABLE ACTIONS
    el.generatedReportsBody.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const report = readStorage(REPORTS_KEY).find(item =>
            String(item.reportId) === String(button.dataset.reportId)
        );

        if (!report) return;

        if (button.dataset.action === "view") {
            openViewReport(report);
        }

        if (button.dataset.action === "edit" && report.status === "Draft") {
            const result = readStorage(RESULTS_KEY).find(item =>
                String(item.resultId) === String(report.resultId)
            );

            if (result) {
                openReportModal(result, report);
            }
        }
    });



    // FORM EVENTS
    el.reportForm.addEventListener("submit", event => {
        event.preventDefault();
        saveReport("Released");
    });

    el.saveReportDraft.addEventListener("click", () => {
        saveReport("Draft");
    });

    el.printViewReport?.addEventListener(
        "click",
        printRadiologyReport
    );

    document.getElementById("closeReportModal")
        .addEventListener("click", closeReportModal);

    document.getElementById("cancelReport")
        .addEventListener("click", closeReportModal);

    document.getElementById("closeViewReport")
        .addEventListener("click", closeViewReport);

    document.getElementById("closeViewReportBtn")
        .addEventListener("click", closeViewReport);

    // SEARCH AND FILTER
    el.pendingReportSearch.addEventListener("input", loadPendingReports);
    el.generatedReportSearch.addEventListener("input", loadGeneratedReports);
    el.reportStatusFilter.addEventListener("change", loadGeneratedReports);
    el.refreshReports.addEventListener("click", loadPage);

    // SIDEBAR
    el.menuToggle?.addEventListener("click", () => {
        el.sidebar?.classList.toggle("active");
    });

    el.sidebar?.querySelectorAll(".menu-item").forEach(link => {
        link.addEventListener("click", () => {
            el.sidebar.classList.remove("active");
        });
    });

    // LOGOUT
    el.logoutBtn?.addEventListener("click", () => {
        if (typeof logout === "function") {
            logout();
        }
    });

    // STORAGE UPDATES
    window.addEventListener("storage", event => {
        if ([RESULTS_KEY, REPORTS_KEY].includes(event.key)) {
            loadPage();
        }
    });

    // =====================================
    // LOGOUT
    // =====================================

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            const confirmLogout = window.confirm(
                "Are you sure you want to logout?"
            );

            // Cancel means stay on the Scheduling page
            if (!confirmLogout) {
                return;
            }

            // Only remove session after confirmation
            localStorage.removeItem("semasacareSession");

            window.location.replace("../login.html");
        });
    }

    window.addEventListener("semasacare:radiologyResultsUpdated", loadPage);
    window.addEventListener("semasacare:radiologyReportsUpdated", loadPage);

    // INITIALIZE
    displayUser();
    displayDate();
    loadPage();
});
