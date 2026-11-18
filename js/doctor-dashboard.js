
/* =====================================
   SemasaCare - Doctor Dashboard
   Updated with automatic data refresh
===================================== */

document.addEventListener("DOMContentLoaded", () => {

  // 1. AUTHENTICATION

  const currentUser = SemasaAuth.getCurrentUser();

  if (!currentUser) {
    window.location.href = "../login.html";
    return;
  }

  if (currentUser.role !== "doctor") {
    SemasaAuth.redirectByRole(currentUser.role);
    return;
  }

  // 2. ELEMENTS

  const appointmentsTable =
    document.getElementById("doctorAppointments");

  // 3. CURRENT DATE

  function getTodayString() {
    const today = new Date();

    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
  }

  function updateCurrentDate() {
    document.getElementById("currentDate").textContent =
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  // 4. DOCTOR PROFILE

  function loadDoctorProfile() {

    let profiles = [];
    let users = [];

    try {
      profiles = JSON.parse(
        localStorage.getItem("semasacareDoctorProfiles") || "[]"
      );

      users = JSON.parse(
        localStorage.getItem("semasacareUsers") || "[]"
      );

      if (!Array.isArray(profiles)) profiles = [];
      if (!Array.isArray(users)) users = [];

    } catch (error) {
      console.error("Profile loading error:", error);
    }

    const profile = profiles.find(item =>
      String(item.userId) === String(currentUser.id)
    );

    const registeredUser = users.find(user =>
      String(user.id) === String(currentUser.id)
    );

    const doctorName = currentUser.name || "Doctor";

    document.getElementById("doctorName").textContent = doctorName;
    document.getElementById("headerName").textContent = doctorName;

    document.getElementById("welcomeHeading").textContent =
      `Welcome, ${doctorName}!`;

    document.getElementById("profileName").textContent = doctorName;

    document.getElementById("profileEmail").textContent =
      currentUser.email || "Not available";

    document.getElementById("profilePhone").textContent =
      registeredUser?.phone || "Not provided";

    document.getElementById("profileSpecialization").textContent =
      profile?.specialization || "Not updated";

    document.getElementById("profileQualification").textContent =
      profile?.qualification || "Not updated";

    document.getElementById("profileExperience").textContent =
      profile?.experience !== undefined
        ? `${profile.experience} years`
        : "Not updated";

    document.getElementById("profileStatus").textContent =
      profile ? "Profile available" : "Profile incomplete";
  }

  // 5. DATE NORMALIZATION

  function normalizeDate(value) {

    const date = String(value || "").trim();

    // YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {

      const [year, month, day] = date.split("-").map(Number);

      return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0")
      ].join("-");
    }

    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {

      const [day, month, year] = date.split(/[-/]/).map(Number);

      return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0")
      ].join("-");
    }

    return "";
  }

  // 6. APPOINTMENT TIMESTAMP

  function getAppointmentTimestamp(appointment) {

    const normalizedDate = normalizeDate(appointment.date);

    if (!normalizedDate) return 0;

    const time = String(appointment.time || "").trim();

    let hours = 0;
    let minutes = 0;

    const match = time.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i
    );

    if (match) {

      hours = Number(match[1]);
      minutes = Number(match[2]);

      const period = match[3]?.toUpperCase();

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    }

    const [year, month, day] = normalizedDate.split("-").map(Number);

    return new Date(
      year,
      month - 1,
      day,
      hours,
      minutes
    ).getTime();
  }

  // 7. LOAD APPOINTMENTS

  function loadAppointments() {

    try {

      const data = JSON.parse(
        localStorage.getItem("semasacareAppointments") || "[]"
      );

      return Array.isArray(data) ? data : [];

    } catch (error) {

      console.error("Unable to load appointments:", error);
      return [];
    }
  }

  // 8. MATCH APPOINTMENTS TO DOCTOR

  function getDoctorAppointments() {

    const allAppointments = loadAppointments();

    const doctorId = String(currentUser.id || "");

    const doctorName = String(currentUser.name || "")
      .trim()
      .toLowerCase();

    const doctorEmail = String(currentUser.email || "")
      .trim()
      .toLowerCase();

    return allAppointments.filter(appointment => {

      const appointmentDoctorId =
        String(appointment.doctorId || "");

      const appointmentDoctorEmail =
        String(appointment.doctorEmail || "")
          .trim()
          .toLowerCase();

      const appointmentDoctorName =
        String(appointment.doctorName || "")
          .trim()
          .toLowerCase();

      return (
        (doctorId && appointmentDoctorId === doctorId) ||
        (doctorEmail && appointmentDoctorEmail === doctorEmail) ||
        (doctorName && appointmentDoctorName === doctorName)
      );
    });
  }

  // 9. STATUS BADGE

  function createStatusBadge(status) {

    const badge = document.createElement("span");

    const safeStatus = String(status || "Pending").trim();

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

  // 10. DISPLAY TODAY'S APPOINTMENTS

  function renderAppointments(appointments) {

    appointmentsTable.replaceChildren();

    const todayString = getTodayString();

    const todaysAppointments = appointments
      .filter(appointment =>
        normalizeDate(appointment.date) === todayString
      )
      .sort((a, b) =>
        getAppointmentTimestamp(a) -
        getAppointmentTimestamp(b)
      );

    if (!todaysAppointments.length) {

      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 4;
      cell.className = "empty-message";
      cell.textContent = "No appointments scheduled for today.";

      row.appendChild(cell);
      appointmentsTable.appendChild(row);

      return;
    }

    todaysAppointments.forEach(appointment => {

      const row = document.createElement("tr");

      const values = [
        appointment.patientName || "N/A",
        appointment.date || "N/A",
        appointment.time || "N/A"
      ];

      values.forEach(value => {

        const cell = document.createElement("td");
        cell.textContent = value;

        row.appendChild(cell);
      });

      const statusCell = document.createElement("td");

      statusCell.appendChild(
        createStatusBadge(appointment.status)
      );

      row.appendChild(statusCell);
      appointmentsTable.appendChild(row);
    });
  }

  // 11. UPDATE DASHBOARD STATISTICS

  function updateDashboard() {

    const appointments = getDoctorAppointments();

    const todayString = getTodayString();
    const now = Date.now();

    const todaysAppointments = appointments.filter(appointment =>
      normalizeDate(appointment.date) === todayString
    );

    // Pending appointments across all dates
    const pending = appointments.filter(appointment =>
      String(appointment.status || "Pending")
        .trim()
        .toLowerCase() === "pending"
    );

    // Completed appointments across all dates
    const completed = appointments.filter(appointment =>
      String(appointment.status || "")
        .trim()
        .toLowerCase() === "completed"
    );

    // Future appointments excluding cancelled/completed/missed
    const upcoming = appointments.filter(appointment => {

      const timestamp = getAppointmentTimestamp(appointment);

      const status = String(appointment.status || "")
        .trim()
        .toLowerCase();

      return (
        timestamp > now &&
        !["cancelled", "completed", "missed"].includes(status)
      );
    });

    document.getElementById("todayAppointments").textContent =
      todaysAppointments.length;

    document.getElementById("pendingAppointments").textContent =
      pending.length;

    document.getElementById("completedAppointments").textContent =
      completed.length;

    document.getElementById("upcomingAppointments").textContent =
      upcoming.length;

    renderAppointments(appointments);
    updateCurrentDate();
  }

  // 12. MOBILE SIDEBAR

  document.getElementById("menuToggle")
    ?.addEventListener("click", () => {

      document.getElementById("sidebar")
        ?.classList.toggle("active");
    });

  // 13. LOGOUT

  document.getElementById("logoutBtn")
    ?.addEventListener("click", () => {

      SemasaAuth.logout();
    });

  // 14. AUTOMATIC DATA REFRESH

  // Changes made in another browser tab
  window.addEventListener("storage", event => {

    if (
      event.key === "semasacareAppointments" ||
      event.key === "semasacareDoctorProfiles" ||
      event.key === "semasacareUsers" ||
      event.key === null
    ) {
      loadDoctorProfile();
      updateDashboard();
    }
  });

  // Refresh when returning to this page
  window.addEventListener("pageshow", () => {

    loadDoctorProfile();
    updateDashboard();
  });

  // Refresh when browser window gets focus
  window.addEventListener("focus", () => {

    loadDoctorProfile();
    updateDashboard();
  });

  // Refresh when the tab becomes visible
  document.addEventListener("visibilitychange", () => {

    if (!document.hidden) {
      loadDoctorProfile();
      updateDashboard();
    }
  });

  // Periodic refresh
  setInterval(() => {

    if (!document.hidden) {
      updateDashboard();
    }

  }, 15000);

  // 15. INITIALIZE

  loadDoctorProfile();
  updateDashboard();



  // =====================================
  // 13. DOCTOR SCHEDULE MANAGEMENT
  // =====================================

  const SCHEDULE_KEY = "semasacareDoctorSchedules";

  const scheduleForm = document.getElementById("doctorScheduleForm");
  const leaveDateInput = document.getElementById("leaveDate");
  const leaveList = document.getElementById("doctorLeaveList");

  function getAllSchedules() {
    try {
      const data = JSON.parse(
        localStorage.getItem(SCHEDULE_KEY) || "{}"
      );

      return data && typeof data === "object" && !Array.isArray(data)
        ? data
        : {};

    } catch (error) {
      console.error("Unable to load schedules:", error);
      return {};
    }
  }

  function getDoctorSchedule() {
    const schedules = getAllSchedules();

    return schedules[String(currentUser.id)] || null;
  }

  function saveDoctorSchedule(schedule) {
    try {
      const schedules = getAllSchedules();

      schedules[String(currentUser.id)] = schedule;

      localStorage.setItem(
        SCHEDULE_KEY,
        JSON.stringify(schedules)
      );

      return true;

    } catch (error) {
      console.error("Unable to save schedule:", error);
      alert("Unable to save schedule. Check browser storage.");
      return false;
    }
  }

  // Load saved schedule into the form
  function loadDoctorSchedule() {

    const schedule = getDoctorSchedule();

    if (!schedule) {
      renderLeaveDates([]);
      return;
    }

    document.querySelectorAll(
      'input[name="workingDays"]'
    ).forEach(input => {
      input.checked = schedule.workingDays?.includes(input.value) || false;
    });

    document.getElementById("dutyStart").value =
      schedule.dutyStart || "";

    document.getElementById("dutyEnd").value =
      schedule.dutyEnd || "";

    document.getElementById("breakStart").value =
      schedule.breakStart || "";

    document.getElementById("breakEnd").value =
      schedule.breakEnd || "";

    document.getElementById("slotDuration").value =
      String(schedule.slotDuration || 30);

    renderLeaveDates(schedule.leaveDates || []);

    document.getElementById("scheduleStatus").textContent =
      "Schedule saved";

    document.getElementById("scheduleStatus")
      .classList.add("saved");
  }

  // Save weekly schedule
  scheduleForm?.addEventListener("submit", event => {

    event.preventDefault();

    const workingDays = Array.from(
      document.querySelectorAll(
        'input[name="workingDays"]:checked'
      )
    ).map(input => input.value);

    const dutyStart = document.getElementById("dutyStart").value;
    const dutyEnd = document.getElementById("dutyEnd").value;

    const breakStart = document.getElementById("breakStart").value;
    const breakEnd = document.getElementById("breakEnd").value;

    const slotDuration = Number(
      document.getElementById("slotDuration").value
    );

    if (!workingDays.length) {
      alert("Please select at least one working day.");
      return;
    }

    if (!dutyStart || !dutyEnd || dutyStart >= dutyEnd) {
      alert("Please enter valid duty hours.");
      return;
    }

    if (Boolean(breakStart) !== Boolean(breakEnd)) {
      alert("Please enter both break start and end times.");
      return;
    }

    if (breakStart && breakEnd) {

      if (
        breakStart >= breakEnd ||
        breakStart < dutyStart ||
        breakEnd > dutyEnd
      ) {
        alert("Break time must be within your duty hours.");
        return;
      }
    }

    const existingSchedule = getDoctorSchedule();

    const schedule = {
      doctorId: String(currentUser.id),
      doctorName: currentUser.name || "Doctor",
      workingDays,
      dutyStart,
      dutyEnd,
      breakStart,
      breakEnd,
      slotDuration,
      leaveDates: existingSchedule?.leaveDates || [],
      updatedAt: new Date().toISOString()
    };

    if (!saveDoctorSchedule(schedule)) return;

    document.getElementById("scheduleStatus").textContent =
      "Schedule saved";

    document.getElementById("scheduleStatus")
      .classList.add("saved");

    alert("Your schedule has been saved successfully.");
  });

  // Render leave dates
  function renderLeaveDates(dates) {

    leaveList.replaceChildren();

    if (!dates.length) {

      const message = document.createElement("p");
      message.textContent = "No leave dates added.";

      leaveList.appendChild(message);
      return;
    }

    dates.sort();

    dates.forEach(date => {

      const item = document.createElement("div");
      item.className = "doctor-leave-item";

      const dateText = document.createElement("strong");

      const [year, month, day] = date.split("-");

      dateText.textContent =
        new Date(Number(year), Number(month) - 1, Number(day))
          .toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });

      const removeButton = document.createElement("button");

      removeButton.type = "button";
      removeButton.className = "remove-leave-btn";
      removeButton.innerHTML =
        '<i class="fas fa-trash"></i> Remove';

      removeButton.addEventListener("click", () => {
        removeLeaveDate(date);
      });

      item.append(dateText, removeButton);

      leaveList.appendChild(item);
    });
  }

  // Add leave date
  document.getElementById("addLeaveBtn")
    ?.addEventListener("click", () => {

      const selectedDate = leaveDateInput.value;

      if (!selectedDate) {
        alert("Please select a leave date.");
        return;
      }

      if (selectedDate < getTodayString()) {
        alert("You cannot add a leave date in the past.");
        return;
      }

      const schedule = getDoctorSchedule();

      if (!schedule) {
        alert("Please save your weekly schedule first.");
        return;
      }

      const leaveDates = schedule.leaveDates || [];

      if (leaveDates.includes(selectedDate)) {
        alert("This leave date is already added.");
        return;
      }

      schedule.leaveDates = [...leaveDates, selectedDate];
      schedule.updatedAt = new Date().toISOString();

      if (!saveDoctorSchedule(schedule)) return;

      leaveDateInput.value = "";
      renderLeaveDates(schedule.leaveDates);

      alert("Leave date added successfully.");
    });

  // Remove leave date
  function removeLeaveDate(date) {

    const schedule = getDoctorSchedule();

    if (!schedule) return;

    schedule.leaveDates = (schedule.leaveDates || [])
      .filter(item => item !== date);

    schedule.updatedAt = new Date().toISOString();

    if (!saveDoctorSchedule(schedule)) return;

    renderLeaveDates(schedule.leaveDates);
  }

  // Initialize schedule
  loadDoctorSchedule();
});