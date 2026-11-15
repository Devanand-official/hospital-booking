/* =====================================
   SemasaCare - Doctor Management
   Shared accounts with User Management
===================================== */

document.addEventListener("DOMContentLoaded", () => {
  const USERS_KEY = "semasacareUsers";
  const PROFILES_KEY = "semasacareDoctorProfiles";

  const tableBody = document.getElementById("doctorsTableBody");
  const searchInput = document.getElementById("doctorSearch");
  const specialtyFilter = document.getElementById("specialtyFilter");
  const addDoctorBtn = document.getElementById("addDoctorBtn");

  // -------------------------------------
  // LOAD DOCTOR ACCOUNTS
  // -------------------------------------

  function loadDoctorAccounts() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

      if (!Array.isArray(users)) return [];

      // Registered doctor accounts
      const registeredDoctors = users.filter((user) => user.role === "doctor");

      // Existing demo doctor from auth.js
      const demoDoctor = {
        id: 3,
        name: "Doctor",
        email: "doctor@semasacare.com",
        phone: "Not provided",
        role: "doctor",
        accountType: "Demo Account",
      };

      return [demoDoctor, ...registeredDoctors];
    } catch (error) {
      console.error("Unable to load doctor accounts:", error);
      return [];
    }
  }

  // -------------------------------------
  // LOAD DOCTOR PROFILES
  // -------------------------------------

  function loadProfiles() {
    try {
      const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");

      return Array.isArray(profiles) ? profiles : [];
    } catch (error) {
      console.error("Unable to load doctor profiles:", error);
      return [];
    }
  }

  function saveProfiles() {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));

      return true;
    } catch (error) {
      console.error("Unable to save doctor profiles:", error);
      return false;
    }
  }

  let doctors = loadDoctorAccounts();
  let profiles = loadProfiles();

  // -------------------------------------
  // HELPERS
  // -------------------------------------

  function escapeHTML(value = "") {
    return String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }

  function getProfile(userId) {
    return (
      profiles.find((profile) => String(profile.userId) === String(userId)) ||
      null
    );
  }

  function getDoctorData(doctor) {
    const profile = getProfile(doctor.id);

    return {
      ...doctor,
      specialization: profile?.specialization || "",
      qualification: profile?.qualification || "",
      experience: profile?.experience ?? "",
      attendance: profile?.attendance || "Not Set",
    };
  }

  // -------------------------------------
  // STATISTICS
  // -------------------------------------

  function updateStatistics() {
    const doctorData = doctors.map(getDoctorData);

    document.getElementById("totalDoctors").textContent = doctorData.length;

    document.getElementById("presentDoctors").textContent = doctorData.filter(
      (d) => d.attendance === "Present",
    ).length;

    document.getElementById("absentDoctors").textContent = doctorData.filter(
      (d) => d.attendance === "Absent",
    ).length;

    document.getElementById("leaveDoctors").textContent = doctorData.filter(
      (d) => d.attendance === "On Leave",
    ).length;
  }

  // -------------------------------------
  // ATTENDANCE BADGE
  // -------------------------------------

  function getAttendanceBadge(status) {
    const classes = {
      Present: "present",
      Absent: "absent",
      "On Leave": "leave",
      "Not Set": "",
    };

    const className = classes[status] ?? "";

    return `
            <span class="doctor-status ${className}">
                ${escapeHTML(status)}
            </span>
        `;
  }

  // -------------------------------------
  // RENDER DOCTOR TABLE
  // -------------------------------------

  function renderDoctors() {
    const search = searchInput.value.trim().toLowerCase();
    const specialty = specialtyFilter.value;

    const filteredDoctors = doctors.map(getDoctorData).filter((doctor) => {
      const doctorId = String(doctor.id);

      const matchesSearch =
        doctor.name.toLowerCase().includes(search) ||
        doctor.email.toLowerCase().includes(search) ||
        doctorId.toLowerCase().includes(search);

      const matchesSpecialty =
        !specialty || doctor.specialization === specialty;

      return matchesSearch && matchesSpecialty;
    });

    if (filteredDoctors.length === 0) {
      tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-message">
                        No doctor accounts found.
                    </td>
                </tr>
            `;

      return;
    }

    tableBody.innerHTML = filteredDoctors
      .map((doctor) => {
        const profileCompleted = Boolean(
          doctor.specialization &&
          doctor.qualification &&
          doctor.experience !== "",
        );

        return `
                <tr>
                    <td>DOC-${escapeHTML(doctor.id)}</td>

                    <td>${escapeHTML(doctor.name)}</td>

                    <td>
                        ${escapeHTML(doctor.specialization || "Not completed")}
                    </td>

                    <td>${escapeHTML(doctor.email)}</td>

                    <td>${escapeHTML(doctor.phone || "Not provided")}</td>

                    <td>
                        ${getAttendanceBadge(doctor.attendance)}
                    </td>

                    <td>
                        <button
                            class="doctor-action"
                            data-action="edit"
                            data-id="${escapeHTML(doctor.id)}"
                            title="${
                              profileCompleted
                                ? "Edit Profile"
                                : "Complete Profile"
                            }">

                            <i class="fas fa-edit"></i>

                            ${profileCompleted ? "Edit" : "Complete Profile"}
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  // -------------------------------------
  // DOCTOR PROFILE MODAL
  // -------------------------------------

  function createModal() {
    if (document.getElementById("doctorModal")) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      `

            <div class="doctor-modal" id="doctorModal">

                <div class="doctor-modal-content">

                    <div class="modal-heading">

                        <div>
                            <h2 id="modalTitle">Doctor Profile</h2>
                            <p>Manage the doctor's professional details.</p>
                        </div>

                        <button
                            type="button"
                            id="closeModal"
                            class="close-modal">
                            &times;
                        </button>

                    </div>

                    <form id="doctorForm">

                        <input type="hidden" id="doctorId">

                        <div class="form-grid">

                            <div class="form-group">
                                <label>Doctor Name</label>
                                <input id="doctorName" type="text" readonly>
                            </div>

                            <div class="form-group">
                                <label>Email Address</label>
                                <input id="doctorEmail" type="email" readonly>
                            </div>

                            <div class="form-group">
                                <label>Phone Number</label>
                                <input id="doctorPhone" type="text" readonly>
                            </div>

                            <div class="form-group">
                                <label for="doctorSpecialty">
                                    Specialization *
                                </label>

                                <select id="doctorSpecialty" required>
                                    <option value="">Select Specialization</option>
                                    <option>Cardiology</option>
                                    <option>Neurology</option>
                                    <option>Orthopedics</option>
                                    <option>Pediatrics</option>
                                    <option>General Medicine</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="doctorQualification">
                                    Qualification *
                                </label>

                                <input
                                    id="doctorQualification"
                                    type="text"
                                    maxlength="100"
                                    required>
                            </div>

                            <div class="form-group">
                                <label for="doctorExperience">
                                    Experience (Years) *
                                </label>

                                <input
                                    id="doctorExperience"
                                    type="number"
                                    min="0"
                                    max="70"
                                    required>
                            </div>

                            <div class="form-group full-width">
                                <label for="doctorAttendance">
                                    Attendance Status
                                </label>

                                <select id="doctorAttendance">
                                    <option>Not Set</option>
                                    <option>Present</option>
                                    <option>Absent</option>
                                    <option>On Leave</option>
                                </select>
                            </div>

                        </div>

                        <div class="modal-actions">

                            <button
                                type="button"
                                id="cancelModal"
                                class="cancel-btn">
                                Cancel
                            </button>

                            <button
                                type="submit"
                                class="add-doctor-btn">
                                Save Profile
                            </button>

                        </div>

                    </form>

                </div>

            </div>
        `,
    );

    document.getElementById("closeModal").addEventListener("click", closeModal);

    document
      .getElementById("cancelModal")
      .addEventListener("click", closeModal);

    document
      .getElementById("doctorModal")
      .addEventListener("click", (event) => {
        if (event.target.id === "doctorModal") {
          closeModal();
        }
      });

    document
      .getElementById("doctorForm")
      .addEventListener("submit", saveDoctorProfile);
  }

  // -------------------------------------
  // OPEN PROFILE
  // -------------------------------------

  function openModal(doctor) {
    createModal();

    const profile = getProfile(doctor.id);

    document.getElementById("doctorForm").reset();

    document.getElementById("doctorId").value = doctor.id;

    document.getElementById("modalTitle").textContent = profile
      ? "Edit Doctor Profile"
      : "Complete Doctor Profile";

    document.getElementById("doctorName").value = doctor.name;

    document.getElementById("doctorEmail").value = doctor.email;

    document.getElementById("doctorPhone").value =
      doctor.phone || "Not provided";

    document.getElementById("doctorSpecialty").value =
      profile?.specialization || "";

    document.getElementById("doctorQualification").value =
      profile?.qualification || "";

    document.getElementById("doctorExperience").value =
      profile?.experience ?? "";

    document.getElementById("doctorAttendance").value =
      profile?.attendance || "Not Set";

    document.getElementById("doctorModal").classList.add("show");
  }

  function closeModal() {
    document.getElementById("doctorModal")?.classList.remove("show");
  }

  // -------------------------------------
  // SAVE PROFILE
  // -------------------------------------

  function saveDoctorProfile(event) {
    event.preventDefault();

    const userId = document.getElementById("doctorId").value;

    const doctor = doctors.find((d) => String(d.id) === String(userId));

    if (!doctor) {
      alert("Doctor account not found. Refresh the page.");
      return;
    }

    const profileData = {
      userId: userId,
      specialization: document.getElementById("doctorSpecialty").value,
      qualification: document
        .getElementById("doctorQualification")
        .value.trim(),
      experience: Number(document.getElementById("doctorExperience").value),
      attendance: document.getElementById("doctorAttendance").value,
    };

    const existingIndex = profiles.findIndex(
      (profile) => String(profile.userId) === String(userId),
    );

    if (existingIndex >= 0) {
      profiles[existingIndex] = {
        ...profiles[existingIndex],
        ...profileData,
      };
    } else {
      profiles.push(profileData);
    }

    if (!saveProfiles()) {
      alert("Unable to save doctor profile.");
      return;
    }

    closeModal();
    refreshPage();

    alert("Doctor profile saved successfully.");
  }

  // -------------------------------------
  // TABLE ACTIONS
  // -------------------------------------

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit"]');

    if (!button) return;

    const doctor = doctors.find((d) => String(d.id) === button.dataset.id);

    if (doctor) {
      openModal(doctor);
    }
  });

  // -------------------------------------
  // ADD DOCTOR BUTTON
  // Redirect to User Management
  // -------------------------------------

  if (addDoctorBtn) {
    addDoctorBtn.addEventListener("click", () => {
      window.location.href = "../user-management.html";
    });
  }

  // -------------------------------------
  // SEARCH AND FILTER
  // -------------------------------------

  searchInput.addEventListener("input", renderDoctors);

  specialtyFilter.addEventListener("change", renderDoctors);

  // -------------------------------------
  // REFRESH DATA
  // -------------------------------------

  function refreshPage() {
    doctors = loadDoctorAccounts();
    profiles = loadProfiles();

    updateStatistics();
    renderDoctors();
  }

  // Refresh when accounts change in another tab
  window.addEventListener("storage", (event) => {
    if (event.key === USERS_KEY || event.key === PROFILES_KEY) {
      refreshPage();
    }
  });

  // -------------------------------------
  // MOBILE SIDEBAR
  // -------------------------------------

  document.getElementById("menuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("active");
  });

  // -------------------------------------
  // LOGOUT
  // -------------------------------------

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.type = "button";

    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();

      localStorage.removeItem("semasacareSession");

      window.location.replace("../login.html");
    });
  }

  // INITIAL DISPLAY
  refreshPage();
});
