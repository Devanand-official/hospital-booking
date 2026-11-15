document.addEventListener("DOMContentLoaded", function () {
  // =====================================
  // ADMIN AUTHENTICATION
  // =====================================

  const currentUser = SemasaAuth.getCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (currentUser.role !== "admin") {
    window.location.href = "login.html";
    return;
  }

  // =====================================
  // ADMIN PROFILE AND DATE
  // =====================================

  const adminName = document.getElementById("adminName");

  if (adminName) {
    adminName.textContent = currentUser.name || "Administrator";
  }

  const currentDate = document.getElementById("currentDate");

  if (currentDate) {
    currentDate.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // =====================================
  // READ LOCAL STORAGE
  // =====================================

  function readStorage(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Unable to read " + key, error);
      return [];
    }
  }

  const users = readStorage("semasacareUsers");
  const appointments = readStorage("semasacareAppointments");

  const demoStaff = [
    "admin",
    "receptionist",
    "doctor",
    "pharmacist",
    "laboratory",
    "accountant",
  ];

  // =====================================
  // SUMMARY STATISTICS
  // =====================================

  const patients = users.filter((user) => user.role === "patient");
  const doctors = users.filter((user) => user.role === "doctor");
  const staff = users.filter((user) => user.role !== "patient");

  function updateValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  updateValue("reportPatients", patients.length + 1);
  updateValue("reportDoctors", doctors.length + 1);
  updateValue("reportAppointments", appointments.length);
  updateValue("reportStaff", demoStaff.length + staff.length);

  updateValue("registeredPatients", patients.length);
  updateValue("registeredDoctors", doctors.length);

  // =====================================
  // APPOINTMENT STATUS REPORT
  // =====================================

  const statusCounts = {
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
  };

  appointments.forEach((appointment) => {
    const status = String(appointment.status || "pending")
      .trim()
      .toLowerCase();

    if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
      statusCounts[status]++;
    }
  });

  updateValue("confirmedCount", statusCounts.confirmed);
  updateValue("pendingCount", statusCounts.pending);
  updateValue("completedCount", statusCounts.completed);
  updateValue("cancelledCount", statusCounts.cancelled);

  // =====================================
  // NORMALIZE APPOINTMENT DATE
  // =====================================

  function parseAppointmentDate(value) {
    const date = String(value || "").trim();

    let year;
    let month;
    let day;

    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
      [year, month, day] = date.split("-").map(Number);
    } else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(date)) {
      [day, month, year] = date.split(/[-/]/).map(Number);
    } else {
      return null;
    }

    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  // =====================================
  // MONTHLY APPOINTMENT STATISTICS
  // =====================================

  const monthlyChart = document.getElementById("monthlyChart");

  if (monthlyChart) {
    monthlyChart.textContent = "";

    const today = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);

      months.push({
        year: monthDate.getFullYear(),
        month: monthDate.getMonth(),
        label: monthDate.toLocaleDateString("en-IN", {
          month: "short",
        }),
        count: 0,
      });
    }

    appointments.forEach((appointment) => {
      const date = parseAppointmentDate(appointment.date);

      if (!date) return;

      const monthData = months.find(
        (item) =>
          item.year === date.getFullYear() && item.month === date.getMonth(),
      );

      if (monthData) {
        monthData.count++;
      }
    });

    const maxCount = Math.max(...months.map((item) => item.count), 1);

    months.forEach((item) => {
      const barItem = document.createElement("div");
      barItem.className = "monthly-bar-item";

      const count = document.createElement("strong");
      count.textContent = item.count;

      const bar = document.createElement("div");
      bar.className = "monthly-bar";
      bar.style.height = Math.max((item.count / maxCount) * 130, 4) + "px";

      const label = document.createElement("span");
      label.textContent = item.label;

      barItem.append(count, bar, label);
      monthlyChart.appendChild(barItem);
    });
  }

  // =====================================
  // MOBILE SIDEBAR
  // =====================================

  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });

    sidebar.querySelectorAll(".menu-item").forEach((link) => {
      link.addEventListener("click", function () {
        sidebar.classList.remove("active");
      });
    });
  }

  // =====================================
  // LOGOUT
  // =====================================

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      SemasaAuth.logout();
    });
  }
});
