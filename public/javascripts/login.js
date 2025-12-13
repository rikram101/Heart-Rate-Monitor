const container = document.querySelector(".container");
const LoginLink = document.querySelector(".SignInLink");
const RegisterLink = document.querySelector(".SignUpLink");

RegisterLink.addEventListener("click", () => {
  container.classList.add("active");
});

LoginLink.addEventListener("click", () => {
  container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", () => {
  // 1. Get the key elements for dynamic field display
  // IMPORTANT: These variables MUST be declared inside the DOMContentLoaded block
  // to ensure they find the HTML elements by ID.
  const roleSelect = document.getElementById("registerRole");
  const deviceBox = document.getElementById("deviceIdBox");
  const licenseBox = document.getElementById("licenseIdBox");

  // Function to show/hide fields and set 'required' attribute based on the selected role
  function updateRegistrationFields() {
    // Safety check (in case the elements failed to load)
    if (!roleSelect || !deviceBox || !licenseBox) {
      return;
    }

    // Get the currently selected role value
    const selectedRole = roleSelect.value;

    // A. Reset/Hide all conditional fields and remove 'required'
    deviceBox.style.display = "none";
    deviceBox.querySelector("input").required = false;

    licenseBox.style.display = "none";
    licenseBox.querySelector("input").required = false;

    // B. Check role and display the appropriate field
    if (selectedRole === "patient") {
      // Patient User: Show Device ID field
      deviceBox.style.display = "flex";
      deviceBox.querySelector("input").required = true;
    } else if (selectedRole === "physician") {
      // Physician: Show Medical License ID field
      licenseBox.style.display = "flex";
      licenseBox.querySelector("input").required = true;
    }
  }

  // 2. Attach event listeners to trigger the update when the dropdown changes
  // This runs only after the elements are guaranteed to exist.
  if (roleSelect && deviceBox && licenseBox) {
    roleSelect.addEventListener("change", updateRegistrationFields);

    // 3. Set the initial state on page load (hides fields if no role is selected)
    updateRegistrationFields();
  }
});
