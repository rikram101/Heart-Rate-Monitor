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
  const licenseBox = document.getElementById("licenseIdBox");

  function updateRegistrationFields() {
    if (!roleSelect || !licenseBox) return;

    const selectedRole = roleSelect.value;

    // Hide/reset
    licenseBox.style.display = "none";
    licenseBox.querySelector("input").required = false;

    // Show for physician
    if (selectedRole === "physician") {
      licenseBox.style.display = "flex";
      licenseBox.querySelector("input").required = true;
    }
  }

  if (roleSelect && licenseBox) {
    roleSelect.addEventListener("change", updateRegistrationFields);
    updateRegistrationFields();
  }
});
