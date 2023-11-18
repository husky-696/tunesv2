// profile.js

const avatarLabel = document.querySelector('.avatar-label');
const profilePictureInput = document.getElementById('profilePicture');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const closeError = document.getElementById('close-error');

// Function to trigger file input click when the custom button is clicked
function selectProfilePicture() {
    document.getElementById('profilePicture').click();
}

// Function to display the selected file name (optional)
function displaySelectedFile() {
    const fileName = document.getElementById('profilePicture').value.split('\\').pop();
    document.getElementById('profilePicture').innerText = fileName || 'Upload Profile Picture';
}

avatarLabel.addEventListener('click', () => {
    profilePictureInput.click();
});

// Function to show the error message with a given text
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
}

// Function to hide the error message
function hideError() {
    errorMessage.style.display = 'none';
}

// Add a click event to the close button to hide the error message
closeError.addEventListener('click', hideError);


function showTab(tabName) {
    const tabs = document.getElementsByClassName('content-tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].style.display = 'none';
    }
    document.getElementById(tabName + '-tab').style.display = 'block';
}
