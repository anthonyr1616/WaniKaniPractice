import "./style.css";

import {
  getApiToken,
  setApiToken,
  getVocabByLevels,
  getVocabAvailableAtDate,
  getCriticalVocab,
} from "./api.js";

import { range, normalize, checkReading, checkMeaning } from "./utility.js";
import { Kuroshiro, KuroshiroAnalyzerKuromoji } from "kuroshiro-browser";
import { bind as bindWanakana } from "wanakana";

// Vite's sirv auto-adds Content-Encoding: br for .br files so the browser decompresses them,
// but GitHub Pages serves them as raw bytes. Pre-decompressed .dat.raw copies are created
// at build time and .dat.br fetches are redirected to them in production.
if (import.meta.env.PROD) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    const str = String(url);
    return _fetch(
      str.endsWith(".dat.br") ? str.replace(/\.dat\.br$/, ".dat.raw") : str,
      opts,
    );
  };
}

const kuroshiro = new Kuroshiro();
const kuroshiroReady = kuroshiro.init(new KuroshiroAnalyzerKuromoji());

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
  sessionLimit: document.getElementById("session-limit"),

  startBtn: document.getElementById("start-btn"),
  setupBtn: document.querySelector(".setup-btn"),
  prevSentenceBtn: document.getElementById("prev-sentence-btn"),
  nextSentenceBtn: document.getElementById("next-sentence-btn"),
  showAnswerBtn: document.getElementById("show-answer-btn"),
  checkAnswerBtn: document.getElementById("check-answer-btn"),
  hintBtn: document.getElementById("hint-btn"),
  resetBtn: document.getElementById("reset-btn"),

  quizAnswerArea: document.getElementById("quiz-answer-area"),
  readingInput: document.getElementById("quiz-reading-input"),
  meaningInput: document.getElementById("quiz-meaning-input"),
  readingFeedback: document.getElementById("reading-feedback"),
  meaningFeedback: document.getElementById("meaning-feedback"),
  quizScore: document.getElementById("quiz-score"),

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

  audioBtn: document.getElementById("audio-btn"),

  levelsRange: document.querySelector("#start-modal .levels-range"),
  daysRange: document.querySelector("#start-modal .days-range"),

  loadingIndicator: document.getElementById("loading-indicator"),

  sentenceScroll: document.querySelector(".sentence-scroll"),
  scrollbar: document.getElementById("custom-scrollbar"),
  scrollbarThumb: document.getElementById("custom-scrollbar-thumb"),
};

// Modal helpers

const openModal = (id) =>
  document.getElementById(id).classList.remove("hidden");
const closeModal = (id) => document.getElementById(id).classList.add("hidden");

function setLoading(loading) {
  el.loadingIndicator.classList.toggle("hidden", !loading);
  el.setupBtn.disabled = loading;
}

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
initKeyboard();
initCustomScrollbar();

function initCustomScrollbar() {
  el.sentenceScroll.addEventListener("scroll", updateCustomScrollbar);

  new ResizeObserver(updateCustomScrollbar).observe(el.sentenceScroll);

  new MutationObserver(() =>
    requestAnimationFrame(updateCustomScrollbar),
  ).observe(el.sentenceScroll, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function updateCustomScrollbar() {
  const { scrollTop, scrollHeight, clientHeight } = el.sentenceScroll;
  const hasOverflow = scrollHeight > clientHeight + 1;

  el.scrollbar.classList.toggle("visible", hasOverflow);
  if (!hasOverflow) return;

  const trackHeight = el.scrollbar.clientHeight;
  const thumbHeight = Math.max(24, (clientHeight / scrollHeight) * trackHeight);
  const maxTop = trackHeight - thumbHeight;
  const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * maxTop;

  el.scrollbarThumb.style.height = thumbHeight + "px";
  el.scrollbarThumb.style.top = thumbTop + "px";
}

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

  const saved = getFontPreference();
  if (saved) {
    el.fontSelect.value = saved;
    if (saved !== "Random") applyFont(saved);
  }
}

function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (!session) return;
    if (e.target.matches("input, select, textarea")) return;

    if (e.key === " ") {
      e.preventDefault();
      onShowAnswer();
    } else if (e.key === "h") onHint();
    else if (e.key === "ArrowRight") onNext();
    else if (e.key === "ArrowLeft") onPrev();
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
  el.prevSentenceBtn.onclick = onPrev;
  el.nextSentenceBtn.onclick = onNext;
  el.showAnswerBtn.onclick = onShowAnswer;
  el.checkAnswerBtn.onclick = onCheckAnswer;
  el.hintBtn.onclick = onHint;
  el.resetBtn.onclick = onReset;
  el.audioBtn.onclick = onPlayAudio;

  document.querySelector(".type-group").onchange = updateSetupModal;

  document.querySelectorAll(".number-input").forEach((input) => {
    const min = input.hasAttribute("min") ? +input.min : 1;
    const max = input.hasAttribute("max") ? +input.max : Infinity;

    input.addEventListener("keydown", (e) => {
      if ([".", ","].includes(e.key)) e.preventDefault();
    });
    input.addEventListener("input", () => normalize(input, min, max));
    input.addEventListener("blur", () => normalize(input, min, max));
  });

  [el.readingInput, el.meaningInput].forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !el.checkAnswerBtn.disabled) onCheckAnswer();
    });
  });

  bindWanakana(el.readingInput, { IMEMode: true });
}

