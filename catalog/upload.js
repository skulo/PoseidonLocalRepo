const dropSection = document.querySelector(".drop-section");
const listSection = document.querySelector(".list-section");
const listCont = document.querySelector(".list");
const fileSelector = document.querySelector(".file-selector");
const fileSelectorInput = document.querySelector(".file-selector-input");
const uploadButton = document.querySelector(".upload-button");
const groupedCheckbox = document.querySelector(".grouped-checkbox");
const fileNameInput = document.querySelector(".file-name-input");

let selectedFiles = [];

fileSelector.onclick = () => fileSelectorInput.click();
fileSelectorInput.onchange = () => {
  [...fileSelectorInput.files].forEach((file) => {
    addFileToList(file);
  });
};

dropSection.ondragover = (e) => {
  e.preventDefault();
  dropSection.classList.add("drag-anim");
};

dropSection.ondragleave = () => dropSection.classList.remove("drag-anim");

dropSection.ondrop = (e) => {
  e.preventDefault();
  dropSection.classList.remove("drag-anim");

  [...e.dataTransfer.files].forEach((file) => {
    addFileToList(file);
  });
};

function isForbiddenExtension(file) {
  const forbiddenExtensions = [".exe", ".sh"];
  return forbiddenExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
}

function addFileToList(file) {
  if (selectedFiles.length >= 15) {
    showAlert("danger", "Maximum 15 fájl választható ki egyszerre.");
    return;
  }

  if (isForbiddenExtension(file)) {
    showAlert("danger", "Az .exe, .sh fájlok feltöltése nem engedélyezett.");
    return;
  }

  listSection.style.display = "block";
  selectedFiles.push(file);

  const li = document.createElement("li");
  li.classList.add("in-prog");
  li.innerHTML = `
        <div class="col">
            <img src="icons/${imageForFile(file.type, file.name)}" alt="">
        </div>
        <div class="col">
            <div class="file-name">
                <div class="name">${file.name}</div>
                <span>${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <div class="file-size">${(file.size / (1024 * 1024)).toFixed(
              2
            )} MB</div>
        </div>
        <div class="col">
            <button class="remove-file">❌</button>
        </div>
    `;
  listCont.appendChild(li);

  li.querySelector(".remove-file").onclick = () => {
    selectedFiles = selectedFiles.filter((f) => f !== file);
    li.remove();
  };
}

const inputField = document.querySelector(".file-name-input");

inputField.addEventListener("input", () => {
  if (inputField.value.length > 14) {
    inputField.value = inputField.value.slice(0, 14);
  }
});

document.querySelector(".upload-button").addEventListener("click", async () => {
  if (!(await hasToken())) {
    alert("Nincs bejelentkezve felhasználó");
    return;
  }

  const response = await getUserData();
  if (!response.ok) return;

  const user_data = response.data;
  const userId = user_data.id;
  const role = user_data.role;

  const groupedCheckbox = document.querySelector(".grouped-checkbox");
  const fileName = inputField.value.trim() || "untitled";
  if (selectedFiles.length === 0) {
    alert("Nincs kiválasztott fájl!");
    return;
  }

  if (groupedCheckbox.checked) {
    if (selectedFiles.length > 15) {
      showAlert("danger", "Maximum 15 fájlt lehet egy ZIP-be csoportosítani.");
      return;
    }
    const zip = new JSZip();
    selectedFiles.forEach((file) => zip.file(file.name, file));

    try {
      const zipBlob = await zip.generateAsync({ type: "blob" });

      if (zipBlob.size > 20 * 1024 * 1024) {
        const zipSizeMB = (zipBlob.size / (1024 * 1024)).toFixed(2);
        showAlert(
          "danger",
          `A ZIP fájl túl nagy! Maximum méret: 20MB. Jelenlegi méret: ${zipSizeMB}MB.`
        );
        return;
      }
      const formData = new FormData();
      formData.append("file", zipBlob, `${fileName}.zip`);
      formData.append("title", fileName);
      formData.append("description", `${fileName}.zip`);
      formData.append("uploaded_by", userId);
      formData.append("role", role);
      formData.append("category_id", selectedCategoryId);

      const response = await fetch("/upload/", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Hiba történt a fájlfeltöltés során!";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {}
        showAlert("danger", errorMessage);
        return;
      }

      const data = await response.json();

      if (data.message === "ERROR") {
        showAlert(
          "danger",
          "File exceeded the maximum size of 20MB. Current size: " +
            data.error +
            "MB"
        );
        return;
      }
      if (data.message === "Sikeres feltöltés.") {
        showAlert("success", data.message);
        clearUserCache();
        await initUserUI();
      }
      if (
        data.message ===
        "Sikeres feltöltés! A fájl jelenleg jóváhagyásra vár. Értesítünk, amint elérhetővé válik."
      ) {
        showAlert("info", data.message);
        clearUserCache();
        await initUserUI();
      }
    } catch (error) {
      alert("Nem sikerült a ZIP létrehozása.");
    }
  } else {
    if (selectedFiles.length > 5) {
      showAlert("danger", "Maximum 5 fájlt lehet egyszerre feltölteni.");
      return;
    }

    let index = 1;
    const MAX_FILE_SIZE = 20 * 1024 * 1024;

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        showAlert(
          "danger",
          `Egy fájl túl nagy! Mérete: ${(file.size / 1024 / 1024).toFixed(
            2
          )} MB. A maximális méret 20 MB.`
        );
        return;
      }
    }

    for (const file of selectedFiles) {
      const formData = new FormData();
      const isMultiple = selectedFiles.length > 1;
      const numberedFileName = isMultiple ? `${fileName}_${index}` : fileName;

      formData.append("file", file);
      formData.append("title", numberedFileName);
      formData.append("description", file.name);
      formData.append("uploaded_by", userId);
      formData.append("role", role);
      formData.append("category_id", selectedCategoryId);
      index++;

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const response = await fetch("/upload/", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = "Hiba történt a fájlfeltöltés során!";
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorMessage;
          } catch (jsonError) {}
          showAlert("danger", errorMessage);
          return;
        }

        const data = await response.json();

        if (data.message === "ERROR") {
          showAlert("danger", "File exceeded the maximum size of 20MB.");
          return;
        }
        if (data.message === "Sikeres feltöltés.") {
          showAlert("success", data.message);
          clearUserCache();
          await initUserUI();
        }
        if (
          data.message ===
          "Sikeres feltöltés! A fájl jelenleg jóváhagyásra vár. Értesítünk, amint elérhetővé válik."
        ) {
          showAlert("info", data.message);
          clearUserCache();
          await initUserUI();
        }
      } catch (error) {
        showAlert("danger", `Nem sikerült a feltöltés: ${file.name}`);
      }
    }
  }
  loadDocuments(selectedCategoryId);
  emptyUpload();
  hideList();
});

