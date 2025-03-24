const form = document.getElementById("form");
const firstname_input = document.getElementById("register_name");
const email_input = document.getElementById("login_email");
const password_input = document.getElementById("login_password");
const repeat_password_input = document.getElementById("repeat-password-input");
const error_message = document.getElementById("error-message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  let errors = [];
  if (firstname_input) {
    errors = await getSignupFormErrors(
      firstname_input.value,
      email_input.value,
      password_input.value,
      repeat_password_input.value
    );

    if (errors.length > 0) {
      e.preventDefault();
      error_message.innerText = errors.join(". ");
    }
  } else {
    errors = getLoginFormErrors(email_input.value, password_input.value);
    if (errors.length > 0) {
      error_message.innerText = errors.join(". ");
    }
    if (errors.length === 0) {
      const email = document.getElementById("login_email").value;
      const password = document.getElementById("login_password").value;

      try {
        const response = await fetch("/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username: email, password }),
        });

        const data = await response.json();
        if (data.message == "Sikeres bejelentkezés") {
          window.location.href = "/trending/trending.html";
        } else if (data.status == "not_verified") {
          sessionStorage.setItem("verification_email", email);
          sessionStorage.setItem("verification_entity_id", data.id);

          await updateVerificationUI();
        } else {
          error_message.innerText = "Helytelen email vagy jelszó";
          email_input.parentElement.classList.add("incorrect");
          password_input.parentElement.classList.add("incorrect");
          return;
        }
      } catch (error) {
        alert("Hiba történt a bejelentkezés során.");
      }
    }
  }
});

async function getSignupFormErrors(firstname, email, password, repeatPassword) {
  let errors = [];

  function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
  }

  function isValidPassword(password) {
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return passwordPattern.test(password);
  }

  if (!isValidEmail(email)) {
    errors.push("Helytelen email formátum");
    email_input.parentElement.classList.add("incorrect");
  }

  if (firstname === "" || firstname == null) {
    errors.push("Kötelező nevet megadni");
    firstname_input.parentElement.classList.add("incorrect");
  }
  if (email === "" || email == null) {
    errors.push("Kötelező email címet megadni");
    email_input.parentElement.classList.add("incorrect");
  }
  if (password === "" || password == null) {
    errors.push("Kötelező jelszót megadni");
    password_input.parentElement.classList.add("incorrect");
  }
  if (!isValidPassword(password)) {
    errors.push(
      "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell legalább egy kisbetűt és egy nagybetűt"
    );
    password_input.parentElement.classList.add("incorrect");
  }
  if (password !== repeatPassword) {
    errors.push("A jelszavak nem egyeznek");
    password_input.parentElement.classList.add("incorrect");
    repeat_password_input.parentElement.classList.add("incorrect");
  }

  if (errors.length === 0) {
    const loader = document.getElementById("loader-container");
    loader.style.setProperty("display", "flex", "important");
    const name = firstname;
    const response = await fetch("/users/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    loader.style.display = "none";

    if (response.ok) {
      try {
        sessionStorage.setItem("verification_email", email);
        sessionStorage.setItem("verification_entity_id", data.id);

        await updateVerificationUI(); // Ha itt hiba van, ne akadjon meg az egész
      } catch (err) {
        console.error("updateVerificationUI hiba:", err);
      } finally {
        loader.style.display = "none";
      }
    } else {
      loader.style.display = "none";

      if (data.detail == "Ez az email cím már regisztrálva van!") {
        errors.push("Ez az email cím már regisztrálva van!");
        email_input.parentElement.classList.add("incorrect");
      }

      if (data.detail == "Ez a név már foglalt!") {
        errors.push("Ez a név már foglalt!");
        firstname_input.parentElement.classList.add("incorrect");
      }
      if (data.detail == "Minden mező kitöltése kötelező!") {
        errors.push("Minden mező kitöltése kötelező!");
        email_input.parentElement.classList.add("incorrect");
        firstname_input.parentElement.classList.add("incorrect");
        password_input.parentElement.classList.add("incorrect");
      }
      if (data.detail == "Érvénytelen email cím formátum!") {
        errors.push("Érvénytelen email cím formátum!");
        email_input.parentElement.classList.add("incorrect");
      }
      if (
        data.detail ==
        "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt és nagybetűt!"
      ) {
        errors.push(
          "A jelszónak legalább 8 karakter hosszúnak kell lennie, és tartalmaznia kell kisbetűt és nagybetűt!"
        );
        password_input.parentElement.classList.add("incorrect");
      }
    }
  }
  return errors;
}

