// Can improve this, this is just quick and dirty
import {
  getApiTokenFromCache,
  setApiTokenInCache,
  clearApiTokenFromCache,
  getVocabByLevels,
  Vocab,
} from "./api.js";


const openModal = (id) =>
  document.getElementById(id).classList.remove("hidden");
const closeModal = (id) => document.getElementById(id).classList.add("hidden");

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

const cancelBtn = document.querySelector("#settings-modal .cancel-btn");
const saveBtn = document.querySelector("#settings-modal .save-btn");
const settingsBtn = document.getElementById("settings-btn");

settingsBtn.addEventListener("click", () => openModal("settings-modal"));
cancelBtn.addEventListener("click", () => closeModal("settings-modal"));
saveBtn.addEventListener("click", () => {
  const apiToken = document.getElementById("api-token").value;
  setApiTokenInCache(apiToken);
  closeModal("settings-modal");
});


const apiTokenInput = document.getElementById("api-token");
if (!getApiTokenFromCache()) {
  console.log("No API token found in cache. Requesting token from user.");
  openModal("settings-modal");
} else {
    console.log("API token found in cache.");
    apiTokenInput.value = getApiTokenFromCache();
}


