document.addEventListener("DOMContentLoaded", async () => {
  await initUserUI();
  const navbarLinks = document.querySelector(".navbar-links");
  if (await hasToken()) {
    const deleteBtn = document.getElementById("deleteAccountBtn");
    const modal = document.getElementById("deleteAccountModal");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

    deleteBtn.addEventListener("click", function () {
      modal.classList.add("show");
    });

    cancelDeleteBtn.addEventListener("click", function () {
      modal.classList.remove("show");
    });

    confirmDeleteBtn.addEventListener("click", async function () {
      if (!(await hasToken())) {
        alert("Hiba: Nem vagy bejelentkezve.");
        return;
      }

      try {
        const response5 = await getUserData();

        const user_data = response5.data;
        const userId = user_data.id;
        if (!user_data || !userId) {
          alert("Hiba: Nem sikerült lekérni a felhasználói adatokat.");
          return;
        }

        const response = await fetch(`/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          if (data.message === "User and related data deleted successfully") {
            alert("Fiókod sikeresen törölve lett.");
            clearUserCache();

            sessionStorage.removeItem("verification_email");
            sessionStorage.removeItem("verification_entity_id");

            await fetch("/logout", {
              method: "POST",
              credentials: "include",
            });

            window.location.href = "/";
          } else {
            alert("Hiba történt a törlés során.");
          }
        } else {
          alert("Hiba történt a törlés során.");
        }
      } catch (error) {
        alert("Nem sikerült törölni a fiókot.");
      }
    });
  }

  const hamburger = document.getElementById("hamburger");
  const dropdowns = document.querySelectorAll(".dropdown-content");
  const semesterList = document.getElementById("semester-list");

  hamburger.addEventListener("click", (event) => {
    event.stopPropagation();
    navbarLinks.classList.toggle("show");

    if (!navbarLinks.classList.contains("show")) {
      closeDropdowns();
    }
  });

  navbarLinks.addEventListener("click", (event) => {
    const clickedElement = event.target;
    const isDropdown = clickedElement.closest(".dropdown");
    const isButtonOrLink = clickedElement.closest("button, a");

    if (!isDropdown && !isButtonOrLink) {
      closeDropdowns();
    }
  });

  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    const content = dropdown.querySelector(".dropdown-content");

    dropdown.addEventListener("click", (event) => {
      if (window.innerWidth > 1230) {
        return;
      }

      event.stopPropagation();
      const isOpen = content.style.display === "block";
      closeDropdowns();
      content.style.display = isOpen ? "none" : "block";
    });

    content.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  document.addEventListener("click", (event) => {
    const isNavbar =
      event.target.closest("#navbar-links") ||
      event.target.closest("#hamburger");

    if (!isNavbar) {
      closeDropdowns();
      navbarLinks.classList.remove("show");
    }
  });

  function closeDropdowns() {
    if (window.innerWidth <= 1230) {
      dropdowns.forEach((dropdown) => (dropdown.style.display = "none"));
      semesterList.style.display = "none";
    }
  }

  const uploadSection = document.getElementById("upload-sect");
  const logoutButton = document.getElementById("logout");
  const moderationButton = document.getElementById("moderation");
  const loginButton = document.getElementById("navbar-login");
  const userDropdown = document.getElementById("userDropdown");
  const myquizResults = document.getElementById("myquizresults");

  async function removeElementIfExists(element) {
    if (element) {
      element.remove();
    }
  }

  if (await hasToken()) {
    try {
      const response = await getUserData();

      const user_data = response.data;
      const role = user_data.role;

      uploadSection?.classList.add("show");
      userDropdown?.classList.add("show");
      loginButton?.remove();
      logoutButton?.classList.add("show");
      myquizResults?.classList.add("show");

      if (role === "admin" || role === "moderator") {
        moderationButton?.classList.add("show");
      } else {
        removeElementIfExists(moderationButton);
      }
    } catch (error) {}
  } else {
    removeElementIfExists(userDropdown);
    removeElementIfExists(uploadSection);
    removeElementIfExists(myquizResults);
    removeElementIfExists(moderationButton);
    logoutButton?.remove();
    loginButton?.classList.add("show");
  }

  navbarLinks.style.visibility = "visible";
  navbarLinks.style.opacity = "1";
});

document.getElementById("logout").addEventListener("click", async (event) => {
  event.preventDefault();
  sessionStorage.removeItem("verification_email");
  sessionStorage.removeItem("verification_entity_id");

  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      clearUserCache();
      window.location.reload();
    } else {
      alert("Hiba történt a kijelentkezés során.");
    }
  } catch (error) {
    alert("Hálózati hiba történt.");
  }
});

async function loadSemesters() {
  const response = await fetch("/categories");
  const categories = await response.json();

  const semesterList = document.getElementById("semester-list");
  semesterList.innerHTML = "";

  function createCategoryElement(category) {
    const categoryItem = document.createElement("li");
    categoryItem.classList.add("category-item");

    const categoryTitle = document.createElement("span");
    categoryTitle.textContent = category.name;

    if (category.children.length > 0) {
      const arrow = document.createElement("img");
      arrow.classList.add("arrow");
      arrow.src = "/common/arrow.png";
      arrow.alt = "arrow";
      arrow.style.transform = "rotate(0deg)";

      categoryItem.appendChild(categoryTitle);
      categoryItem.appendChild(arrow);

      const subCategoryList = document.createElement("ul");
      subCategoryList.classList.add("subcategory-list");
      subCategoryList.style.display = "none";

      category.children.forEach((subCategory) => {
        subCategoryList.appendChild(createCategoryElement(subCategory));
      });

      categoryItem.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = categoryItem.classList.toggle("open");
        subCategoryList.style.display = isOpen ? "block" : "none";
        arrow.style.transform = isOpen ? "rotate(180deg)" : "rotate(0deg)";
      });

      categoryItem.appendChild(subCategoryList);
    } else {
      const categoryLink = document.createElement("a");
      categoryLink.href = `/catalog/catalog.html?selectedCategoryId=${category.id}`;
      categoryLink.textContent = category.name;
      categoryItem.innerHTML = "";
      categoryItem.appendChild(categoryLink);
    }

    return categoryItem;
  }

  categories.forEach((semester) => {
    const semesterItem = createCategoryElement(semester);
    semesterList.appendChild(semesterItem);
  });
}

function toggleCatalog() {
  const semesterList = document.getElementById("semester-list");
  semesterList.style.display =
    semesterList.style.display === "none" ? "block" : "none";
}

window.onload = loadSemesters;

window.addEventListener("resize", function () {
  if (window.innerWidth > 1230) {
    document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
      dropdown.style.display = "";
    });
  }
});

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
