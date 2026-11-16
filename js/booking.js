// ==========================================
// SEMASACARE APPOINTMENT BOOKING SYSTEM
// ==========================================

// 1. DOCTOR DATABASE

// const doctors = [
//     {
//         id: 1,
//         name: "Dr. Arun Kumar",
//         specialty: "Cardiology"
//     },
//     {
//         id: 2,
//         name: "Dr. Priya Sharma",
//         specialty: "Pediatrics"
//     },
//     {
//         id: 3,
//         name: "Dr. Michael Raj",
//         specialty: "Neurology"
//     },
//     {
//         id: 4,
//         name: "Dr. Sneha Reddy",
//         specialty: "Dermatology"
//     },
//     {
//         id: 5,
//         name: "Dr. Rajesh Kumar",
//         specialty: "Orthopedics"
//     },
//     {
//         id: 6,
//         name: "Dr. Anjali Menon",
//         specialty: "General Medicine"
//     }
// ];

// 1. LOAD DOCTORS FROM USER MANAGEMENT

function getDoctors() {
  try {
    const users = JSON.parse(localStorage.getItem("semasacareUsers") || "[]");

    const profiles = JSON.parse(
      localStorage.getItem("semasacareDoctorProfiles") || "[]",
    );

    const registeredDoctors = users
      .filter((user) => user.role === "doctor")
      .map((user) => {
        const profile = profiles.find(
          (item) => String(item.userId) === String(user.id),
        );

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          specialty: profile?.specialization || "Not specified",
        };
      });

    // Include the existing demo doctor
    const demoProfile = profiles.find((item) => String(item.userId) === "3");

    const demoDoctor = {
      id: "3",
      name: "Doctor",
      email: "doctor@semasacare.com",
      specialty: demoProfile?.specialization || "General Medicine",
    };

    return [demoDoctor, ...registeredDoctors];
  } catch (error) {
    console.error("Unable to load doctors:", error);
    return [];
  }
}

let doctors = getDoctors();

// 2. GET HTML ELEMENTS

const appointmentForm = document.getElementById("appointmentForm");

const doctorSelect = document.getElementById("doctorSelect");

const appointmentDate = document.getElementById("appointmentDate");

const appointmentTime = document.getElementById("appointmentTime");

const bookingSuccess = document.getElementById("bookingSuccess");

const bookingDetails = document.getElementById("bookingDetails");

// POPULATE DOCTOR DROPDOWN

function populateDoctorDropdown() {
  doctors = getDoctors();

  doctorSelect.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a doctor";

  doctorSelect.appendChild(defaultOption);

  doctors.forEach((doctor) => {
    const option = document.createElement("option");

    option.value = doctor.id;
    option.textContent = `${doctor.name} - ${doctor.specialty}`;

    doctorSelect.appendChild(option);
  });
}

populateDoctorDropdown();

// 3. SET MINIMUM APPOINTMENT DATE

const today = new Date();

const localToday = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0"),
].join("-");

appointmentDate.min = localToday;

// 4. AUTO SELECT DOCTOR

const urlParams = new URLSearchParams(window.location.search);

const selectedDoctor = urlParams.get("doctor");

if (selectedDoctor) {
  const doctorExists = doctors.some(
    (doctor) => doctor.id === String(selectedDoctor),
  );

  if (doctorExists) {
    doctorSelect.value = String(selectedDoctor);
  }
}

// 5. GET SAVED APPOINTMENTS

function getAppointments() {
  try {
    const savedAppointments = JSON.parse(
      localStorage.getItem("semasacareAppointments"),
    );

    return Array.isArray(savedAppointments) ? savedAppointments : [];
  } catch (error) {
    console.error("Unable to read appointments:", error);

    return [];
  }
}


// ==========================================
// 5A. GET REGISTERED PATIENTS
// ==========================================

function getPatients() {
  try {
    const patients = JSON.parse(
      localStorage.getItem("semasacarePatients") || "[]"
    );

    return Array.isArray(patients) ? patients : [];
  } catch (error) {
    console.error("Unable to read patients:", error);
    return [];
  }
}

// ==========================================
// 5B. FIND OR CREATE PATIENT
// ==========================================

