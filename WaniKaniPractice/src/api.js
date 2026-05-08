const BASE_URL = "https://api.wanikani.com/v2";

export function getApiToken() {
  return localStorage.getItem("apiToken");
}

export function setApiToken(token) {
  localStorage.setItem("apiToken", token);
}

async function authFetch(url) {
  const token = getApiToken();
  if (!token) throw new Error("API token is missing");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`API request failed: ${response.status}`);

  return response.json();
}

async function fetchAllPages(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const items = [];
  let nextUrl = url.toString();

  while (nextUrl) {
    const page = await authFetch(nextUrl);
    items.push(...page.data);
    nextUrl = page.pages?.next_url ?? null;
  }

  return items;
}

export async function getVocabByLevels(levels) {
  const items = await fetchAllPages("subjects", {
    types: "vocabulary",
    levels: levels.join(","),
  });

  return mapToVocab(items);
}

export async function getVocabAvailableAtDate(after, before) {
  const assignments = await fetchAllPages("assignments", {
    subject_types: "vocabulary",
    available_after: after.toISOString(),
    available_before: before.toISOString(),
    burned: false,
  });

  const ids = assignments.map((a) => a.data.subject_id);
  return getVocabByIds(ids);
}

export async function getCriticalVocab() {
  const stats = await fetchAllPages("review_statistics", {
    subject_types: "vocabulary",
    percentages_less_than: 75,
  });

  const ids = stats.map((s) => s.data.subject_id);
  return getVocabByIds(ids);
}

const ID_CHUNK_SIZE = 500;

export async function getVocabByIds(ids) {
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + ID_CHUNK_SIZE));
  }

  const pages = await Promise.all(
    chunks.map((chunk) =>
      fetchAllPages("subjects", {
        types: "vocabulary",
        ids: chunk.join(","),
      }),
    ),
  );

  return mapToVocab(pages.flat());
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
