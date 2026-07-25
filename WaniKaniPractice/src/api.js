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

// Subject content (characters, readings, meanings, context sentences) is
// effectively static, so it's safe to cache client-side for a while — this
// cuts repeat load time and API calls for the same levels/vocab.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBJECT_CACHE_PREFIX = "wkSubjectCache:";
const QUERY_CACHE_PREFIX = "wkQueryCache:";

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, value } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) return null;
    return value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), value }));
  } catch {
    // Storage full or unavailable — caching is a nice-to-have, skip silently.
  }
}

function getCachedSubject(id) {
  return readCache(SUBJECT_CACHE_PREFIX + id);
}

function cacheSubjects(items) {
  items.forEach((item) => writeCache(SUBJECT_CACHE_PREFIX + item.id, item));
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
  if (!levels.length) return [];

  const queryKey =
    QUERY_CACHE_PREFIX +
    "levels2:" +
    [...levels].sort((a, b) => a - b).join(",");

  let items = readCache(queryKey);
  if (!items) {
    items = await fetchAllPages("subjects", {
      types: "vocabulary,kana_vocabulary",
      levels: levels.join(","),
    });
    writeCache(queryKey, items);
    cacheSubjects(items);
  }

  return mapToVocab(items);
}

export async function getVocabAvailableAtDate(after, before) {
  const assignments = await fetchAllPages("assignments", {
    subject_types: "vocabulary,kana_vocabulary",
    available_after: after.toISOString(),
    available_before: before.toISOString(),
    burned: false,
  });

  const ids = assignments.map((a) => a.data.subject_id);
  return getVocabByIds(ids);
}

export async function getCriticalVocab() {
  const stats = await fetchAllPages("review_statistics", {
    subject_types: "vocabulary,kana_vocabulary",
    percentages_less_than: 75,
  });

  const ids = stats.map((s) => s.data.subject_id);
  return getVocabByIds(ids);
}

const ID_CHUNK_SIZE = 500;

export async function getVocabByIds(ids) {
  if (!ids.length) return [];

  const cached = [];
  const missingIds = [];
  for (const id of ids) {
    const item = getCachedSubject(id);
    if (item) cached.push(item);
    else missingIds.push(id);
  }

  const chunks = [];
  for (let i = 0; i < missingIds.length; i += ID_CHUNK_SIZE) {
    chunks.push(missingIds.slice(i, i + ID_CHUNK_SIZE));
  }

  const pages = await Promise.all(
    chunks.map((chunk) =>
      fetchAllPages("subjects", {
        types: "vocabulary,kana_vocabulary",
        ids: chunk.join(","),
      }),
    ),
  );

  const fetched = pages.flat();
  cacheSubjects(fetched);

  return mapToVocab([...cached, ...fetched]);
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
    // kana_vocabulary subjects have no "readings" field — the characters are
    // already kana, so they're their own reading.
    this.readings = data.readings
      ? data.readings.map((r) => r.reading)
      : [data.characters];
    this.partsOfSpeech = data.parts_of_speech;

    this.audioUrl =
      data.pronunciation_audios?.find((a) => a.content_type === "audio/mpeg")
        ?.url ?? null;

    this.contextSentences = data.context_sentences.map((s) => ({
      english: s.en,
      japanese: s.ja,
    }));
  }
}
