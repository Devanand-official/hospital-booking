
// ===================================
// MEDCARE DOCTOR DATABASE
// ===================================

const doctors = [
    {
        id: 1,
        name: "Dr. Arun Kumar",
        specialty: "Cardiology",
        experience: "10+ Years",
        qualification: "MBBS, MD Cardiology",
        availability: "Mon - Fri",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500"
    },

    {
        id: 2,
        name: "Dr. Priya Sharma",
        specialty: "Pediatrics",
        experience: "8+ Years",
        qualification: "MBBS, MD Pediatrics",
        availability: "Mon - Sat",
        image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=500"
    },

    {
        id: 3,
        name: "Dr. Michael Raj",
        specialty: "Neurology",
        experience: "12+ Years",
        qualification: "MBBS, DM Neurology",
        availability: "Mon - Fri",
        image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500"
    },

    {
        id: 4,
        name: "Dr. Sneha Reddy",
        specialty: "Dermatology",
        experience: "7+ Years",
        qualification: "MBBS, MD Dermatology",
        availability: "Tue - Sat",
        // image: "https://images.unsplash.com/photo-1559839734-2b71xea197ec?w=500"
        image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=500&q=80"
    },

    {
        id: 5,
        name: "Dr. Rajesh Kumar",
        specialty: "Orthopedics",
        experience: "15+ Years",
        qualification: "MBBS, MS Orthopedics",
        availability: "Mon - Sat",
        image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=500"
    },

    {
        id: 6,
        name: "Dr. Anjali Menon",
        specialty: "General Medicine",
        experience: "9+ Years",
        qualification: "MBBS, MD General Medicine",
        availability: "Mon - Fri",
        image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500"
    }
];


// ===================================
// HTML ELEMENTS
// ===================================

const doctorList = document.getElementById("doctorList");

const searchInput = document.getElementById("searchDoctor");

const specialtyFilter = document.getElementById("specialtyFilter");

const doctorCount = document.getElementById("doctorCount");

const noResults = document.getElementById("noResults");


// ===================================
// DISPLAY DOCTORS
// ===================================

function displayDoctors(doctorArray) {

    doctorList.innerHTML = "";

    doctorArray.forEach((doctor) => {

        const doctorCard = document.createElement("article");

        doctorCard.className = "profile-card";

        const image = document.createElement("img");
        image.src = doctor.image;
        image.alt = doctor.name;
        image.loading = "lazy";

        const details = document.createElement("div");
        details.className = "profile-details";

        const specialty = document.createElement("span");
        specialty.className = "profile-specialty";
        specialty.textContent = doctor.specialty;

        const name = document.createElement("h3");
        name.textContent = doctor.name;

        const experience = document.createElement("p");
        experience.className = "experience";
        experience.textContent = doctor.experience + " Experience";

        const meta = document.createElement("div");
        meta.className = "profile-meta";

        const qualification = document.createElement("span");
        qualification.textContent = doctor.qualification;

        const availability = document.createElement("span");
        availability.textContent = doctor.availability;

        meta.append(qualification, availability);

        const bookingLink = document.createElement("a");
        bookingLink.className = "btn btn-primary";
        bookingLink.textContent = "Book Appointment";

        bookingLink.href =
            `appointments.html?doctor=${doctor.id}`;

        details.append(
            specialty,
            name,
            experience,
            meta,
            bookingLink
        );

        doctorCard.append(image, details);

        doctorList.appendChild(doctorCard);

    });

    doctorCount.textContent =
        `Showing ${doctorArray.length} doctors`;

    noResults.hidden = doctorArray.length !== 0;

    doctorList.hidden = doctorArray.length === 0;
}


// ===================================
// SEARCH AND FILTER
// ===================================

function filterDoctors() {

    const searchValue =
        searchInput.value.toLowerCase().trim();

    const selectedSpecialty =
        specialtyFilter.value;

    const filteredDoctors = doctors.filter((doctor) => {

        const matchesName =
            doctor.name.toLowerCase().includes(searchValue);

        const matchesSpecialty =
            selectedSpecialty === "all" ||
            doctor.specialty === selectedSpecialty;

        return matchesName && matchesSpecialty;

    });

    displayDoctors(filteredDoctors);
}


// ===================================
// EVENT LISTENERS
// ===================================

searchInput.addEventListener("input", filterDoctors);

specialtyFilter.addEventListener("change", filterDoctors);


// ===================================
// MOBILE NAVIGATION
// ===================================

const menuToggle = document.getElementById("menuToggle");

const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");
    });
});


// ===================================
// FOOTER YEAR
// ===================================

document.getElementById("currentYear").textContent =
    new Date().getFullYear();


// ===================================
// INITIAL DISPLAY
// ===================================

displayDoctors(doctors);