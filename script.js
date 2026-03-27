// Can improve this, this is just quick and dirty
import {
  getApiTokenFromCache,
  setApiTokenInCache,
  getVocabByLevels,
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

async function startPractice() {
  const levels = [1]; // Example levels, can be made dynamic later
  let vocabData = await getVocabByLevels(levels);
  console.log("Fetched vocab data:", vocabData);

  const sentences = flattenVocabData(vocabData).sort(() => Math.random() - 0.5);
  console.log("Flattened and shuffled sentences:", sentences);

  const setupArea = document.querySelector(".setup-area");
  const main = document.querySelector(".main");

  setupArea.classList.add("hidden");
  main.classList.remove("hidden");

  const nextSentence = sentences.find((s) => !s.seen);
  await updateVocabDisplay(nextSentence);
  updateHintDisplay(nextSentence);
}

function flattenVocabData(vocabData) {
  return vocabData.flatMap((vocab) =>
    vocab.contextSentences.map((sentence) => ({
      vocab,
      english: sentence.english,
      japanese: sentence.japanese,
      seen: false,
    })),
  );
}

function getRandomFont() {
  const fonts = ["sans-serif", "serif", "monospace"];
  return fonts[Math.floor(Math.random() * fonts.length)];
}

const vocabArea = document.querySelector(".vocab-area");
const jpSentence = vocabArea.querySelector(".sentence-jp");
const kanaSentence = vocabArea.querySelector(".sentence-kana");
const enSentence = vocabArea.querySelector(".sentence-en");

const hintArea = document.querySelector(".hint-area");
const characters = hintArea.querySelector(".characters .hint-text");
const readings = hintArea.querySelector(".readings .hint-text");
const meanings = hintArea.querySelector(".meanings .hint-text");
const wordTypes = hintArea.querySelector(".wordTypes .hint-text");

async function updateVocabDisplay(sentence) {
  jpSentence.textContent = sentence.japanese;
  kanaSentence.textContent = "Need package to convert to kana"; // TODO: Convert to kana using kurosiro or wanakana
  enSentence.textContent = sentence.english;
}

function updateHintDisplay(sentence) {
  characters.textContent = sentence.vocab.characters;
  readings.textContent = sentence.vocab.readings.join(", ");
  meanings.textContent = sentence.vocab.meanings.join(", ");
  wordTypes.textContent = sentence.vocab.partsOfSpeech.join(", ");
}

const setupBtn = document.querySelector(".setup-btn");
setupBtn.addEventListener("click", () => {
  openSetupModal();
});

const startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", () => {
  closeModal("start-modal");
  startPractice();
});

function openSetupModal() {
  openModal("start-modal");
  updateSetupModal();
}

function updateSetupModal() {
  const levelSelection = document.querySelector(
    'input[name="practice-type"]:checked',
  ).value;

  const levelsRange = document.querySelector("#start-modal .levels-range");
  const daysRange = document.querySelector("#start-modal .days-range");

  if (levelSelection === "levels") {
    levelsRange.classList.remove("hidden");
    daysRange.classList.add("hidden");
  } else if (levelSelection === "days") {
    levelsRange.classList.add("hidden");
    daysRange.classList.remove("hidden");
  } else {
    levelsRange.classList.add("hidden");
    daysRange.classList.add("hidden");
  }
}

const group = document.querySelector(".radio-group");

group.addEventListener("change", (e) => {
  if (e.target.name === "practice-type") {
    console.log("Selected:", e.target.value);
    updateSetupModal();
  }
});
