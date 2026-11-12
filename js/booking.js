// ==========================================
// SEMASACARE APPOINTMENT BOOKING SYSTEM
// ==========================================

// 1. DOCTOR DATABASE

const doctors = [
    {
        id: 1,
        name: "Dr. Arun Kumar",
        specialty: "Cardiology"
    },
    {
        id: 2,
        name: "Dr. Priya Sharma",
        specialty: "Pediatrics"
    },
    {
        id: 3,
        name: "Dr. Michael Raj",
        specialty: "Neurology"
    },
    {
        id: 4,
        name: "Dr. Sneha Reddy",
        specialty: "Dermatology"
    },
    {
        id: 5,
        name: "Dr. Rajesh Kumar",
        specialty: "Orthopedics"
    },
    {
        id: 6,
        name: "Dr. Anjali Menon",
        specialty: "General Medicine"
    }
];


// 2. GET HTML ELEMENTS

const appointmentForm =
    document.getElementById("appointmentForm");

const doctorSelect =
    document.getElementById("doctorSelect");

const appointmentDate =
    document.getElementById("appointmentDate");

const appointmentTime =
    document.getElementById("appointmentTime");

const bookingSuccess =
    document.getElementById("bookingSuccess");

const bookingDetails =
    document.getElementById("bookingDetails");


// 3. SET MINIMUM APPOINTMENT DATE

const today = new Date();

const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
].join("-");

appointmentDate.min = localToday;


// 4. AUTO SELECT DOCTOR

const urlParams = new URLSearchParams(
    window.location.search
);

const selectedDoctor = urlParams.get("doctor");

if (selectedDoctor) {

    const doctorExists = doctors.some(
        doctor => doctor.id === Number(selectedDoctor)
    );

    if (doctorExists) {
        doctorSelect.value = selectedDoctor;
    }

}


// 5. GET SAVED APPOINTMENTS

function getAppointments() {

    try {
        const savedAppointments =
            JSON.parse(
                localStorage.getItem("semasacareAppointments")
            );

        return Array.isArray(savedAppointments)
            ? savedAppointments
            : [];

    } catch (error) {

        console.error("Unable to read appointments:", error);

        return [];

    }

}


// 6. GENERATE UNIQUE APPOINTMENT ID

function generateAppointmentID() {

    return "SC" +
        Date.now().toString().slice(-8) +
        Math.floor(Math.random() * 100);

}


// 7. DISPLAY BOOKING DETAILS

function showBookingDetails(appointment) {

    bookingDetails.replaceChildren();

    const details = [
        ["Appointment ID", appointment.id],
        ["Patient Name", appointment.patientName],
        ["Doctor", appointment.doctorName],
        ["Specialty", appointment.specialty],
        ["Date", appointment.date],
        ["Time", appointment.time],
        ["Status", appointment.status]
    ];

    details.forEach(([label, value]) => {

        const paragraph = document.createElement("p");

        const strong = document.createElement("strong");

        strong.textContent = label + ": ";

        paragraph.append(
            strong,
            document.createTextNode(value)
        );

        bookingDetails.appendChild(paragraph);

    });

}


// 8. HANDLE FORM SUBMISSION

appointmentForm.addEventListener("submit", function(event) {

    event.preventDefault();

    // GET PATIENT INFORMATION

    const patientName =
        document.getElementById("patientName").value.trim();

    const patientAge =
        Number(document.getElementById("patientAge").value);

    const patientEmail =
        document.getElementById("patientEmail").value.trim();

    const patientPhone =
        document.getElementById("patientPhone").value.trim();

    const patientGender =
        document.getElementById("patientGender").value;

    // GET APPOINTMENT INFORMATION

    const doctorId = Number(doctorSelect.value);

    const selectedDoctor = doctors.find(
        doctor => doctor.id === doctorId
    );

    const date = appointmentDate.value;

    const time = appointmentTime.value;

    const reason =
        document.getElementById("appointmentReason").value.trim();


    // VALIDATION

    if (!patientName || !patientEmail ||
        !patientPhone || !patientGender ||
        !selectedDoctor || !date || !time) {

        alert("Please complete all required fields.");

        return;

    }

    if (!Number.isInteger(patientAge) ||
        patientAge < 1 || patientAge > 120) {

        alert("Please enter a valid age.");

        return;

    }

    if (!/^[0-9]{10}$/.test(patientPhone)) {

        alert("Please enter a valid 10-digit phone number.");

        return;

    }

    if (date < localToday) {

        alert("Please select a future date.");

        return;

    }


    // CREATE APPOINTMENT OBJECT

    const appointment = {

        id: generateAppointmentID(),

        patientName: patientName,

        age: patientAge,

        email: patientEmail,

        phone: patientPhone,

        gender: patientGender,

        doctorId: selectedDoctor.id,

        doctorName: selectedDoctor.name,

        specialty: selectedDoctor.specialty,

        date: date,

        time: time,

        reason: reason,

        status: "Pending",

        bookedAt: new Date().toISOString()

    };


    // SAVE APPOINTMENT

    try {

        const appointments = getAppointments();

        appointments.push(appointment);

        localStorage.setItem(
            "semasacareAppointments",
            JSON.stringify(appointments)
        );

    } catch (error) {

        alert(
            "Unable to save appointment. Please check your browser storage."
        );

        console.error(error);

        return;

    }


    // SHOW SUCCESS MESSAGE

    showBookingDetails(appointment);

    appointmentForm.hidden = true;

    bookingSuccess.hidden = false;

    bookingSuccess.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

});


// 9. RESET FORM FOR ANOTHER BOOKING

const anotherBookingButton =
    bookingSuccess.querySelector("a.btn");

anotherBookingButton.addEventListener("click", function(event) {

    event.preventDefault();

    appointmentForm.reset();

    doctorSelect.value = "";

    appointmentForm.hidden = false;

    bookingSuccess.hidden = true;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

});


// 10. MOBILE NAVIGATION

const menuToggle =
    document.getElementById("menuToggle");

const navLinks =
    document.getElementById("navLinks");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", function() {

        navLinks.classList.toggle("active");

    });

    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", function() {

            navLinks.classList.remove("active");

        });

    });

}


// 11. FOOTER YEAR

const currentYear =
    document.getElementById("currentYear");

if (currentYear) {

    currentYear.textContent = new Date().getFullYear();

}