function findOrCreatePatient({
  name,
  email,
  phone,
  age,
  gender
}) {
  const patients = getPatients();

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.trim();

  // Find an existing patient using email or phone
  let patient = patients.find(item =>
    (
      item.email || ""
    ).trim().toLowerCase() === normalizedEmail
  );

  if (!patient) {
    patient = patients.find(item =>
      String(item.phone || "").trim() === normalizedPhone
    );
  }

  // Reuse existing patient ID
  if (patient) {
    return patient;
  }

  // Create a new patient record
  const newPatient = {
    id: `PAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: name,
    email: normalizedEmail,
    phone: normalizedPhone,
    age: age,
    gender: gender,
    dob: "",
    bloodGroup: "",
    address: "",
    emergencyContact: "",
    role: "patient",
    registeredBy: "Online Booking",
    registrationDate: new Date().toISOString()
  };

  patients.push(newPatient);

  localStorage.setItem(
    "semasacarePatients",
    JSON.stringify(patients)
  );

  return newPatient;
}


// 6. PATIENT RECORD HELPERS

function getPatients() {
  try {
    const patients = JSON.parse(localStorage.getItem("semasacarePatients") || "[]");
    return Array.isArray(patients) ? patients : [];
  } catch (error) {
    console.error("Unable to read patients:", error);
    return [];
  }
}

function generatePatientID() {
  let id;
  const patients = getPatients();
  do {
    id = "PAT-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  } while (patients.some((patient) => String(patient.id) === id));
  return id;
}

// Match by email first. Phone is used only with the same name to reduce
// accidental merging of family members who share a phone number.
function findOrCreatePatient(details) {
  const patients = getPatients();
  const email = String(details.email || "").trim().toLowerCase();
  const phone = String(details.phone || "").trim();
  const name = String(details.name || "").trim();

  let patient = patients.find((item) =>
    String(item.email || "").trim().toLowerCase() === email
  );

  if (!patient) {
    patient = patients.find((item) =>
      String(item.phone || "").trim() === phone &&
      String(item.name || "").trim().toLowerCase() === name.toLowerCase()
    );
  }

  if (patient) {
    // Fill missing contact details without replacing an existing patient ID.
    patient.email = patient.email || email;
    patient.phone = patient.phone || phone;
    patient.name = patient.name || name;
    patient.gender = patient.gender || details.gender;
    localStorage.setItem("semasacarePatients", JSON.stringify(patients));
    return patient;
  }

  const newPatient = {
    id: generatePatientID(),
    name,
    email,
    phone,
    age: details.age,
    dob: "",
    gender: details.gender,
    bloodGroup: "",
    address: "",
    emergencyContact: "",
    role: "patient",
    registeredBy: "Online Booking",
    registrationDate: new Date().toISOString()
  };

  patients.push(newPatient);
  localStorage.setItem("semasacarePatients", JSON.stringify(patients));
  return newPatient;
}

// 7. GENERATE UNIQUE APPOINTMENT ID

function generateAppointmentID() {
  return (
    "SC" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100)
  );
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
    ["Status", appointment.status],
  ];

  details.forEach(([label, value]) => {
    const paragraph = document.createElement("p");

    const strong = document.createElement("strong");

    strong.textContent = label + ": ";

    paragraph.append(strong, document.createTextNode(value));

    bookingDetails.appendChild(paragraph);
  });
}

// 8. HANDLE FORM SUBMISSION

appointmentForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // GET PATIENT INFORMATION

  const patientName = document.getElementById("patientName").value.trim();

  const patientAge = Number(document.getElementById("patientAge").value);

  const patientEmail = document.getElementById("patientEmail").value.trim();

  const patientPhone = document.getElementById("patientPhone").value.trim();

  const patientGender = document.getElementById("patientGender").value;

  // GET APPOINTMENT INFORMATION

  const doctorId = String(doctorSelect.value);

  const selectedDoctor = doctors.find((doctor) => doctor.id === doctorId);

  const date = appointmentDate.value;

  const time = appointmentTime.value;

  const reason = document.getElementById("appointmentReason").value.trim();

  // VALIDATION

  if (
    !patientName ||
    !patientEmail ||
    !patientPhone ||
    !patientGender ||
    !selectedDoctor ||
    !date ||
    !time
  ) {
    alert("Please complete all required fields.");

    return;
  }

  if (!Number.isInteger(patientAge) || patientAge < 1 || patientAge > 120) {
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

  // FIND OR CREATE THE PATIENT RECORD
  // let patient;
  // try {
  //   patient = findOrCreatePatient({
  //     name: patientName,
  //     email: patientEmail,
  //     phone: patientPhone,
  //     age: patientAge,
  //     gender: patientGender
  //   });
  // } catch (error) {
  //   console.error("Unable to save patient record:", error);
  //   alert("Unable to save patient information. Please try again.");
  //   return;
  // }

  // CREATE APPOINTMENT OBJECT WITH THE PATIENT'S PERMANENT ID

  // ==========================================
  // CREATE OR FIND PATIENT
  // ==========================================

  let patient;

  try {
    patient = findOrCreatePatient({
      name: patientName,
      email: patientEmail,
      phone: patientPhone,
      age: patientAge,
      gender: patientGender
    });
  } catch (error) {
    alert("Unable to save patient information. Please try again.");
    console.error(error);
    return;
  }

  // ==========================================
  // CREATE APPOINTMENT OBJECT
  // ==========================================

  const appointment = {
    id: generateAppointmentID(),

    // Patient identification
    patientId: patient.id,
    patientName: patient.name,
    patientEmail: patient.email,
    patientPhone: patient.phone,
    patientGender: patient.gender,

    // Legacy fields for existing modules
    age: patientAge,
    email: patient.email,
    phone: patient.phone,
    gender: patient.gender,

    // Doctor information
    doctorId: selectedDoctor.id,
    doctorName: selectedDoctor.name,
    doctorEmail: selectedDoctor.email,
    specialty: selectedDoctor.specialty,

    // Appointment information
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
      JSON.stringify(appointments),
    );
  } catch (error) {
    alert("Unable to save appointment. Please check your browser storage.");

    console.error(error);

    return;
  }

  // SHOW SUCCESS MESSAGE

  showBookingDetails(appointment);

  appointmentForm.hidden = true;

  bookingSuccess.hidden = false;

  bookingSuccess.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
});

// 9. RESET FORM FOR ANOTHER BOOKING

const anotherBookingButton = bookingSuccess.querySelector("a.btn");

anotherBookingButton.addEventListener("click", function (event) {
  event.preventDefault();

  appointmentForm.reset();

  doctorSelect.value = "";

  appointmentForm.hidden = false;

  bookingSuccess.hidden = true;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

// 10. MOBILE NAVIGATION

const menuToggle = document.getElementById("menuToggle");

const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("active");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", function () {
      navLinks.classList.remove("active");
    });
  });
}

// 11. FOOTER YEAR

const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}
