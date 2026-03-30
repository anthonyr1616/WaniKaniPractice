import "./style.css";

import {
  getApiToken,
  setApiToken,
  getVocabByLevels,
  getVocabAvailableAtDate,
  getCriticalVocab,
} from "./api.js";

import { range, normalize } from "./utility.js";
import { Kuroshiro } from "kuroshiro-browser";

const kuroshiro = await Kuroshiro.buildAndInitWithKuromoji(true);

// Element references
const el = {
  settingsBtn: document.getElementById("settings-btn"),
  saveBtn: document.querySelector("#settings-modal .save-btn"),
  cancelBtn: document.querySelector("#settings-modal .cancel-btn"),
  apiTokenInput: document.getElementById("api-token"),
  fontSelect: document.getElementById("sentence-font"),

  fromLevel: document.getElementById("from-level"),
  toLevel: document.getElementById("to-level"),
  atDate: document.getElementById("at-date"),

  startBtn: document.getElementById("start-btn"),
  setupBtn: document.querySelector(".setup-btn"),
  nextSentenceBtn: document.getElementById("next-sentence-btn"),
  showAnswerBtn: document.getElementById("show-answer-btn"),
  hintBtn: document.getElementById("hint-btn"),
  resetBtn: document.getElementById("reset-btn"),

  setupArea: document.querySelector(".setup-area"),
  mainArea: document.querySelector(".main"),

  warning: document.getElementById("start-warning"),

  vocab: {
    jp: document.querySelector(".sentence-jp"),
    kana: document.querySelector(".sentence-kana"),
    en: document.querySelector(".sentence-en"),
  },

  hint: {
    characters: document.querySelector(".characters .hint-text"),
    readings: document.querySelector(".readings .hint-text"),
    meanings: document.querySelector(".meanings .hint-text"),
    types: document.querySelector(".wordTypes .hint-text"),
  },

  levelsRange: document.querySelector("#start-modal .levels-range"),
  daysRange: document.querySelector("#start-modal .days-range"),
};

const fonts = [
  "Serif",
  "Georgia",
  "Times New Roman",
  "Kosugi Maru",
  "M PLUS 1p",
  "Noto Sans JP",
  "Noto Serif JP",
  "Shippori Mincho B1",
  "Yuji Syuku",
  "Zen Antique",
  "Zen Maru Gothic",
];

// Initalize UI
initToken();
initDateInput();
initModalOverlay();
initFontPicker();
initEvents();

// #region Init functions

function initToken() {
  const token = getApiToken();

  if (!token) {
    openModal("settings-modal");
    return;
  }

  el.apiTokenInput.value = token;
}

function initDateInput() {
  const today = new Date();
  const max = new Date();
  max.setDate(today.getDate() + 7);

  const format = (d) => d.toISOString().split("T")[0];

  el.atDate.value = format(today);
  el.atDate.min = format(today);
  el.atDate.max = format(max);
}

function initModalOverlay() {
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function initFontPicker() {
  el.fontSelect.innerHTML = "";
  
  const randomOption = document.createElement("option");
  randomOption.value = "Random";
  randomOption.textContent = "Random";
  el.fontSelect.appendChild(randomOption);

  fonts.forEach((font) => {
    const option = document.createElement("option");
    option.value = font;
    option.textContent = font;
    el.fontSelect.appendChild(option);
  });
}

function initEvents() {
  el.settingsBtn.onclick = () => openModal("settings-modal");
  el.cancelBtn.onclick = () => closeModal("settings-modal");

  el.saveBtn.onclick = () => {
    setApiToken(el.apiTokenInput.value);
    setFont(el.fontSelect.value);
    closeModal("settings-modal");
  };

  el.setupBtn.onclick = openSetupModal;
  el.startBtn.onclick = onStart;
  el.nextSentenceBtn.onclick = onNext;
  el.showAnswerBtn.onclick = onShowAnswer;
  el.hintBtn.onclick = onHint;
  el.resetBtn.onclick = onReset;

  document.querySelector(".radio-group").onchange = updateSetupModal;

  document.querySelectorAll(".number-input").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if ([".", ","].includes(e.key)) e.preventDefault();
    });

    input.addEventListener("input", () => normalize(input));
    input.addEventListener("blur", () => normalize(input));
  });
}

// #endregion

// #region Practice logic
let session = null;

async function onStart() {
  const type = getPracticeType();

  if (!validateInputs(type)) return;

  closeModal("start-modal");
  await startPractice(type);
}

async function startPractice(type) {
  const vocab = await fetchVocab(type);
  const sentences = shuffle(flatten(vocab));

  session = new PracticeSession(sentences);
  toggleMainView();
  toggleAnswer(false);
  await renderSentence(session.current);
}

async function onNext() {
  if (getFontPreference() === "Random") {
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    applyFont(randomFont);
  }

  session.advance();
  await renderSentence(session.current);
  hideHints();
  toggleAnswer(false);
}

function onShowAnswer() {
  toggleAnswer(true);
}

function onHint() {
  showHints();
}

