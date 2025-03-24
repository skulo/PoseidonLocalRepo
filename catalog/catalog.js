let username = localStorage.getItem("username");
let isAdminOrModerator = false;

const urlParams = new URLSearchParams(window.location.search);
let selectedCategoryId = urlParams.get("selectedCategoryId") || 1;

function updatePaginationControls() {
  document.getElementById("page-indicator-bottom").innerText = currentPage;
  document.getElementById("page-indicator-top").innerText = currentPage;

  const disableElement = (element, condition) => {
    element.style.opacity = condition ? "0.5" : "1";
    element.style.pointerEvents = condition ? "none" : "auto";
  };

  disableElement(document.getElementById("prevPageTop"), currentPage <= 1);
  disableElement(
    document.getElementById("nextPageTop"),
    currentPage >= maxPage
  );
  disableElement(document.getElementById("prevPageBottom"), currentPage <= 1);
  disableElement(
    document.getElementById("nextPageBottom"),
    currentPage >= maxPage
  );
}

function nextPage() {
  currentPage++;
  loadDocuments(selectedCategoryId, currentPage);
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    loadDocuments(selectedCategoryId, currentPage);
  }
}

let currentPage = 1;
let maxPage = 1;
const pageSize = 5;

async function loadDocuments(categoryId = null, page = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  selectedCategoryId = categoryId;

  const url = categoryId
    ? `/files/${categoryId}?page=${page}&page_size=${pageSize}`
    : `/files?page=${page}&page_size=${pageSize}`;
  const response = await fetch(url);

  if (!response.ok) {
    alert("Nincs több adat!");
    return;
  }
  const jsonData = await response.json();
  const documents = jsonData.documents;
  maxPage = jsonData.max_page;

  document.getElementById("prevPageTop").disabled = page <= 1;
  document.getElementById("nextPageTop").disabled = page >= maxPage;

  document.getElementById("prevPageBottom").disabled = page <= 1;
  document.getElementById("nextPageBottom").disabled = page >= maxPage;
  currentPage = page;
  const documentsList = document.getElementById("documents-list");
  documentsList.innerHTML = "";
  async function loadCategoryTitle(selectedCategoryId) {
    const responseCat = await fetch("/categories");
    const categories = await responseCat.json();

    function findCategoryPath(category, path = []) {
      if (category.id === selectedCategoryId) {
        return [...path, category.name];
      }
      for (const child of category.children) {
        const foundPath = findCategoryPath(child, [...path, category.name]);
        if (foundPath) return foundPath;
      }
      return null;
    }

    let categoryPath = null;
    for (const cat of categories) {
      categoryPath = findCategoryPath(cat);
      if (categoryPath) break;
    }

    if (categoryPath) {
      document.getElementById("documents-category-title").innerText =
        categoryPath.join(" / ");
    }
  }

  if (!isNaN(selectedCategoryId)) {
    loadCategoryTitle(selectedCategoryId);
  }

  documents.forEach(async (doc) => {
    if (doc.status === "approved") {
      const docCard = document.createElement("div");
      docCard.className = "document-card";

      const docContainer = document.createElement("div");

      const docDate = document.createElement("span");
      docDate.className = "document-date";
      docDate.innerText = doc.uploaded_at_display;

      const docTitle = document.createElement("span");
      docTitle.className = "document-title";
      docTitle.innerHTML = `
            ${doc.title}
            <span class="popularity">
                <img src="/common/flame.webp" alt="🔥" class="flame-icon">
                ${doc.popularity}
            </span>
            `;

      const docDescription = document.createElement("span");
      docDescription.className = "document-description";
      docDescription.innerText = doc.description;

      const docActions = document.createElement("div");
      docActions.className = "document-actions";

      const response = await getUserData();
      if (response.ok) {
        const user_data = response.data;
        const userId = user_data.id;
        const role = user_data.role;

        const waitForQuizReady = async (quizId) => {
          const maxRetries = 60;
          let attempts = 0;
          let loaderContainer = document.getElementById("loader-container");
          loaderContainer.style.setProperty("display", "flex", "important");

          while (attempts < maxRetries) {
            const response = await fetch(`/check-quiz-status/${quizId}`);
            const data = await response.json();

            if (data.ready) {
              loaderContainer.style.display = "none";
              return;
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
            attempts++;
          }
        };

        const startQuizGeneration = async (lang, maxQuestions) => {
          try {
            const responsez = await getUserData();
            const user_data = responsez.data;
            const userId = user_data.id;

            let loaderContainer = document.getElementById("loader-container");
            loaderContainer.style.setProperty("display", "flex", "important");

            const response = await fetch(
              `/generate-quiz/${doc.id}-${doc.file_name}?lang=${lang}&max_questions=${maxQuestions}&user_id=${userId}`,
              {
                method: "GET",
                credentials: "include",
                signal: controller.signal,
              }
            );

            if (!response.ok) {
              let errorMessage = "Ismeretlen hiba történt.";
              try {
                const errorData = await response.json();
                if (errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch (jsonError) {}

              throw new Error(errorMessage);
            }

            const quizData = await response.json();
            const quizId = quizData.quiz_id;

            if (quizId) {
              await waitForQuizReady(quizId);

              clearUserCache();
              await initUserUI();
              const refresh = await getUserData();
              window.location.href = `/quiz/quiz.html?quiz_id=${quizId}`;
            } else {
              throw new Error("Érvénytelen válasz a szervertől.");
            }
          } catch (error) {
            let loaderContainer = document.getElementById("loader-container");
            loaderContainer.style.display = "none";
            showAlert("danger", error.message);
          }
        };

        const showQuizSettingsModal = () => {
          const modal = document.createElement("div");
          modal.className = "modal";

          modal.innerHTML = `
                    <div class="modal-content">
                        <h2>Kvíz beállítások</h2>
                        <label for="lang-select">Milyen nyelvű a dokumentumod?</label>
                        <select id="lang-select">
                            <option value="magyar">Magyar</option>
                            <option value="angol">Angol</option>
                        </select>
                        <br>
                        <label for="max-questions">Hány kérdést szeretnél? (Max 20)</label>
                        <input type="number" id="max-questions" value="5" min="1" max="20">
                        <label for="max-questions" style="font-size: 0.7em;">Előfordulhat, hogy kevesebb kérdés generálódik</label>

                        <br>
                        <button id="start-quiz-btn">Indítás</button>
                        <button id="cancel-btn">Mégse</button>
                    </div>
                `;

          document.body.appendChild(modal);

          document.getElementById("start-quiz-btn").onclick = () => {
            const lang = document.getElementById("lang-select").value;
            const maxQuestions = document.getElementById("max-questions").value;
            document.body.removeChild(modal);
            startQuizGeneration(lang, maxQuestions);
          };

          document.getElementById("cancel-btn").onclick = () => {
            document.body.removeChild(modal);
          };
        };

        let quizButton;
        const allowedExtensions = ["docx", "pdf", "ppt", "txt", "pptx"];
        const fileExtension = doc.file_name.split(".").pop().toLowerCase();
        if (allowedExtensions.includes(fileExtension)) {
          quizButton = document.createElement("button");
          quizButton.innerText = "Kvíz";
          quizButton.className = "quiz-button";
          quizButton.onclick = showQuizSettingsModal;
          docActions.appendChild(quizButton);
        }

        if (role === "admin" || doc.uploaded_by === userId) {
          const deleteButton = document.createElement("button");
          deleteButton.innerText = "Törlés";
          deleteButton.className = "delete-button";

          const editButton = document.createElement("button");
          editButton.innerText = "Szerkeszt";
          editButton.className = "edit-button";

          editButton.onclick = async () => {
            deleteButton.style.display = "none";
            if (quizButton) {
              quizButton.style.display = "none";
            }

            editButton.style.display = "none";

            const title = doc.title;
            const description = doc.description;
            const deleteurl = doc.delete_url;
            if (!(await hasToken())) {
              alert("Nincs bejelentkezve felhasználó");
              return null;
            }

            const responser = await getUserData();
            const user_data = responser.data;
            const userId = user_data.id;
            const role = user_data.role;

            let fileInput =
              editButton.parentElement.querySelector(".edit-file-input");
            if (!fileInput) {
              fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.id = "edit-file-input";
              fileInput.classList.add("edit-file-input");

              editButton.insertAdjacentElement("afterend", fileInput);
            }
            fileInput.style.display = "block";
            fileInput.style.width = "80px";
            fileInput.style.height = "30px";
            fileInput.click();

            const cancelButton = document.createElement("button");
            cancelButton.innerText = "Cancel";
            cancelButton.style.display = "block";
            cancelButton.classList.add("cancelButton");
            docActions.appendChild(cancelButton);

            const submitButton = document.createElement("button");
            submitButton.innerText = "Submit";
            submitButton.classList.add("submitButton");
            docActions.appendChild(submitButton);

            cancelButton.onclick = () => {
              fileInput.style.display = "none";
              cancelButton.style.display = "none";
              submitButton.style.display = "none";
              if (quizButton) {
                quizButton.style.display = "inline-block";
              }
              deleteButton.style.display = "inline-block";
              editButton.style.display = "inline-block";
              return;
            };

            submitButton.onclick = async () => {
              const fileNew = fileInput.files[0];
              const files = fileInput.files;
              if (!fileNew) {
                showAlert("warning", "Kérlek válassz fájlt!");
                return;
              }

              const MAX_FILE_SIZE = 20 * 1024 * 1024;
              if (fileNew.size > MAX_FILE_SIZE) {
                const fileSizeMB = (fileNew.size / (1024 * 1024)).toFixed(2);
                showAlert(
                  "danger",
                  `A fájl túl nagy! Maximum méret: 20MB. Jelenlegi méret: ${fileSizeMB}MB.`
                );
                return;
              }

              const formData = new FormData();
              formData.append("uploaded_by", userId);
              formData.append("file", fileNew);
              formData.append("title", title);
              formData.append("description", description);
              formData.append("role", role);
              formData.append("category_id", selectedCategoryId);
              formData.append("is_edit", true);

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
                  "Hiba történt: " + (data.error || "Ismeretlen hiba.")
                );
                return;
              }

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
                showAlert("success", "Sikeres feltöltés.");
                clearUserCache();
                await initUserUI();
              }
              if (
                data.message ===
                "Sikeres feltöltés! A fájl jelenleg jóváhagyásra vár. Értesítünk, amint elérhetővé válik."
              ) {
                showAlert(
                  "info",
                  "Sikeres feltöltés! A fájl jelenleg jóváhagyásra vár. Értesítünk, amint elérhetővé válik."
                );
                clearUserCache();
                await initUserUI();
              }

              try {
                const response = await fetch(deleteurl, {
                  method: "DELETE",
                  credentials: "include",
                });

                if (response.ok) {
                  loadDocuments(selectedCategoryId);
                } else {
                  const errorResponse = await response.json();
                }
              } catch (error) {}

              fileInput.style.display = "none";
              cancelButton.style.display = "none";
              submitButton.style.display = "none";
              quizButton.style.display = "inline-block";
              deleteButton.style.display = "inline-block";
              editButton.style.display = "inline-block";
            };
          };

          deleteButton.onclick = async () => {
            try {
              const response = await fetch(doc.delete_url, {
                method: "DELETE",
                credentials: "include",
              });

              if (response.ok) {
                showAlert("success", "Sikeres törlés!");
                loadDocuments(selectedCategoryId);
              } else {
                const errorResponse = await response.json();
              }
            } catch (error) {}
          };

          docActions.appendChild(deleteButton);
          docActions.appendChild(editButton);
        }
      }

      docContainer.appendChild(docDate);
      docContainer.appendChild(docTitle);
      docContainer.appendChild(docDescription);
      docContainer.appendChild(docActions);

      docCard.appendChild(docContainer);

      docCard.onclick = async (e) => {
        if (!e.target.closest(".document-actions")) {
          try {
            const success = await downloadFile(doc.download_url);

            if (success) {
              const response = await fetch(
                `/api/documents/${doc.id}/increase_popularity`,
                {
                  method: "POST",
                }
              );

              let result = null;

              if (response.status === 429) {
              } else if (!response.ok) {
              } else {
                result = await response.json();
              }

              if (result && result.new_popularity !== undefined) {
                const popularitySpan = docCard.querySelector(".popularity");
                if (popularitySpan) {
                  popularitySpan.innerHTML = `
                                            <img src="/common/flame.webp" alt="🔥" class="flame-icon">
                                            ${result.new_popularity}
                                        `;
                }
              }
            }
          } catch (error) {}
        }
      };
      documentsList.appendChild(docCard);
    }
  });
  updatePaginationControls();
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
        return false;
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

    return true;
  } catch (error) {
    showAlert("danger", "Hálózati hiba történt! Próbáld újra később.");
    return false;
  }
}

loadDocuments(selectedCategoryId);

document.addEventListener("DOMContentLoaded", function () {
  const pageNumber = document.getElementById("page-indicator-top");

  function updatePaginationControls(page, maxPage) {
    pageNumber.textContent = page;

    document.getElementById("page-indicator-top").innerText = page;
    document.getElementById("page-indicator-bottom").innerText = page;

    document.getElementById("prevPageTop").disabled = page <= 1;
    document.getElementById("prevPageBottom").disabled = page <= 1;
  }

  document.getElementById("prevPageTop").addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      loadDocuments(selectedCategoryId, currentPage);
    }
  });

  document.getElementById("nextPageTop").addEventListener("click", function () {
    currentPage++;
    loadDocuments(selectedCategoryId, currentPage);
  });

  document
    .getElementById("prevPageBottom")
    .addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadDocuments(selectedCategoryId, currentPage);
      }
    });

  document
    .getElementById("nextPageBottom")
    .addEventListener("click", function () {
      currentPage++;
      loadDocuments(selectedCategoryId, currentPage);
    });

  updatePaginationControls(1, 10);
});
