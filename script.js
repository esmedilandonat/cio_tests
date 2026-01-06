// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    
    form.addEventListener('submit', function(event) {
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
        
        // Crucial Step for Data Integration: Track the form submission event
        _cio.track('form_submitted', {
            email: email,
            name: name
        });
        
        // Log confirmation for debugging
        console.log('Customer.io Identify and Track sent');
        
        // Optional: Clear the form after submission
        form.reset();
        
        // Optional: Show success message to user
        alert('Thank you! Your information has been submitted.');
    });
});
