
// ==========================================
// MEDCARE CONTACT FORM
// ==========================================

const contactForm =
    document.getElementById("contactForm");

const contactSuccess =
    document.getElementById("contactSuccess");

const newMessageButton =
    document.getElementById("newMessage");


// SUBMIT CONTACT FORM

contactForm.addEventListener("submit", function(event) {

    event.preventDefault();


    // GET FORM VALUES

    const name =
        document.getElementById("contactName").value.trim();

    const email =
        document.getElementById("contactEmail").value.trim();

    const phone =
        document.getElementById("contactPhone").value.trim();

    const subject =
        document.getElementById("contactSubject").value;

    const message =
        document.getElementById("contactMessage").value.trim();


    // VALIDATION

    if (!name || !email || !subject || !message) {

        alert("Please fill in all required fields.");

        return;

    }

    if (phone && !/^[0-9]{10}$/.test(phone)) {

        alert("Please enter a valid 10-digit phone number.");

        return;

    }


    // CREATE ENQUIRY

    const enquiry = {

        id: "ENQ" + Date.now(),

        name: name,

        email: email,

        phone: phone,

        subject: subject,

        message: message,

        submittedAt: new Date().toISOString()

    };


    // SAVE ENQUIRY

    try {

        const savedEnquiries = JSON.parse(
            localStorage.getItem("medcareEnquiries") || "[]"
        );

        if (!Array.isArray(savedEnquiries)) {
            throw new Error("Invalid enquiry storage.");
        }

        savedEnquiries.push(enquiry);

        localStorage.setItem(
            "medcareEnquiries",
            JSON.stringify(savedEnquiries)
        );

    } catch (error) {

        console.error(error);

        alert("Unable to save your message. Please try again.");

        return;

    }


    // SHOW SUCCESS

    contactForm.hidden = true;

    contactSuccess.hidden = false;

    contactSuccess.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

});


// SEND ANOTHER MESSAGE

newMessageButton.addEventListener("click", function() {

    contactForm.reset();

    contactForm.hidden = false;

    contactSuccess.hidden = true;

});


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

    currentYear.textContent = new Date().getFullYear();

}