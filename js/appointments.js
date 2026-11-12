
// ==========================================
// MEDCARE - MY APPOINTMENTS
// ==========================================


// GET HTML ELEMENTS

const appointmentsList =
    document.getElementById("appointmentsList");

const emptyState =
    document.getElementById("emptyState");

const totalAppointments =
    document.getElementById("totalAppointments");

const pendingAppointments =
    document.getElementById("pendingAppointments");

const cancelledAppointments =
    document.getElementById("cancelledAppointments");


// GET APPOINTMENTS FROM LOCAL STORAGE

function getAppointments() {

    try {

        const data = JSON.parse(
            localStorage.getItem("semasacareAppointments")
        );

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error("Error reading appointments:", error);

        return [];

    }

}


// SAVE APPOINTMENTS

function saveAppointments(appointments) {

    try {

        localStorage.setItem(
            "semasacareAppointments",
            JSON.stringify(appointments)
        );

        return true;

    } catch (error) {

        console.error("Error saving appointments:", error);

        alert("Unable to update appointments.");

        return false;

    }

}


// FORMAT DATE WITHOUT TIMEZONE SHIFT

function formatDate(dateString) {

    const parts = dateString.split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    const [year, month, day] = parts;

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

}


// CREATE TEXT ELEMENT

function createText(tag, className, value) {

    const element = document.createElement(tag);

    element.className = className;

    element.textContent = value;

    return element;

}


// DISPLAY APPOINTMENTS

function displayAppointments() {

    const appointments = getAppointments();

    appointmentsList.replaceChildren();


    // UPDATE SUMMARY

    totalAppointments.textContent = appointments.length;

    pendingAppointments.textContent =
        appointments.filter(
            appointment => appointment.status === "Pending"
        ).length;

    cancelledAppointments.textContent =
        appointments.filter(
            appointment => appointment.status === "Cancelled"
        ).length;


    // EMPTY STATE

    if (appointments.length === 0) {

        appointmentsList.hidden = true;

        emptyState.hidden = false;

        return;

    }

    appointmentsList.hidden = false;

    emptyState.hidden = true;


    // DISPLAY EACH APPOINTMENT

    appointments.forEach((appointment) => {

        const card = document.createElement("article");

        card.className = "appointment-item";


        // MAIN INFORMATION

        const main = document.createElement("div");

        main.className = "appointment-main";

        const id = createText(
            "span",
            "appointment-id",
            "ID: " + appointment.id
        );

        const name = createText(
            "h3",
            "",
            appointment.doctorName
        );

        const specialty = createText(
            "p",
            "",
            appointment.specialty
        );


        // META INFORMATION

        const meta = document.createElement("div");

        meta.className = "appointment-meta";

        meta.append(
            createText(
                "span",
                "",
                "📅 " + formatDate(appointment.date)
            ),
            createText(
                "span",
                "",
                "🕒 " + appointment.time
            ),
            createText(
                "span",
                "",
                "👤 " + appointment.patientName
            )
        );


        main.append(id, name, specialty, meta);


        // STATUS AND ACTIONS

        const actions = document.createElement("div");

        const status = createText(
            "span",
            "appointment-status " +
                (appointment.status === "Cancelled"
                    ? "status-cancelled"
                    : "status-pending"),
            appointment.status
        );

        actions.appendChild(status);


        // CANCEL BUTTON

        if (appointment.status !== "Cancelled") {

            const cancelButton = document.createElement("button");

            cancelButton.className = "cancel-appointment";

            cancelButton.textContent = "Cancel Appointment";

            cancelButton.addEventListener("click", function() {

                cancelAppointment(appointment.id);

            });

            actions.appendChild(cancelButton);

        }


        card.append(main, actions);

        appointmentsList.appendChild(card);

    });

}


// CANCEL APPOINTMENT

function cancelAppointment(appointmentId) {

    const confirmation = confirm(
        "Are you sure you want to cancel this appointment?"
    );

    if (!confirmation) {
        return;
    }

    const appointments = getAppointments();

    const appointment = appointments.find(
        item => item.id === appointmentId
    );

    if (!appointment) {
        alert("Appointment not found.");
        return;
    }

    if (appointment.status === "Cancelled") {
        return;
    }

    appointment.status = "Cancelled";

    if (saveAppointments(appointments)) {

        alert("Appointment cancelled successfully!");

        displayAppointments();

    }

}


// MOBILE NAVIGATION

const menuToggle =
    document.getElementById("menuToggle");

const navLinks =
    document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function() {

        navLinks.classList.toggle("active");

    });

}


// FOOTER YEAR

const currentYear =
    document.getElementById("currentYear");

if (currentYear) {

    currentYear.textContent = new Date().getFullYear();

}


// INITIALIZE PAGE

displayAppointments();