// Practice logic

let session = null;

const SESSION_STORAGE_KEY = "activeSession";

function saveSession() {
  if (!session) return;
  try {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        sentences: session.sentences,
        mode: session.mode,
        index: session.index,
        score: session.score,
      }),
    );
  } catch {
    // Storage full or unavailable — persistence is a nice-to-have, skip silently.
  }
}

function clearSavedSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function loadSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function restoreSession() {
  const saved = loadSavedSession();
  if (!saved?.sentences?.length) return;

  session = new PracticeSession(saved.sentences, saved.mode);
  session.index = saved.index ?? 0;
  session.score = saved.score ?? session.score;

  applyModeUI(session.mode);
  toggleMainView(true);
  resetCard();
  await renderSentence(session.current);
  updateProgress();
  updateNavButtons();
  updateQuizScore();
}

async function onStart() {
  const type = getPracticeType();
  const mode = getPracticeMode();
  if (!validateInputs(type)) return;

  closeModal("start-modal");
  setLoading(true);
  try {
    await startPractice(type, mode);
  } catch {
    setLoading(false);
    showWarning("Failed to load vocabulary. Check your API token.");
    openModal("start-modal");
  }
}

async function startPractice(type, mode) {
  const vocab = await fetchVocab(type);
  const shuffled = shuffle(flatten(vocab));

  const limit = +el.sessionLimit.value;
  const sentences = limit > 0 ? shuffled.slice(0, limit) : shuffled;

  if (!sentences.length) {
    setLoading(false);
    showWarning("No vocabulary found for the selected options.");
    openModal("start-modal");
    return;
  }

  session = new PracticeSession(sentences, mode);
  applyModeUI(mode);
  toggleMainView(true);
  resetCard();
  await renderSentence(session.current);
  updateProgress();
  updateNavButtons();
  updateQuizScore();
  saveSession();
}

function applyModeUI(mode) {
  const isQuiz = mode === "quiz";
  el.showAnswerBtn.classList.toggle("hidden", isQuiz);
  el.checkAnswerBtn.classList.toggle("hidden", !isQuiz);
  el.quizAnswerArea.classList.toggle("hidden", !isQuiz);
  el.quizScore.classList.toggle("hidden", !isQuiz);
}

async function onPrev() {
  if (!session || !session.hasPrev) return;

  session.retreat();
  resetCard();
  await renderSentence(session.current);
  updateProgress();
  updateNavButtons();
  saveSession();
}

async function onNext() {
  if (!session || !session.hasNext) return;

  if (getFontPreference() === "Random") {
    const randomFont = fonts[Math.floor(Math.random() * fonts.length)];
    applyFont(randomFont);
  }

  session.advance();
  resetCard();
  await renderSentence(session.current);
  updateProgress();
  updateNavButtons();
  saveSession();
}

function onShowAnswer() {
  if (!session) return;
  el.vocab.answer.classList.remove("blurred");
}

function onCheckAnswer() {
  if (!session || session.mode !== "quiz") return;

  const vocab = session.current.vocab;
  const readingCorrect = checkReading(el.readingInput.value, vocab);
  const meaningCorrect = checkMeaning(el.meaningInput.value, vocab);

  showFeedback(el.readingFeedback, readingCorrect, vocab.readings[0]);
  showFeedback(el.meaningFeedback, meaningCorrect, vocab.meanings[0]);

  session.recordScore("reading", readingCorrect);
  session.recordScore("meaning", meaningCorrect);
  updateQuizScore();
  saveSession();

  el.readingInput.disabled = true;
  el.meaningInput.disabled = true;
  el.checkAnswerBtn.disabled = true;

  onShowAnswer();
}

