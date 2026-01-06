// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('contact-form');

    form.addEventListener('submit', function (event) {
        try {
            // Prevent default page reload
            event.preventDefault();

            // Capture form values
            const email = document.getElementById('email').value;
            const name = document.getElementById('name').value;

            // Crucial Step for In-App Messages: Identify the user
            _cio.identify({
                id: email,           // Use email as the unique identifier
                email: email,        // Pass email as an attribute
                name: name          // Pass name as an attribute
            });

            // Note: _cio.track() removed - Forms snippet handles automatic tracking

            // Optional: Clear the form after submission
            form.reset();

            // Optional: Show success message to user
            alert('Thank you! Your information has been submitted.');

            // Success log
            console.log("Success: User identified and form data handed off to Customer.io auto-collector.");
        } catch (error) {
            console.error("Error processing form:", error);
        }
    });
});