function getLoginFormErrors(email, password) {
  let errors = [];

  if (email === "" || email == null) {
    errors.push("Kötelező email címet megadni");
    email_input.parentElement.classList.add("incorrect");
  }
  if (password === "" || password == null) {
    errors.push("Kötelező jelszót megadni");
    password_input.parentElement.classList.add("incorrect");
  }

  return errors;
}

const allInputs = [
  firstname_input,
  email_input,
  password_input,
  repeat_password_input,
].filter((input) => input != null);

allInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (input.parentElement.classList.contains("incorrect")) {
      input.parentElement.classList.remove("incorrect");
      error_message.innerText = "";
    }
  });
});

async function verifyCode() {
  const verificationCode = document.getElementById("verification_code").value;
  const email = sessionStorage.getItem("verification_email");
  const entityId = sessionStorage.getItem("verification_entity_id");

  if (!email || !entityId) {
    console.error(
      "Hiányzó sessionStorage adatok a verifikációhoz:",
      email,
      entityId
    );
    alert("Hiba: nincs érvényes regisztrációs adat!");
    return;
  }

  const response = await fetch(
    "/confirm?" +
      new URLSearchParams({
        entity_type: "user",
        entity_id: entityId,
        verification_process: "EMAIL",
        code: verificationCode,
      }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  const data = await response.json();

  if (response.ok) {
    if (data.error_id) {
      document.getElementById("verification-message").textContent = "";
      document.getElementById("verification-message-2").style.color = "red";
      document.getElementById("verification-message-2").textContent =
        data.error_id || "Hiba történt az újraküldés során!";
    } else {
      loginUser();
    }
  } else {
    alert("Nem ok a response");
  }
}

async function resendVerificationCode() {
  const email = sessionStorage.getItem("verification_email");
  const entityId = sessionStorage.getItem("verification_entity_id");

  if (!email || !entityId) {
    alert("Hiba: nincs érvényes regisztrációs adat!");
    return;
  }

  try {
    const loader = document.getElementById("loader-container");
    loader.style.setProperty("display", "flex", "important");
    const response = await fetch(
      "/resend?" +
        new URLSearchParams({
          entity_type: "user",
          entity_id: entityId,
          verification_process: "EMAIL",
        }),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();
    loader.style.display = "none";
    if (response.ok) {
      if (data.error) {
        document.getElementById("verification-message").textContent = "";
        document.getElementById("verification-message-2").textContent =
          data.error || "Hiba történt az újraküldés során!";
        document.getElementById("verification-message-2").style.color = "red";
      } else {
        document.getElementById("verification-message").textContent =
          "A kód újraküldésre került.";
        document.getElementById("verification-message").style.color = "black";

        document.getElementById("verification-message-2").textContent =
          "Add meg az e-mailre küldött kódot!";
        document.getElementById("verification-message-2").style.color = "black";
      }
    } else {
      alert(data.error || "Hiba történt az újraküldés során!");
    }
  } catch (error) {
    alert("Hálózati hiba! Próbáld újra később.");
  }
}

async function loginUser() {
  const email = document.getElementById("login_email").value;
  const password = document.getElementById("login_password").value;

  const response = await fetch("/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
    credentials: "include",
  });

  if (!response.ok) {
    alert("Hiba történt a bejelentkezés során!");
    return;
  }

  const data = await response.json();

  if (data.status === "not_verified") {
    sessionStorage.setItem("verification_email", email);
    sessionStorage.setItem("verification_entity_id", data.id);
    await updateVerificationUI();
    document.getElementById("verification-message").textContent = data.message;
    document.getElementById("verification-message").style.color = "red";
    document.getElementById("verification-message-2").style.color = "red";
    document.getElementById("verification-message-2").textContent =
      "Add meg az e-mailre küldött kódot!";
    return;
  }

  setTimeout(() => {
    window.location.href = "/trending/trending.html";
  }, 500);
}

window.addEventListener("load", async () => {
  await fetch("/expire_ongoing_verification_runs", { method: "POST" });
  await fetch("/expire_valid_verifications", { method: "POST" });
});

async function updateVerificationUI() {
  const email = sessionStorage.getItem("verification_email");
  const entityId = sessionStorage.getItem("verification_entity_id");

  if (!email || !entityId) return;

  const response = await fetch(
    "/is_verified?" +
      new URLSearchParams({
        entity_id: entityId,
      })
  );

  if (!response.ok) {
    console.error("Hiba történt az is_verified lekéréskor.");
    loader.style.display = "none";
    return;
  }

  const data = await response.json();

  const verificationSection = document.getElementById("verification_section");
  const newVerificationButton = document.getElementById(
    "new_verification_button"
  );
  const resendButton = document.querySelector(
    '#verification_section button[onclick*="resendVerificationCode"]'
  );
  const codeInput = document.getElementById("verification_code");
  const verificationCodeSubmit = document.getElementById(
    "verification_code_submit"
  );

  if (data.is_verified) {
    verificationSection.style.display = "none";
    newVerificationButton.style.display = "none";
  } else if (data.is_ongoing) {
    document.getElementById("verification-message").textContent =
      "Még nem verifikáltad magad!";
    document.getElementById("verification-message").style.color = "red";

    document.getElementById("verification-message-2").style.color = "red";
    document.getElementById("verification-message-2").textContent =
      "Add meg az e-mailedre küldött kódot!";

    verificationSection.style.display = "block";
    newVerificationButton.style.display = "none";
    resendButton.style.display = "block";
    codeInput.style.display = "block";
    if (verificationCodeSubmit) {
      verificationCodeSubmit.style.display = "inline-block";
    }
    resendButton.style.display = "inline-block";
    codeInput.style.display = "inline-block";
  } else {
    document.getElementById("verification-message").textContent =
      "Lejárt a verifikációs folyamat.";
    document.getElementById("verification-message").style.color = "red";

    document.getElementById("verification-message-2").style.color = "red";
    document.getElementById("verification-message-2").textContent =
      "Indíts új verifikációt!";
    verificationSection.style.display = "block";
    resendButton.style.display = "none";
    codeInput.style.display = "none";

    if (verificationCodeSubmit) {
      verificationCodeSubmit.style.display = "none";
    }
    newVerificationButton.style.display = "block";
  }
}

window.addEventListener("load", () => {
  sessionStorage.removeItem("verification_email");
  sessionStorage.removeItem("verification_entity_id");

  updateVerificationUI();
});

async function startNewVerification() {
  const email = sessionStorage.getItem("verification_email");
  const entityId = sessionStorage.getItem("verification_entity_id");

  if (!email || !entityId) return;

  const loader = document.getElementById("loader-container");
  loader.style.setProperty("display", "flex", "important");

  const response = await fetch(
    "/start_verification?" +
      new URLSearchParams({
        entity_id: entityId,
      }),
    {
      method: "POST",
    }
  );
  const data = await response.json();
  loader.style.display = "none";

  if (response.ok) {
    await updateVerificationUI();
  } else {
    alert("Hiba történt a verifikáció indításakor!");
  }
}
