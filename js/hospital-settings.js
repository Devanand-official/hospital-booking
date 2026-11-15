// ==========================================
// SEMASACARE - HOSPITAL SETTINGS
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
  // --------------------------------------
  // ADMIN AUTHENTICATION
  // --------------------------------------

  const currentUser = SemasaAuth.getCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (currentUser.role !== "admin") {
    window.location.href = "login.html";
    return;
  }

  // --------------------------------------
  // ELEMENTS
  // --------------------------------------

  const settingsForm = document.getElementById("hospitalSettingsForm");
  const saveMessage = document.getElementById("saveMessage");
  const logoutBtn = document.getElementById("logoutBtn");

  const STORAGE_KEY = "semasacareHospitalSettings";

  // --------------------------------------
  // DEFAULT SETTINGS
  // --------------------------------------

  const defaultSettings = {
    hospitalName: "SemasaCare Hospital",
    hospitalAddress: "",
    hospitalPhone: "",
    hospitalEmail: "",
    openingTime: "09:00",
    closingTime: "18:00",
    appointmentDuration: "30",
    bookingEnabled: true,
    dateFormat: "DD-MM-YYYY",
    notificationsEnabled: true,
  };

  // --------------------------------------
  // GET SAVED SETTINGS
  // --------------------------------------

  function getSavedSettings() {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);

      if (!savedSettings) {
        return { ...defaultSettings };
      }

      const parsedSettings = JSON.parse(savedSettings);

      if (
        !parsedSettings ||
        typeof parsedSettings !== "object" ||
        Array.isArray(parsedSettings)
      ) {
        return { ...defaultSettings };
      }

      return {
        ...defaultSettings,
        ...parsedSettings,
      };
    } catch (error) {
      console.error("Unable to load hospital settings:", error);
      return { ...defaultSettings };
    }
  }

  // --------------------------------------
  // LOAD SETTINGS INTO FORM
  // --------------------------------------

  function loadSettings() {
    const settings = getSavedSettings();

    document.getElementById("hospitalName").value = settings.hospitalName;

    document.getElementById("hospitalAddress").value = settings.hospitalAddress;

    document.getElementById("hospitalPhone").value = settings.hospitalPhone;

    document.getElementById("hospitalEmail").value = settings.hospitalEmail;

    document.getElementById("openingTime").value = settings.openingTime;

    document.getElementById("closingTime").value = settings.closingTime;

    document.getElementById("appointmentDuration").value =
      settings.appointmentDuration;

    document.getElementById("bookingEnabled").checked = settings.bookingEnabled;

    document.getElementById("dateFormat").value = settings.dateFormat;

    document.getElementById("notificationsEnabled").checked =
      settings.notificationsEnabled;
  }

  // --------------------------------------
  // SAVE SETTINGS
  // --------------------------------------

  settingsForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const openingTime = document.getElementById("openingTime").value;

    const closingTime = document.getElementById("closingTime").value;

    // Validate working hours
    if (openingTime >= closingTime) {
      showMessage("Closing time must be later than opening time.", "error");
      return;
    }

    const settings = {
      hospitalName: document.getElementById("hospitalName").value.trim(),
      hospitalAddress: document.getElementById("hospitalAddress").value.trim(),
      hospitalPhone: document.getElementById("hospitalPhone").value.trim(),
      hospitalEmail: document.getElementById("hospitalEmail").value.trim(),

      openingTime: openingTime,
      closingTime: closingTime,

      appointmentDuration: document.getElementById("appointmentDuration").value,

      bookingEnabled: document.getElementById("bookingEnabled").checked,

      dateFormat: document.getElementById("dateFormat").value,

      notificationsEnabled: document.getElementById("notificationsEnabled")
        .checked,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

      showMessage("Hospital settings saved successfully.", "success");
    } catch (error) {
      console.error("Unable to save hospital settings:", error);

      showMessage("Unable to save settings. Please try again.", "error");
    }
  });

  // --------------------------------------
  // DISPLAY SAVE MESSAGE
  // --------------------------------------

  function showMessage(message, type) {
    saveMessage.textContent = message;
    saveMessage.className = type;
  }

  // --------------------------------------
  // LOGOUT
  // --------------------------------------

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      SemasaAuth.logout();
    });
  }

  // --------------------------------------
  // MOBILE SIDEBAR
  // --------------------------------------

  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");

  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", function () {
      sidebar.classList.toggle("active");
    });
  }

  // --------------------------------------
  // INITIALIZE
  // --------------------------------------

  loadSettings();
});
