/* =====================================
   SemasaCare - Doctor Dashboard
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------
  // AUTHENTICATION
  // -------------------------------------

  const currentUser = SemasaAuth.getCurrentUser();

  if (!currentUser) {
    window.location.href = "../login.html";
    return;
  }

  if (currentUser.role !== "doctor") {
    const role = currentUser.role;
    const validRoles = [
      "admin",
      "receptionist",
      "doctor",
      "patient",
      "pharmacist",
      "laboratory",
      "accountant",
    ];

    window.location.href = validRoles.includes(role)
      ? `${role}-dashboard.html`
      : "../login.html";

    return;
  }

  // -------------------------------------
  // ELEMENTS
  // -------------------------------------

  const appointmentsTable = document.getElementById("doctorAppointments");

  // -------------------------------------
  // CURRENT DATE
  // -------------------------------------

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  document.getElementById("currentDate").textContent = today.toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  // -------------------------------------
  // DOCTOR INFORMATION
  // -------------------------------------

  function loadDoctorProfile() {
    let profiles = [];

    try {
      profiles = JSON.parse(
        localStorage.getItem("semasacareDoctorProfiles") || "[]",
      );

      if (!Array.isArray(profiles)) {
        profiles = [];
      }
    } catch (error) {
      console.error("Unable to load doctor profiles:", error);
    }

    const profile = profiles.find(
      (item) => String(item.userId) === String(currentUser.id),
    );

    const doctorName = currentUser.name || "Doctor";

    document.getElementById("doctorName").textContent = doctorName;

    document.getElementById("headerName").textContent = doctorName;

    document.getElementById("welcomeHeading").textContent =
      `Welcome, ${doctorName}!`;

    document.getElementById("profileName").textContent = doctorName;

    document.getElementById("profileEmail").textContent =
      currentUser.email || "Not available";

    // Read phone number from the registered user account
    let phone = "Not provided";

    try {
      const users = JSON.parse(localStorage.getItem("semasacareUsers") || "[]");

      const registeredUser = users.find(
        (user) => String(user.id) === String(currentUser.id),
      );

      if (registeredUser?.phone) {
        phone = registeredUser.phone;
      }
    } catch (error) {
      console.error("Unable to load doctor account:", error);
    }

    document.getElementById("profilePhone").textContent = phone;

    document.getElementById("profileSpecialization").textContent =
      profile?.specialization || "Not updated";

    document.getElementById("profileQualification").textContent =
      profile?.qualification || "Not updated";

    document.getElementById("profileExperience").textContent =
      profile?.experience !== undefined
        ? `${profile.experience} years`
        : "Not updated";

    document.getElementById("profileStatus").textContent = profile
      ? "Profile available"
      : "Profile incomplete";
  }

  // -------------------------------------
  // APPOINTMENT DATE NORMALIZATION
  // -------------------------------------

  function normalizeDate(value) {
    const date = String(value || "").trim();

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);

      return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {
      const [day, month, year] = date.split(/[-/]/).map(Number);

      return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }

    return "";
  }

  function getAppointmentTimestamp(appointment) {
    const normalizedDate = normalizeDate(appointment.date);

    if (!normalizedDate) return 0;

    const time = String(appointment.time || "").trim();

    let hours = 0;
    let minutes = 0;

    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

    if (match) {
      hours = Number(match[1]);
      minutes = Number(match[2]);

      const period = match[3]?.toUpperCase();

      if (period === "PM" && hours < 12) {
        hours += 12;
      }

      if (period === "AM" && hours === 12) {
        hours = 0;
      }
    }

    return new Date(
      `${normalizedDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
    ).getTime();
  }

  // -------------------------------------
  // LOAD DOCTOR APPOINTMENTS
  // -------------------------------------

  function loadAppointments() {
    try {
      const data = JSON.parse(
        localStorage.getItem("semasacareAppointments") || "[]",
      );

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Unable to load appointments:", error);

      return [];
    }
  }

  // -------------------------------------
  // MATCH APPOINTMENTS TO LOGGED-IN DOCTOR
  // -------------------------------------

  function getDoctorAppointments() {
    const allAppointments = loadAppointments();

    const doctorName = String(currentUser.name || "")
      .trim()
      .toLowerCase();

    const doctorEmail = String(currentUser.email || "")
      .trim()
      .toLowerCase();

    return allAppointments.filter((appointment) => {
      const appointmentDoctorName = String(appointment.doctorName || "")
        .trim()
        .toLowerCase();

      const appointmentDoctorEmail = String(appointment.doctorEmail || "")
        .trim()
        .toLowerCase();

      const appointmentDoctorId = String(appointment.doctorId || "");

      return (
        (appointment.doctorId !== undefined &&
          appointmentDoctorId === String(currentUser.id)) ||
        (appointment.doctorEmail && appointmentDoctorEmail === doctorEmail) ||
        (appointment.doctorName && appointmentDoctorName === doctorName)
      );
    });
  }

  // -------------------------------------
  // STATUS BADGE
  // -------------------------------------

  function createStatusBadge(status) {
    const badge = document.createElement("span");

    const safeStatus = String(status || "Pending");

    badge.className = "doctor-appointment-status";

    badge.textContent = safeStatus;

    const normalized = safeStatus.toLowerCase();

    if (normalized === "completed") {
      badge.classList.add("completed");
    } else if (normalized === "cancelled") {
      badge.classList.add("cancelled");
    } else if (normalized === "confirmed") {
      badge.classList.add("confirmed");
    } else {
      badge.classList.add("pending");
    }

    return badge;
  }

  // -------------------------------------
  // DISPLAY TODAY'S APPOINTMENTS
  // -------------------------------------

  function renderAppointments(appointments) {
    appointmentsTable.textContent = "";

    const todaysAppointments = appointments
      .filter((appointment) => normalizeDate(appointment.date) === todayString)
      .sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));

    if (todaysAppointments.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 4;
      cell.className = "empty-message";
      cell.textContent = "No appointments scheduled for today.";

      row.appendChild(cell);
      appointmentsTable.appendChild(row);

      return;
    }

    todaysAppointments.forEach((appointment) => {
      const row = document.createElement("tr");

      const values = [
        appointment.patientName || "N/A",
        appointment.date || "N/A",
        appointment.time || "N/A",
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");

        cell.textContent = value;

        row.appendChild(cell);
      });

      const statusCell = document.createElement("td");

      statusCell.appendChild(createStatusBadge(appointment.status));

      row.appendChild(statusCell);

      appointmentsTable.appendChild(row);
    });
  }

  // -------------------------------------
  // UPDATE DASHBOARD STATISTICS
  // -------------------------------------

  function updateDashboard() {
    const appointments = getDoctorAppointments();

    const todaysAppointments = appointments.filter(
      (appointment) => normalizeDate(appointment.date) === todayString,
    );

    const pending = todaysAppointments.filter(
      (appointment) =>
        String(appointment.status || "Pending").toLowerCase() === "pending",
    );

    const completed = todaysAppointments.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() === "completed",
    );

    const now = Date.now();

    const upcoming = appointments.filter((appointment) => {
      const timestamp = getAppointmentTimestamp(appointment);

      return (
        timestamp > now &&
        !["cancelled", "completed", "missed"].includes(
          String(appointment.status || "").toLowerCase(),
        )
      );
    });

    document.getElementById("todayAppointments").textContent =
      todaysAppointments.length;

    document.getElementById("pendingAppointments").textContent = pending.length;

    document.getElementById("completedAppointments").textContent =
      completed.length;

    document.getElementById("upcomingAppointments").textContent =
      upcoming.length;

    renderAppointments(appointments);
  }

  // -------------------------------------
  // MOBILE SIDEBAR
  // -------------------------------------

  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("active");
  });

  // -------------------------------------
  // LOGOUT
  // -------------------------------------

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    SemasaAuth.logout();
  });

  // -------------------------------------
  // INITIALIZE
  // -------------------------------------

  loadDoctorProfile();
  updateDashboard();
});
