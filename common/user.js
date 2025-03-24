window.currentUserData = null;
window._userDataPromise = null;

async function hasToken() {
  try {
    const response = await getUserData();
    return response.ok;
  } catch {
    return false;
  }
}

async function getUserData() {
  if (window.currentUserData) {
    return {
      ok: true,
      data: window.currentUserData,
    };
  }

  if (window._userDataPromise) return window._userDataPromise;

  window._userDataPromise = fetch("/me", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(async (res) => {
      if (!res.ok) {
        return { ok: false, data: null };
      }
      const data = await res.json();
      window.currentUserData = data;
      return { ok: true, data };
    })
    .catch((err) => {
      return { ok: false, data: null };
    })
    .finally(() => {
      window._userDataPromise = null;
    });

  return window._userDataPromise;
}

function clearUserCache() {
  window.currentUserData = null;
  window._userDataPromise = null;
}

async function initUserUI() {
  const response = await getUserData();
  if (!response.ok) return;

  const userData = response.data;

  document.getElementById("userName").innerText = userData.name;
  document.getElementById("userEmail").innerText = userData.email;
  document.getElementById("userRole").innerText = userData.role;
  document.getElementById("userTokens").innerText = userData.tokens;

  try {
    const pendingResponse = await fetch(`/pendingdocs/${userData.id}`);
    const pendingCount = await pendingResponse.json();

    document.getElementById("pendingDocs").innerText = pendingCount;
  } catch (error) {}
}
