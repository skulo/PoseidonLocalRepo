async function loadPendingFiles() {
  if (!(await hasToken())) {
    window.location.href = "/static/login.html";
    return;
  }

  const responseT = await getUserData();
  const user_data = responseT.data;
  const role = user_data.role;

  if (role === "user") {
    window.location.href = "/trending/trending.html";
    return;
  }

  const response = await fetch("/moderations/files", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    showAlert("danger", "Nem sikerült betölteni a függő fájlokat.");
    return;
  }
  const responseCat = await fetch("/categories");
  const categories = await responseCat.json();

  function flattenCategories(categories, map = new Map(), parentId = null) {
    categories.forEach((cat) => {
      const extendedCat = { ...cat, parent_id: parentId };
      map.set(cat.id, extendedCat);

      if (cat.children && cat.children.length > 0) {
        flattenCategories(cat.children, map, cat.id);
      }
    });
    return map;
  }

  const categoryMap = flattenCategories(categories);
  function getFullCategoryPath(categoryId) {
    let path = [];
    let current = categoryMap.get(categoryId);
    while (current) {
      path.unshift(current.name);
      current = categoryMap.get(current.parent_id);
    }
    return path.length ? path.join(" / ") : "Ismeretlen kategória";
  }

  const files = await response.json();
  const documentsList = document.getElementById("documents-list");
  documentsList.innerHTML = "";

  const url2 = `/moderation-logs`;
  const response2 = await fetch(url2, {
    credentials: "include",
  });
  const documents2 = await response2.json();
  const recentList = document.getElementById("recent-list");
  recentList.innerHTML = "";

  files.forEach((file) => {
    const uploadDate = new Date(file.uploaded_at);
    const formattedDate = `${
      uploadDate.getMonth() + 1
    }/${uploadDate.getDate()}/${uploadDate.getFullYear()}`;

    const fileElement = document.createElement("div");
    fileElement.classList.add("document-card");

    const categoryText = getFullCategoryPath(file.category_id);

    fileElement.innerHTML = `
            <div class="document-date">${formattedDate}</div>
            <div class="documents-category">${categoryText}</div>
            <div class="document-title">${file.title}</div>
            <div class="document-description">${file.description}</div>
            <div class="document-actions">
                <button class="approve-btn" data-id="${file.id}">Jóváhagyás</button>
                <input type="text" class="reject-reason" placeholder="Elutasítás oka">
                <button class="reject-btn" data-id="${file.id}" disabled>Elutasítás</button>
            </div>
        `;

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

      alertBox
        .querySelector(".closebtn")
        .addEventListener("click", function () {
          alertBox.style.opacity = "0";
          setTimeout(() => alertBox.remove(), 600);
        });

      setTimeout(() => {
        alertBox.style.opacity = "0";
        setTimeout(() => alertBox.remove(), 600);
      }, 6000);
    }

    async function downloadFile(downloadUrl) {
      try {
        let response = await fetch(downloadUrl);

        if (!response.ok) {
          let errorData = await response.json();
          if (errorData.error) {
            showAlert(
              "danger",
              "Jelentkezz be, ha még nem tetted! (" + errorData.error + ")"
            );
            return;
          }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = downloadUrl.split("/").pop();
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        showAlert("danger", "Hálózati hiba történt! Próbáld újra később.");
      }
    }

    fileElement.addEventListener("click", (event) => {
      if (
        !event.target.classList.contains("approve-btn") &&
        !event.target.classList.contains("reject-btn") &&
        !event.target.classList.contains("reject-reason")
      ) {
        downloadFile(file.download_url);
      }
    });

    const rejectInput = fileElement.querySelector(".reject-reason");
    const rejectBtn = fileElement.querySelector(".reject-btn");
    rejectInput.addEventListener("input", () => {
      rejectBtn.disabled = rejectInput.value.trim() === "";
    });

    fileElement
      .querySelector(".approve-btn")
      .addEventListener("click", async () => {
        await approveFile(file.id);
        loadPendingFiles();
      });

    rejectBtn.addEventListener("click", async () => {
      await rejectFile(file.id, rejectInput.value);
      loadPendingFiles();
    });

    documentsList.appendChild(fileElement);
  });

  documents2.forEach(async (doc) => {
    const docCard = document.createElement("div");
    docCard.className = "document-card";

    const docContainer = document.createElement("div");

    const docDate = document.createElement("span");

    const decisionDate = new Date(doc.created_at);
    const formattedDate = `${
      decisionDate.getMonth() + 1
    }/${decisionDate.getDate()}/${decisionDate.getFullYear()}`;

    docDate.className = "document-date";
    docDate.innerText = formattedDate;

    const docTitle = document.createElement("span");
    docTitle.className = "document-title";
    docTitle.innerText = doc.decision;

    const docName = document.createElement("span");
    docName.className = "document-name";
    docName.innerText = doc.document_title;

    const docUploader = document.createElement("span");
    docUploader.className = "document-uploader";
    docUploader.innerText = doc.email;

    docContainer.appendChild(docUploader);
    docContainer.appendChild(docName);
    docContainer.appendChild(docDate);
    docContainer.appendChild(docTitle);

    docCard.appendChild(docContainer);
    recentList.appendChild(docCard);
  });
}