function onReset() {
  session = null;
  toggleMainView(false);
}

// #endregion

async function fetchVocab(type) {
  if (type === "levels") {
    const levels = range(+el.fromLevel.value, +el.toLevel.value);
    return getVocabByLevels(levels);
  }

  if (type === "days") {
    const [y, m, d] = el.atDate.value.split("-");
    const end = new Date(y, m - 1, d, 23, 59, 0);
    return getVocabAvailableAtDate(new Date(), end);
  }

  return getCriticalVocab();
}

// #region Transformation helper  methods

function flatten(vocabList) {
  return vocabList.flatMap((v) =>
    v.contextSentences.map((s) => ({
      vocab: v,
      japanese: s.japanese,
      english: s.english,
      seen: false,
    })),
  );
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// #endregion

// #region Rendering

async function renderSentence(sentence) {
  el.vocab.jp.textContent = sentence.japanese;
  el.vocab.kana.textContent = await kuroshiro.convert(sentence.japanese, {
    to: "hiragana",
  });
  el.vocab.en.textContent = sentence.english;

  el.hint.characters.textContent = sentence.vocab.characters;
  el.hint.readings.textContent = sentence.vocab.readings.join(", ");
  el.hint.meanings.textContent = sentence.vocab.meanings.join(", ");
  el.hint.types.textContent = sentence.vocab.partsOfSpeech.join(", ");
}

function toggleMainView(showMain = true) {
  el.setupArea.classList.toggle("hidden", showMain);
  el.mainArea.classList.toggle("hidden", !showMain);
}

function hideHints() {
  // TODO
}

function showHints() {
  // TODO
}

function toggleAnswer(show) {
  // TODO
}

// Modal helpers
const openModal = (id) =>
  document.getElementById(id).classList.remove("hidden");
const closeModal = (id) => document.getElementById(id).classList.add("hidden");

// #endregion

// #region Setup Modal logic
function openSetupModal() {
  openModal("start-modal");
  updateSetupModal();
}

function updateSetupModal() {
  const type = getPracticeType();

  el.levelsRange.classList.toggle("hidden", type !== "levels");
  el.daysRange.classList.toggle("hidden", type !== "days");
}

// #endregion

// #region Validation
function getPracticeType() {
  return document.querySelector('input[name="practice-type"]:checked').value;
}

function validateInputs(type) {
  el.warning.classList.add("hidden");

  if (type !== "levels") return true;

  const from = +el.fromLevel.value;
  const to = +el.toLevel.value;

  if (from > to) {
    showWarning("From Level cannot be greater than To Level");
    return false;
  }

  if (from < 1 || to > 60) {
    showWarning("Levels must be between 1 and 60");
    return false;
  }

  return true;
}

function showWarning(msg) {
  el.warning.textContent = msg;
  el.warning.classList.remove("hidden");
}

// #endregion

// #region Font stuff

function setFont(font) {
  if (font === "Random") {    
    saveFontPreference(font);
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    applyFont(randomFont);
    return;
  }

  saveFontPreference(font);
  applyFont(font);
}

function applyFont(font) {
  el.vocab.jp.classList.remove(
    "font-serif",
    "font-georgia",
    "font-times",
    "font-kosugi-maru",
    "font-m-plus-1p",
    "font-noto-sans-jp",
    "font-noto-serif-jp",
    "font-shippori-mincho",
    "font-yuji-syuku",
    "font-zen-antique",
    "font-zen-maru-gothic",
  );

  switch (font) {
    case "Kosugi Maru":
      el.vocab.jp.classList.add("font-kosugi-maru");
      break;
    case "M PLUS 1p":
      el.vocab.jp.classList.add("font-m-plus-1p");
      break;
    case "Noto Sans JP":
      el.vocab.jp.classList.add("font-noto-sans-jp");
      break;
    case "Noto Serif JP":
      el.vocab.jp.classList.add("font-noto-serif-jp");
      break;
    case "Shippori Mincho B1":
      el.vocab.jp.classList.add("font-shippori-mincho");
      break;
    case "Yuji Syuku":
      el.vocab.jp.classList.add("font-yuji-syuku");
      break;
    case "Zen Antique":
      el.vocab.jp.classList.add("font-zen-antique");
      break;
    case "Zen Maru Gothic":
      el.vocab.jp.classList.add("font-zen-maru-gothic");
      break;
    case "Georgia":
      el.vocab.jp.classList.add("font-georgia");
      break;
    case "Times New Roman":
      el.vocab.jp.classList.add("font-times");
      break;
    default:
      el.vocab.jp.classList.add("font-serif");
      break;
  }
}

function getFontPreference() {
  return localStorage.getItem("preferredFont");
}

function saveFontPreference(font) {
    localStorage.setItem("preferredFont", font);
}

// #endregion

class PracticeSession {
  constructor(sentences) {
    this.sentences = sentences;
    this.index = 0;
  }

  get current() {
    return this.sentences[this.index];
  }

  get hasNext() {
    return this.index < this.sentences.length - 1;
  }

  advance() {
    if (this.hasNext) this.index++;
  }
}
