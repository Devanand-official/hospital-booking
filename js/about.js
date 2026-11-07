
// ==========================================
// MEDCARE ABOUT PAGE
// ==========================================


// MOBILE NAVIGATION

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


// FOOTER YEAR

const currentYear =
    document.getElementById("currentYear");

if (currentYear) {

    currentYear.textContent =
        new Date().getFullYear();

}