function showFeedback(target, isCorrect, correctAnswer) {
  target.textContent = isCorrect
    ? "✓ Correct"
    : `✗ Correct answer: ${correctAnswer}`;
  target.className = `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;
}

function updateQuizScore() {
  if (!session || session.mode !== "quiz") return;
  const { reading, meaning } = session.score;
  el.quizScore.textContent = `Reading ✓${reading.correct} ✗${reading.incorrect}  ·  Meaning ✓${meaning.correct} ✗${meaning.incorrect}`;
}

function onHint() {
  if (!session) return;
  el.hint.readings.classList.remove("blurred");
  el.hint.meanings.classList.remove("blurred");
  el.hint.types.classList.remove("blurred");
  el.audioBtn.disabled = false;
}

let currentAudio = null;

function onPlayAudio() {
  const audioUrl = session?.current?.vocab.audioUrl;
  if (!audioUrl) return;

  currentAudio?.pause();
  currentAudio = new Audio(audioUrl);
  currentAudio.addEventListener("error", () =>
    el.audioBtn.classList.add("hidden"),
  );
  currentAudio.play().catch(() => el.audioBtn.classList.add("hidden"));
}

function onReset() {
  session = null;
  clearSavedSession();
  setLoading(false);
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

let kuroshiroFailed = false;

async function convertToHiragana(text) {
  try {
    await kuroshiroReady;
    return await kuroshiro.convert(text, { to: "hiragana" });
  } catch (err) {
    if (!kuroshiroFailed) {
      kuroshiroFailed = true;
      console.error("Furigana conversion unavailable:", err);
    }
    return null;
  }
}

async function renderSentence(sentence) {
  el.vocab.jp.textContent = sentence.japanese;
  const kana = await convertToHiragana(sentence.japanese);
  el.vocab.kana.textContent =
    kana ?? (kuroshiroFailed ? "(furigana unavailable)" : "");
  el.vocab.en.textContent = sentence.english;

  el.hint.characters.textContent = sentence.vocab.characters;
  el.hint.readings.textContent = sentence.vocab.readings.join(", ");
  el.hint.meanings.textContent = sentence.vocab.meanings.join(", ");
  el.audioBtn.classList.toggle("hidden", !sentence.vocab.audioUrl);

  el.hint.types.innerHTML = "";
  for (const part of sentence.vocab.partsOfSpeech) {
    const badge = document.createElement("span");
    badge.className = "part-of-speech-badge";
    badge.textContent = part;
    el.hint.types.appendChild(badge);
  }

  updateCustomScrollbar();
}

function resetCard() {
  currentAudio?.pause();
  el.vocab.answer.classList.add("blurred");
  el.hint.readings.classList.add("blurred");
  el.hint.meanings.classList.add("blurred");
  el.hint.types.classList.add("blurred");
  el.hint.types.innerHTML = "";
  el.audioBtn.disabled = true;
  el.sentenceScroll.scrollTop = 0;

  if (session?.mode === "quiz") resetQuizInputs();
}

function resetQuizInputs() {
  el.readingInput.value = "";
  el.meaningInput.value = "";
  el.readingInput.disabled = false;
  el.meaningInput.disabled = false;
  el.checkAnswerBtn.disabled = false;
  el.readingFeedback.textContent = "";
  el.readingFeedback.className = "quiz-feedback";
  el.meaningFeedback.textContent = "";
  el.meaningFeedback.className = "quiz-feedback";
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

function updateNavButtons() {
  if (!session) return;
  el.prevSentenceBtn.disabled = !session.hasPrev;
  el.nextSentenceBtn.disabled = !session.hasNext;
  el.nextSentenceBtn.textContent = session.hasNext
    ? "Next sentence →"
    : "No more vocab to review";
}

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

function getPracticeMode() {
  return document.querySelector('input[name="practice-mode"]:checked').value;
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
  constructor(sentences, mode) {
    this.sentences = sentences;
    this.mode = mode;
    this.index = 0;
    this.score = {
      reading: { correct: 0, incorrect: 0 },
      meaning: { correct: 0, incorrect: 0 },
    };
  }

  recordScore(field, correct) {
    this.score[field][correct ? "correct" : "incorrect"]++;
  }

  get current() {
    return this.sentences[this.index];
  }

  get hasPrev() {
    return this.index > 0;
  }

  get hasNext() {
    return this.index < this.sentences.length - 1;
  }

  retreat() {
    if (this.hasPrev) this.index--;
  }

  advance() {
    if (this.hasNext) this.index++;
  }
}

restoreSession();

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
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    document.documentElement.setAttribute(
      "data-theme",
      prefersDark ? "dark" : "light",
    );
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    if (localStorage.getItem("theme") === "system") applyTheme("system");
  });
