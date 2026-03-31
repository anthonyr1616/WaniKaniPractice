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
  themeSelect: document.getElementById("theme-select"),

  fromLevel: document.getElementById("from-level"),
  toLevel: document.getElementById("to-level"),
  atDate: document.getElementById("at-date"),

  startBtn: document.getElementById("start-btn"),
  setupBtn: document.querySelector(".setup-btn"),
  nextSentenceBtn: document.getElementById("next-sentence-btn"),
  showAnswerBtn: document.getElementById("show-answer-btn"),
  hintBtn: document.getElementById("hint-btn"),
  resetBtn: document.getElementById("reset-btn"),

  setupArea: document.getElementById("setup-area"),
  mainArea: document.querySelector(".main"),

  progressBar: document.getElementById("progress-bar"),
  progressFill: document.getElementById("progress-fill"),
  progressCounter: document.getElementById("progress-counter"),

  warning: document.getElementById("start-warning"),

  vocab: {
    jp: document.querySelector(".sentence-jp"),
    kana: document.querySelector(".sentence-kana"),
    en: document.querySelector(".sentence-en"),
    answer: document.querySelector(".answer"),
  },

  hint: {
    characters: document.getElementById("hint-characters"),
    readings: document.getElementById("hint-readings"),
    meanings: document.getElementById("hint-meanings"),
    types: document.getElementById("hint-types"),
  },

  levelsRange: document.querySelector("#start-modal .levels-range"),
  daysRange: document.querySelector("#start-modal .days-range"),
};

// Font config
const FONT_MAP = {
  Serif: "font-serif",
  Georgia: "font-georgia",
  "Times New Roman": "font-times",
  "Kosugi Maru": "font-kosugi-maru",
  "M PLUS 1p": "font-m-plus-1p",
  "Noto Sans JP": "font-noto-sans-jp",
  "Noto Serif JP": "font-noto-serif-jp",
  "Shippori Mincho B1": "font-shippori-mincho",
  "Yuji Syuku": "font-yuji-syuku",
  "Zen Antique": "font-zen-antique",
  "Zen Maru Gothic": "font-zen-maru-gothic",
};

const fonts = Object.keys(FONT_MAP);

// Init
initTheme();
initToken();
initDateInput();
initModalOverlay();
initFontPicker();
initEvents();

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
    setTheme(el.themeSelect.value);
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

// Practice logic

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
  toggleMainView(true);
  resetCard();
  await renderSentence(session.current);
  updateProgress();
}

async function onNext() {
  if (!session) return;

  if (getFontPreference() === "Random") {
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    applyFont(randomFont);
  }

  session.advance();
  resetCard();
  await renderSentence(session.current);
  updateProgress();
}

function onShowAnswer() {
  if (!session) return;
  el.vocab.answer.classList.remove("blurred");
}

function onHint() {
  if (!session) return;
  el.hint.readings.classList.remove("blurred");
  el.hint.meanings.classList.remove("blurred");
  el.hint.types.classList.remove("blurred");
}

function onReset() {
  session = null;
  toggleMainView(false);
}

// Fetch

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

// Transformation helpers

function flatten(vocabList) {
  return vocabList.flatMap((v) =>
    v.contextSentences.map((s) => ({
      vocab: v,
      japanese: s.japanese,
      english: s.english,
    })),
  );
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Rendering

async function renderSentence(sentence) {
  el.vocab.jp.textContent = sentence.japanese;
  el.vocab.kana.textContent = await kuroshiro.convert(sentence.japanese, {
    to: "hiragana",
  });
  el.vocab.en.textContent = sentence.english;

  el.hint.characters.textContent = sentence.vocab.characters;
  el.hint.readings.textContent = sentence.vocab.readings.join(", ");
  el.hint.meanings.textContent = sentence.vocab.meanings.join(", ");

  el.hint.types.innerHTML = "";
  for (const part of sentence.vocab.partsOfSpeech) {
    const badge = document.createElement("span");
    badge.className = "part-of-speech-badge";
    badge.textContent = part;
    el.hint.types.appendChild(badge);
  }
}

function resetCard() {
  el.vocab.answer.classList.add("blurred");
  el.hint.readings.classList.add("blurred");
  el.hint.meanings.classList.add("blurred");
  el.hint.types.classList.add("blurred");
  el.hint.types.innerHTML = "";
}

function toggleMainView(showMain = true) {
  el.setupArea.classList.toggle("hidden", showMain);
  el.mainArea.classList.toggle("hidden", !showMain);
  el.progressBar.classList.toggle("hidden", !showMain);
  el.progressCounter.classList.toggle("hidden", !showMain);
}

function updateProgress() {
  if (!session) return;
  const current = session.index + 1;
  const total = session.sentences.length;
  const pct = (current / total) * 100;

  el.progressFill.style.width = `${pct}%`;
  el.progressCounter.textContent = `${current} / ${total}`;
}

// Modal helpers

const openModal = (id) =>
  document.getElementById(id).classList.remove("hidden");
const closeModal = (id) => document.getElementById(id).classList.add("hidden");

// Setup modal

function openSetupModal() {
  openModal("start-modal");
  updateSetupModal();
}

function updateSetupModal() {
  const type = getPracticeType();
  el.levelsRange.classList.toggle("hidden", type !== "levels");
  el.daysRange.classList.toggle("hidden", type !== "days");
}

// Validation

function getPracticeType() {
  return document.querySelector('input[name="practice-type"]:checked').value;
}

function validateInputs(type) {
  el.warning.classList.add("hidden");
  if (type !== "levels") return true;

  const from = +el.fromLevel.value;
  const to = +el.toLevel.value;

  if (from > to) {
    showWarning("From level cannot be greater than To level");
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

// Font helpers

function setFont(font) {
  saveFontPreference(font);

  if (font === "Random") {
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    applyFont(randomFont);
    return;
  }

  applyFont(font);
}

function applyFont(font) {
  el.vocab.jp.classList.remove(...Object.values(FONT_MAP));
  el.vocab.jp.classList.add(FONT_MAP[font] ?? "font-serif");
}

function getFontPreference() {
  return localStorage.getItem("preferredFont");
}

function saveFontPreference(font) {
  localStorage.setItem("preferredFont", font);
}

// PracticeSession
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

// Theme helpers

function initTheme() {
  const saved = localStorage.getItem("theme") ?? "light";
  applyTheme(saved);
  el.themeSelect.value = saved;
}

function setTheme(theme) {
  localStorage.setItem("theme", theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getFontPreference() === "system") applyTheme("system");
  // or whatever you name your theme preference getter
});