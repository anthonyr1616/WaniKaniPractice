const BASE_URL = "https://api.wanikani.com/v2";

export function getApiToken() {
  return localStorage.getItem("apiToken");
}

export function setApiToken(token) {
  localStorage.setItem("apiToken", token);
}

export function clearApiToken() {
  localStorage.removeItem("apiToken");
}

async function apiRequest(endpoint, params = {}) {
  const token = getApiToken();

  if (!token) {
    throw new Error("API token is missing");
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export async function checkApiTokenValidity(token) {
  try {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Token validation failed:", error);
    return false;
  }
}

export async function getVocabByLevels(levels) {
  const data = await apiRequest("subjects", {
    types: "vocabulary",
    levels: levels.join(","),
  });

  return mapToVocab(data.data);
}

export async function getVocabAvailableAtDate(after, before) {
  const data = await apiRequest("assignments", {
    subject_types: "vocabulary",
    available_after: after.toISOString(),
    available_before: before.toISOString(),
    burned: false,
  });

  const ids = data.data.map((a) => a.data.subject_id);
  return getVocabByIds(ids);
}

export async function getCriticalVocab() {
  const data = await apiRequest("review_statistics", {
    subject_types: "vocabulary",
    percentages_less_than: 75,
  });

  const ids = data.data.map((s) => s.data.subject_id);
  return getVocabByIds(ids);
}

export async function getVocabByIds(ids) {
  if (!ids.length) return [];

  const data = await apiRequest("subjects", {
    types: "vocabulary",
    ids: ids.join(","),
  });

  return mapToVocab(data.data);
}

function mapToVocab(items) {
  return items.map((item) => new Vocab(item));
}

export class Vocab {
  constructor({ id, data }) {
    this.id = id;
    this.level = data.level;
    this.characters = data.characters;

    this.meanings = data.meanings.map((m) => m.meaning);
    this.readings = data.readings.map((r) => r.reading);
    this.partsOfSpeech = data.parts_of_speech;

    this.contextSentences = data.context_sentences.map((s) => ({
      english: s.en,
      japanese: s.ja,
    }));
  }
}
