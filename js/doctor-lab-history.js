
/* ==========================================
   SEMASACARE - DOCTOR LAB REQUEST HISTORY
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // 1. AUTHENTICATION
    // =====================================

    const currentUser = SemasaAuth.getCurrentUser();

    if (!currentUser || currentUser.role !== "doctor") {
        return;
    }

    const doctorId = String(currentUser.id ?? "").trim();

    const doctorEmail = String(currentUser.email || "")
        .trim()
        .toLowerCase();


    // =====================================
    // 2. HTML ELEMENTS
    // =====================================

    const historyBody =
        document.getElementById("doctorLabHistoryBody");

    const requestCount =
        document.getElementById("doctorLabRequestCount");

    const searchInput =
        document.getElementById("doctorLabSearch");

    const statusFilter =
        document.getElementById("doctorLabStatusFilter");


    // Stop if the history section is not present
    if (!historyBody) {
        console.warn("Doctor laboratory history table not found.");
        return;
    }


    // =====================================
    // 3. STORAGE
    // =====================================

    const LAB_REQUESTS_KEY = "semasacareLabRequests";

    function getLabRequests() {

        try {

            const requests = JSON.parse(
                localStorage.getItem(LAB_REQUESTS_KEY) || "[]"
            );

            return Array.isArray(requests) ? requests : [];

        } catch (error) {

            console.error(
                "Unable to read laboratory requests:",
                error
            );

            return [];
        }
    }


    // =====================================
    // 4. GET REQUESTS FOR LOGGED-IN DOCTOR
    // =====================================

    function getDoctorLabRequests() {

        return getLabRequests().filter(request => {

            const requestDoctorId =
                String(request.doctorId || "").trim();

            const requestDoctorEmail =
                String(request.doctorEmail || "")
                    .trim()
                    .toLowerCase();

            return (

                (doctorId &&
                    requestDoctorId === doctorId) ||

                (doctorEmail &&
                    requestDoctorEmail === doctorEmail)
            );
        });
    }


    // =====================================
    // 5. SECURITY - HTML ESCAPING
    // =====================================

    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]
        );
    }


    // =====================================
    // 6. FORMAT TEST NAMES
    // =====================================

    function getTestNames(request) {

        if (Array.isArray(request.tests)) {
            return request.tests.join(", ");
        }

        if (typeof request.tests === "string") {
            return request.tests;
        }

        return (
            request.testName ||
            request.test ||
            "Not specified"
        );
    }


    // =====================================
    // 7. STATUS NORMALIZATION
    // =====================================

    function getRequestStatus(status) {

        const value = String(status || "")
            .trim()
            .toLowerCase();

        if (value.includes("cancel")) {
            return {
                label: "Cancelled",
                className: "cancelled"
            };
        }

        if (
            value.includes("complete") ||
            value.includes("verified") ||
            value.includes("released")
        ) {
            return {
                label: "Completed",
                className: "completed"
            };
        }

        if (value.includes("process")) {
            return {
                label: "Processing",
                className: "processing"
            };
        }

        if (
            value.includes("collect") &&
            !value.includes("await")
        ) {
            return {
                label: "Sample Collected",
                className: "collected"
            };
        }

        if (
            value.includes("await") ||
            value.includes("pending") ||
            value.includes("accepted")
        ) {
            return {
                label: "Awaiting Sample",
                className: "awaiting"
            };
        }

        return {
            label: status || "Submitted",
            className: "neutral"
        };
    }


    // =====================================
    // 8. DATE FORMATTING
    // =====================================

    function formatDate(value) {

        if (!value) return "—";

        // Handle YYYY-MM-DD without timezone shifting
        const dateString = String(value);

        const dateOnlyMatch = dateString.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (dateOnlyMatch) {

            const [, year, month, day] = dateOnlyMatch;

            return new Date(
                Number(year),
                Number(month) - 1,
                Number(day)
            ).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }


    function getRequestTimestamp(request) {

        const value =
            request.requestedAt ||
            request.createdAt ||
            request.requestDate;

        const timestamp = new Date(value || 0).getTime();

        return Number.isNaN(timestamp) ? 0 : timestamp;
    }


    // =====================================
    // 9. EMPTY TABLE MESSAGE
    // =====================================

    function showEmptyMessage(message) {

        historyBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }


    // =====================================
    // 10. RENDER LAB REQUEST HISTORY
    // =====================================

    function renderDoctorLabHistory() {

        const allRequests = getDoctorLabRequests();

        const searchTerm = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const selectedStatus = statusFilter
            ? statusFilter.value
            : "all";


        // Request count
        if (requestCount) {

            requestCount.textContent =
                `${allRequests.length} Request${allRequests.length === 1 ? "" : "s"}`;
        }


        // Search and filter
        const filteredRequests = allRequests.filter(request => {

            const status = getRequestStatus(request.status);

            const searchableContent = [

                request.requestId,

                request.id,

                request.patientName,

                request.patientId,

                getTestNames(request),

                request.priority,

                request.status

            ].join(" ").toLowerCase();

            const matchesSearch =
                !searchTerm ||
                searchableContent.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                status.className === selectedStatus;

            return matchesSearch && matchesStatus;
        });


        // Latest requests first
        filteredRequests.sort((a, b) =>
            getRequestTimestamp(b) - getRequestTimestamp(a)
        );


        // No results
        if (filteredRequests.length === 0) {

            showEmptyMessage(
                allRequests.length > 0
                    ? "No laboratory requests match your search or filter."
                    : "You have not sent any laboratory requests yet."
            );

            return;
        }


        // Render table
        historyBody.innerHTML = filteredRequests.map(request => {

            const status = getRequestStatus(request.status);

            const requestId =
                request.requestId || request.id || "N/A";

            const requestDate =
                request.requestDate ||
                request.requestedAt ||
                request.createdAt;

            return `
                <tr>

                    <td class="lab-primary-cell">
                        ${escapeHTML(requestId)}
                    </td>

                    <td>
                        ${escapeHTML(
                request.patientName || "Unknown Patient"
            )}
                    </td>

                    <td>
                        ${escapeHTML(getTestNames(request))}
                    </td>

                    <td>
                        ${formatDate(requestDate)}
                    </td>

                    <td>
                        ${escapeHTML(request.priority || "Routine")}
                    </td>

                    <td>
                        <span class="doctor-lab-status ${status.className}">
                            ${escapeHTML(status.label)}
                        </span>
                    </td>

                </tr>
            `;

        }).join("");
    }


    // =====================================
    // 11. SEARCH EVENT
    // =====================================

    searchInput?.addEventListener("input", () => {
        renderDoctorLabHistory();
    });


    // =====================================
    // 12. STATUS FILTER EVENT
    // =====================================

    statusFilter?.addEventListener("change", () => {
        renderDoctorLabHistory();
    });


    // =====================================
    // 13. STORAGE EVENT
    // =====================================

    window.addEventListener("storage", event => {

        if (
            event.key === LAB_REQUESTS_KEY ||
            event.key === null
        ) {
            renderDoctorLabHistory();
        }
    });


    // =====================================
    // 14. SAME-TAB CUSTOM EVENT
    // =====================================

    window.addEventListener(
        "semasacare:labRequestsUpdated",
        () => {
            renderDoctorLabHistory();
        }
    );


    // =====================================
    // 15. INITIALIZE
    // =====================================

    renderDoctorLabHistory();

    console.log("Doctor laboratory history initialized.");

});