async function approveFile(fileId) {
  const responseT = await getUserData();
  const user_data = responseT.data;
  const role = user_data.role;
  if (role === "user") {
    window.location.href = "/trending/trending.html";

    return;
  }
  const response = await fetch(`/moderations/approve/${fileId}`, {
    method: "PUT",
    credentials: "include",
  });

  if (response.ok) {
    showAlert("success", "Fájl jóváhagyva.");
  } else {
    showAlert("danger", "Hiba történt a jóváhagyás során.");
  }

  const responsee = await fetch("/me", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await responsee.json();
  const sender = data.email;

  const responseAboutUser = await fetch(`/filesinfo/${fileId}`, {
    method: "GET",
    credentials: "include",
  });
  const dataUser = await responseAboutUser.json();

  const receiver = dataUser.usremail;
  const fileTitle = dataUser.title;
  const username = dataUser.usrname;

  const loader = document.getElementById("loader-container");
  loader.style.setProperty("display", "flex", "important");

  const emailResponse = await fetch(
    `/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&username=${username}&decision=approved&fileId=${fileId}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  loader.style.display = "none";

  if (emailResponse.ok) {
    showAlert("info", "Értesítő email elküldve.");
  } else {
    showAlert("danger", "Nem sikerült elküldeni az emailt.");
  }
}

async function rejectFile(fileId, reason) {
  const responseT = await getUserData();
  const user_data = responseT.data;
  const role = user_data.role;
  if (role === "user") {
    window.location.href = "/trending/trending.html";

    return;
  }

  const response = await fetch(
    `/moderations/reject/${fileId}?reason=${encodeURIComponent(reason)}`,
    {
      method: "PUT",
      credentials: "include",
    }
  );

  if (response.ok) {
    showAlert("warning", "Fájl elutasítva.");
  } else {
    showAlert("danger", "Hiba történt az elutasítás során.");
  }

  const responsee = await fetch("/me", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await responsee.json();
  const sender = data.email;

  const responseAboutUser = await fetch(`/filesinfo/${fileId}`, {
    method: "GET",
    credentials: "include",
  });
  const dataUser = await responseAboutUser.json();

  const receiver = dataUser.usremail;
  const fileTitle = dataUser.title;
  const delete_url = dataUser.delete_url;
  const username = dataUser.usrname;

  const loader = document.getElementById("loader-container");
  loader.style.setProperty("display", "flex", "important");

  const emailResponse = await fetch(
    `/email/decision?recipient_email=${receiver}&title=${fileTitle}&sender=${sender}&username=${username}&decision=rejected&fileId=${fileId}&rejection_reason=${reason}`,
    {
      method: "GET",
      credentials: "include",
    }
  );

  loader.style.display = "none";
  if (emailResponse.ok) {
    showAlert("info", "Értesítő email elküldve.");
  } else {
    showAlert("danger", "Nem sikerült elküldeni az emailt.");
  }

  const responseDelete = await fetch(delete_url, {
    method: "DELETE",
    credentials: "include",
  });

  if (responseDelete.ok) {
  }
}

loadPendingFiles();

window.onload = async function () {
  if (!(await hasToken())) {
    if (!(await hasToken())) {
      document.getElementById("auth-link").style.display = "block";
      return;
    }
  }
};
