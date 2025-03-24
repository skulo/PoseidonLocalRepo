let quizData = [];
let MAX_QUESTIONS = 0;
async function getQuiz() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get("quiz_id");
  if (!quizId) {
    alert("Nincs kvíz ID megadva!");
    return;
  }

  const response = await fetch(`/get-quiz/${quizId}`);
  const data = await response.json();
  quizData = data.questions;
  MAX_QUESTIONS = quizData.length;
}

getQuiz();
const quizContainer = document.querySelector(".quiz-section");
const question = document.querySelector(".quiz-section .question");
const options = document.querySelector(".quiz-section .options");
const nextBtn = document.querySelector(".quiz-section .next-btn");
const quizResult = document.querySelector(".quiz-result");
const startBtnContainer = document.querySelector(".start-button-section");
const startBtn = document.querySelector(".start-button-section .start-button");

let currentQuestionNumber = 0;
let score = 0;

const shuffleArray = (array) => {
  return array.slice().sort(() => Math.random() - 0.5);
};

quizData = shuffleArray(quizData);

const resetLocalStorage = () => {
  for (i = 0; i < MAX_QUESTIONS; i++) {
    localStorage.removeItem(`userAnswer_${i}`);
  }
};

resetLocalStorage();

const checkAnswer = (e) => {
  let userAnswer = e.target.textContent;
  const correctAnswer = quizData[currentQuestionNumber].correct;

  if (userAnswer === correctAnswer) {
    score++;
    e.target.classList.add("correct");
  } else {
    e.target.classList.add("incorrect");

    let allOptions = document.querySelectorAll(".quiz-section .option");
    allOptions.forEach((o) => {
      if (o.textContent === correctAnswer) {
        o.classList.add("correct");
      }
    });
  }

  localStorage.setItem(`userAnswer_${currentQuestionNumber}`, userAnswer);

  let allOptions = document.querySelectorAll(".quiz-section .option");
  allOptions.forEach((o) => {
    o.classList.add("disabled");
  });
};

const makeQuestion = () => {
  options.innerHTML = "";
  question.innerHTML = `<span class='question-number'>${
    currentQuestionNumber + 1
  }/${MAX_QUESTIONS}</span>${quizData[currentQuestionNumber].question}`;

  const shuffledOptions = shuffleArray(quizData[currentQuestionNumber].options);

  shuffledOptions.forEach((o) => {
    const option = document.createElement("button");
    option.classList.add("option");
    option.innerHTML = o;
    option.addEventListener("click", (e) => {
      checkAnswer(e);
    });
    options.appendChild(option);
  });
};

const retakeQuiz = () => {
  currentQuestionNumber = 0;
  score = 0;
  quizData = shuffleArray(quizData);
  resetLocalStorage();

  makeQuestion();
  quizResult.style.display = "none";
  quizContainer.style.display = "block";
};

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
const showQuizResults = () => {
  async function getUserData() {
    if (!(await hasToken())) return;

    try {
      const response = await fetch("/me", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const userData = await response.json();
      const pendingResponse = await fetch(`/pendingdocs/${userData.id}`);
      const pendingCount = await pendingResponse.json();

      return userData;
    } catch (error) {}
  }

  const userData = getUserData();

  quizResult.style.display = "flex";
  quizContainer.style.display = "none";
  quizResult.innerHTML = "";

  const resultHeading = document.createElement("h2");
  resultHeading.innerHTML = `Pontszámod: ${score} / ${MAX_QUESTIONS}   (${Math.round(
    (score / MAX_QUESTIONS) * 100
  )}%)`;
  quizResult.appendChild(resultHeading);

  for (let i = 0; i < MAX_QUESTIONS; i++) {
    const resultItem = document.createElement("div");
    resultItem.classList.add("question-container");

    const userAnswer = localStorage.getItem(`userAnswer_${i}`);
    const correctAnswer = quizData[i].correct;

    let answeredCorrectly = userAnswer === correctAnswer;

    if (!answeredCorrectly) {
      resultItem.classList.add("incorrect");
    }

    let resultHTML = `<div class="question">${i + 1}. Kérdés: ${
      quizData[i].question
    }</div>`;

    resultHTML += `<div class="user-answer ${
      answeredCorrectly ? "correct-answer" : "incorrect-answer"
    }">
          Válaszod: ${userAnswer || "Nem válaszoltál"}
      </div>`;

    if (!answeredCorrectly) {
      resultHTML += `<div class="correct-answer">Helyes válasz: ${correctAnswer}</div>`;
    }

    resultItem.innerHTML = resultHTML;
    quizResult.appendChild(resultItem);
  }

  const retakeBtn = document.createElement("button");
  retakeBtn.classList.add("retake-btn");
  retakeBtn.innerHTML = "Kvíz újrakezdése";
  retakeBtn.addEventListener("click", retakeQuiz);
  quizResult.appendChild(retakeBtn);

  const quittBtn = document.createElement("button");
  quittBtn.classList.add("exit-button");
  quittBtn.innerHTML = "Kilépés";
  quittBtn.addEventListener("click", (e) => {
    window.history.back();
  });

  quizResult.appendChild(quittBtn);

  const sendQuizResult = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get("quiz_id");
    const userData = await getUserData();

    const userId = userData.id;

    const response = await fetch(
      `/save-quiz-result?quiz_id=${quizId}&score=${score}`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (response.ok) {
    } else {
    }
  };

  if (userData) {
    sendQuizResult();
  }
};

const displayNextQuestion = () => {
  if (currentQuestionNumber >= MAX_QUESTIONS - 1) {
    showQuizResults();
    return;
  }

  currentQuestionNumber++;
  makeQuestion();
};

nextBtn.addEventListener("click", displayNextQuestion);

startBtn.addEventListener("click", () => {
  startBtnContainer.style.display = "none";
  quizContainer.style.display = "block";
  makeQuestion();
});

const urlParams = new URLSearchParams(window.location.search);
const quizId = urlParams.get("quiz_id");

const loadCategoryName = async () => {
  const response = await fetch(`/quiz-category?quiz_id=${quizId}`);
  if (response.ok) {
    const data = await response.json();
    document.querySelector(
      "h1"
    ).innerText = `${data.category_name}:  "${data.document_title}" Kvíz`;
    document.querySelector(
      ".start-button-section h2"
    ).innerText = `${data.category_name}:  "${data.document_title}" Kvíz`;
  } else {
  }
};

loadCategoryName();
document.addEventListener("DOMContentLoaded", () => {
  const quitBtns = document.querySelectorAll(".exit-button");
  quitBtns.forEach((quitBtn) => {
    quitBtn.addEventListener("click", (e) => {
      const confirmQuit = confirm(
        "Biztosan ki akarsz lépni? Így elveszíted az eredményed."
      );
      if (confirmQuit) {
        window.history.back();
      }
    });
  });
});
