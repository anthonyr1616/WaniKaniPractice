// WaniKani API documentation: https://docs.api.wanikani.com/20170710/#getting-started

function getApiTokenFromCache() {
  return localStorage.getItem("apiToken");
}

function setApiTokenInCache(token) {
  localStorage.setItem("apiToken", token);
}

function clearApiTokenFromCache() {
  localStorage.removeItem("apiToken");
}

async function getVocabByLevels(levels) {
  const apiToken = getApiTokenFromCache();
  let url = `https://api.wanikani.com/v2/subjects?types=vocabulary&levels=${levels.join(",")}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const data = await response.json();

  return data.data.map((vocabData) => new Vocab(vocabData));
}

class Vocab {
  constructor(jsonData) {
    this.id = jsonData.id;
    this.level = jsonData.data.level;
    this.characters = jsonData.data.characters;
    this.meanings = jsonData.data.meanings.map((m) => m.meaning);
    this.readings = jsonData.data.readings.map((r) => r.reading);
    this.partsOfSpeech = jsonData.data.parts_of_speech;
    this.contextSentences = jsonData.data.context_sentences.map((s) => ({
      english: s.en,
      japanese: s.ja,
    }));
  }
}
