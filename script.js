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

  const nextSentence = sentences.find((s) => !s.seen);
  updateVocabDisplay(nextSentence);
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

function updateVocabDisplay(sentence) {
  jpSentence.textContent = sentence.japanese;
  kanaSentence.textContent = sentence.kana;
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
  openModal("start-modal");
});

const startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", () => {
  closeModal("start-modal");
  startPractice();
});
