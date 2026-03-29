import "./style.css";

// Can improve this, this is just quick and dirty
import {
  getApiTokenFromCache,
  setApiTokenInCache,
  getVocabByLevels,
  getVocabAvailableAtDate,
  getCriticalVocab,
} from "./api.js";

import { range, normalize } from "./utility.js";

import { Kuroshiro } from "kuroshiro-browser";
const IS_PROD = true;

const kuroshiro = await Kuroshiro.buildAndInitWithKuromoji(IS_PROD);

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

const fromLevelInput = document.getElementById("from-level");
const toLevelInput = document.getElementById("to-level");
const atDate = document.getElementById("at-date");
const today = new Date();
const oneWeekLater = new Date();
oneWeekLater.setDate(today.getDate() + 7);
const formatDate = (date) => date.toISOString().split("T")[0];
const todayStr = formatDate(today);
const maxStr = formatDate(oneWeekLater);
atDate.value = todayStr;
atDate.min = todayStr;
atDate.max = maxStr;

async function startPractice() {
  let vocabData = [];

  const levelSelection = document.querySelector(
    'input[name="practice-type"]:checked',
  ).value;

  if (levelSelection === "levels") {
    const levels = range(
      parseInt(fromLevelInput.value),
      parseInt(toLevelInput.value),
    );

    vocabData = await getVocabByLevels(levels);
    console.log("Fetched vocab data");
  } else if (levelSelection === "days") {
    const dateStr = atDate.value;
    const [year, month, day] = dateStr.split("-");
    const fromDate = new Date(year, month - 1, day, 23, 59, 0);
    vocabData = await getVocabAvailableAtDate(new Date(), fromDate);
    console.log("Fetched vocab data");
  } else if (levelSelection === "critical") {
    vocabData = await getCriticalVocab();
    console.log("Fetched critical vocab data");
  }

  const sentences = flattenVocabData(vocabData).sort(() => Math.random() - 0.5);
  console.log("Flattened and shuffled sentences");

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
  kanaSentence.textContent = await kuroshiro.convert(sentence.japanese, {
    to: "hiragana",
  });
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

const levelsRange = document.querySelector("#start-modal .levels-range");
const daysRange = document.querySelector("#start-modal .days-range");

const startBtn = document.getElementById("start-btn");
startBtn.addEventListener("click", () => {
  const levelSelection = document.querySelector(
    'input[name="practice-type"]:checked',
  ).value;

  if (levelSelection == "levels") {
    if (parseInt(fromLevelInput.value) > parseInt(toLevelInput.value)) {
      const warning = document.getElementById("start-warning");
      warning.textContent = "From Level cannot be greater than To Level!";
      warning.classList.remove("hidden");
      return;
    }

    if (
      parseInt(fromLevelInput.value) < 1 ||
      parseInt(toLevelInput.value) > 60
    ) {
      const warning = document.getElementById("start-warning");
      warning.textContent = "Levels must be between 1 and 60!";
      warning.classList.remove("hidden");
      return;
    }
  }

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

const inputs = document.querySelectorAll(".number-input");

inputs.forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "." || e.key === ",") {
      e.preventDefault();
    }
  });

  input.addEventListener("input", () => normalize(input));

  input.addEventListener("blur", () => normalize(input));
});
