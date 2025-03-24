async function hasToken() {
  try {
    const response = await fetch("/me", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

let currentPage = 1;
let maxPage = 1;
const pageSize = 5;

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
  getQuizResults(currentPage);
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    getQuizResults(currentPage);
  }
}

async function getQuizResults(page = 1) {
  if (!(await hasToken())) {
    window.location.href = "/static/login.html";
    return;
  }

  const url = `/quiz-results/?page=${page}&page_size=${pageSize}`;
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    alert("Nem sikerült betölteni a kvízeredményeket.");
    return;
  }

  const quizResults = await response.json();

  maxPage = quizResults.max_page;
  currentPage = page;

  showQuizResult(quizResults.results);
  updatePaginationControls();
}

function showQuizResult(results) {
  const quizzesList = document.getElementById("quizzes-list");
  quizzesList.innerHTML = "";

  results.forEach((result) => {
    const card = document.createElement("div");
    card.className = "document-card";
    card.innerHTML = `
      <div class="document-date">${new Date(
        result.completed_at
      ).toLocaleDateString()}</div>
      <div class="documents-category">${result.category}</div>
      <div class="document-title">${result.document_name}</div>
      <div class="document-description">${result.score} / ${
      result.total_questions
    }</div>
      <div class="document-actions">
        <button class="delete-btn" data-id="${
          result.quiz_result_id
        }">Törlés</button>
      </div>
    `;

    card.addEventListener("click", (event) => {
      if (!event.target.classList.contains("delete-btn")) {
        window.location.href = `/quiz/quiz.html?quiz_id=${result.quiz_id}`;
      }
    });

    const deleteBtn = card.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm("Biztosan törlöd ezt az eredményt?")) {
        await deleteQuizResult(result.quiz_result_id);
        getQuizResults();
      }
    });

    quizzesList.appendChild(card);
  });
}

async function deleteQuizResult(resultId) {
  const response = await fetch(
    `/delete-quiz-result?quiz_result_id=${resultId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    alert("Hiba történt a törlés során.");
  } else {
  }
}

window.addEventListener("load", () => {
  getQuizResults();
});

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
      getQuizResults(currentPage);
    }
  });

  document.getElementById("nextPageTop").addEventListener("click", function () {
    currentPage++;
    getQuizResults(currentPage);
  });

  document
    .getElementById("prevPageBottom")
    .addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        getQuizResults(currentPage);
      }
    });

  document
    .getElementById("nextPageBottom")
    .addEventListener("click", function () {
      currentPage++;
      getQuizResults(currentPage);
    });

  updatePaginationControls(1, 10);
});