function imageForFile(type, name = "") {
  const loweredName = name.toLowerCase();

  if (type.includes("pdf")) return "pdf-73.svg";
  if (type.startsWith("image/")) return "image.png";
  if (type.startsWith("video/") || loweredName.endsWith(".avi"))
    return "avi-31.svg";
  if (type.startsWith("audio/") || loweredName.endsWith(".mp3"))
    return "mp3-39.svg";
  if (
    type.includes("msword") ||
    loweredName.endsWith(".docx") ||
    loweredName.endsWith(".doc") ||
    loweredName.endsWith(".docx")
  )
    return "doc-43.svg";
  if (
    type.includes("powerpoint") ||
    loweredName.endsWith(".ppt") ||
    loweredName.endsWith(".pptx")
  )
    return "ppt-50.svg";
  if (
    type.includes("ms-excel") ||
    loweredName.endsWith(".xls") ||
    loweredName.endsWith(".csv") ||
    loweredName.endsWith(".xlsx")
  )
    return "xls-15.svg";
  if (type.includes("zip") || loweredName.endsWith(".zip")) return "zip-40.png";
  if (type === "text/plain" || loweredName.endsWith(".txt"))
    return "txt-47.svg";
  if (type === "application/json" || loweredName.endsWith(".json"))
    return "json-3.svg";
  if (loweredName.endsWith(".csv")) return "csv-6.svg";
  if (loweredName.endsWith(".js")) return "js-9.svg";
  if (loweredName.endsWith(".php")) return "php-13.svg";
  if (loweredName.endsWith(".css")) return "css-28.svg";
  if (loweredName.endsWith(".html") || loweredName.endsWith(".htm"))
    return "html-39.svg";
  if (loweredName.endsWith(".sql")) return "sql-8.svg";

  return "file.png";
}

function emptyUpload() {
  const fileInput = document.querySelector(".file-selector-input");

  fileInput.value = "";
  selectedFiles = [];
  document.querySelector(".file-name-input").value = "";
  const listSection = document.querySelector(".list");
  listSection.innerHTML = "";
}

function hideList() {
  const listSection = document.querySelector(".list-section");
  listSection.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async function () {
  const uploadButton = document.getElementById("toggle-upload");
  const uploadSection = document.getElementById("upload-sect");
  const arrowImg = document.getElementById("arrow-img");

  if (!(await hasToken())) {
    return;
  }

  try {
    const response = await getUserData();

    if (!response.ok) {
      return;
    }

    uploadButton.style.display = "flex";

    uploadButton.addEventListener("click", function () {
      if (uploadSection.classList.contains("open")) {
        uploadSection.classList.remove("open");
        arrowImg.style.transform = "rotate(0deg)";
      } else {
        uploadSection.classList.add("open");
        arrowImg.style.transform = "rotate(180deg)";
      }
    });
  } catch (error) {}
});
