function showAlert(type, message) {
  const validTypes = ["success", "info", "warning", "danger"];
  if (!validTypes.includes(type)) {
    return;
  }

  let alertContainer = document.querySelector(".alert-container");
  if (!alertContainer) {
    alertContainer = document.createElement("div");
    alertContainer.className = "alert-container";
    document.body.appendChild(alertContainer);
  }

  let alertBox = document.createElement("div");
  alertBox.className = `alert ${type}`;
  alertBox.innerHTML = `
        <span class="closebtn">&times;</span>
        <strong>${message}</strong>
    `;

  alertContainer.appendChild(alertBox);

  alertBox.querySelector(".closebtn").addEventListener("click", function () {
    alertBox.style.opacity = "0";
    setTimeout(() => alertBox.remove(), 600);
  });

  setTimeout(() => {
    alertBox.style.opacity = "0";
    setTimeout(() => alertBox.remove(), 600);
  }, 6000);
}
