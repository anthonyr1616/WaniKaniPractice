// WaniKani's API has no ready-made "category" field for vocabulary, so this
// module builds categories two different ways:
//
// 1. Exact, from data WaniKani already gives us — grammatical part of speech
//    (already shown as badges in the app) and script (katakana-only vocab is
//    a loanword, a real distinction Japanese textbooks make explicitly).
//    These are not guesses.
// 2. Heuristic — a keyword list matched against a vocab's English meanings,
//    for genuinely thematic groupings (Food, Family, School, ...).
//
// The heuristic categories below were calibrated against a real export of
// ~6750 WaniKani vocabulary entries (levels 1-60) rather than guessed blind —
// Government/Politics/Military and Business/Money in particular turned out
// to be large, genuine clusters that weren't obvious up front. Word-sense
// ambiguity still causes some noise (e.g. "bank" as in riverbank vs. a
// financial bank, "head" as in leader vs. body part) — inherent to any
// keyword approach, not something worth chasing down further here.
//
// A word can match more than one category, or none (see UNCATEGORIZED_ID).

const UNCATEGORIZED_ID = "uncategorized";

function meaningKeywords(keywords) {
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(?:${escaped.join("|")})\\b`, "i");
  return (vocab) => pattern.test(vocab.meanings.join(" | "));
}

function partOfSpeechMatches(regex) {
  return (vocab) => vocab.partsOfSpeech.some((p) => regex.test(p));
}

const KATAKANA_ONLY = /^[゠-ヿー]+$/;
function isKatakanaLoanword(vocab) {
  return KATAKANA_ONLY.test(vocab.characters);
}

function buildCategory(id, label, match) {
  return { id, label, match };
}

const CATEGORIES = [
  // --- Exact (from WaniKani's own tagging — verified against real data) ---
  buildCategory("verbs", "Verbs", partOfSpeechMatches(/verb/i)),
  buildCategory("adjectives", "Adjectives", partOfSpeechMatches(/adjective/i)),
  buildCategory("adverbs", "Adverbs", partOfSpeechMatches(/adverb/i)),
  buildCategory(
    "expressions",
    "Expressions",
    partOfSpeechMatches(/expression|interjection/i),
  ),
  buildCategory(
    "counters",
    "Counters / Suffixes",
    partOfSpeechMatches(/counter|suffix|prefix/i),
  ),
  buildCategory("numbers", "Numbers", partOfSpeechMatches(/numeral/i)),
  buildCategory("loanwords", "Katakana Loanwords", isKatakanaLoanword),

  // --- Heuristic (meaning-keyword matches, calibrated against real data) ---
  buildCategory(
    "time",
    "Time / Day",
    meaningKeywords([
      "day", "days", "week", "weeks", "month", "months", "year", "years",
      "morning", "afternoon", "evening", "night", "today", "tomorrow",
      "yesterday", "hour", "hours", "minute", "minutes", "second", "seconds",
      "o'clock", "time", "calendar", "monday", "tuesday", "wednesday",
      "thursday", "friday", "saturday", "sunday", "season", "spring",
      "summer", "autumn", "fall", "winter", "now", "later", "early", "late",
      "era",
    ]),
  ),
  buildCategory(
    "people",
    "People / Family",
    meaningKeywords([
      "person", "people", "man", "woman", "child", "children", "boy", "girl",
      "family", "mother", "father", "parent", "brother", "sister", "friend",
      "husband", "wife", "baby", "adult", "elderly", "worker", "employee",
      "boss", "customer", "guest", "neighbor", "citizen", "grandmother",
      "grandfather", "aunt", "uncle", "cousin",
    ]),
  ),
  buildCategory(
    "places",
    "Places",
    meaningKeywords([
      "school", "house", "home", "station", "city", "town", "country",
      "room", "building", "hospital", "park", "store", "shop", "restaurant",
      "office", "road", "street", "bridge", "river", "mountain", "sea",
      "ocean", "lake", "garden", "library", "museum", "airport", "hotel",
      "temple", "shrine", "church", "district", "entrance", "exit", "ground",
      "hall", "residence", "neighborhood",
    ]),
  ),
  buildCategory(
    "government",
    "Government / Politics / Military",
    meaningKeywords([
      "government", "national", "nation", "public", "minister", "police",
      "law", "army", "navy", "military", "soldier", "war", "nuclear",
      "congress", "diet", "election", "president", "king", "queen",
      "emperor", "empire", "embassy", "ambassador", "treaty", "constitution",
    ]),
  ),
  buildCategory(
    "school",
    "School / Education",
    meaningKeywords([
      "school", "student", "teacher", "study", "lesson", "homework", "exam",
      "examination", "university", "class", "professor", "grade", "kanji",
      "character", "sentence", "writing", "letter", "book", "textbook",
      "dictionary", "education", "learn", "scholarship",
    ]),
  ),
  buildCategory(
    "business",
    "Business / Money",
    meaningKeywords([
      "money", "price", "company", "business", "ticket", "cost", "value",
      "salary", "wage", "bank", "market", "trade", "industry", "factory",
      "product", "sell", "buy", "contract", "tax",
    ]),
  ),
  buildCategory(
    "food",
    "Food",
    meaningKeywords([
      "food", "eat", "drink", "rice", "water", "tea", "coffee", "bread",
      "meat", "fish", "vegetable", "fruit", "egg", "milk", "sugar", "salt",
      "meal", "breakfast", "lunch", "dinner", "cook", "cooking", "taste",
      "delicious", "sweet", "spicy",
    ]),
  ),
  buildCategory(
    "animals",
    "Animals",
    meaningKeywords([
      "animal", "dog", "cat", "bird", "fish", "cow", "horse", "pig", "sheep",
      "goat", "bear", "fox", "wolf", "monkey", "rabbit", "snake", "turtle",
      "crab", "whale", "elephant", "deer", "tiger", "lion", "mouse", "rat",
      "insect", "bee", "butterfly", "firefly", "chicken", "duck", "frog",
      "spider", "ant", "worm",
    ]),
  ),
  buildCategory(
    "nature",
    "Nature",
    meaningKeywords([
      "nature", "tree", "flower", "grass", "sky", "sun", "moon", "star",
      "wind", "rain", "snow", "cloud", "forest", "weather", "wood", "plant",
      "leaf", "root", "stone", "rock", "earth", "soil",
    ]),
  ),
  buildCategory(
    "body",
    "Body",
    meaningKeywords([
      "body", "head", "face", "eye", "eyes", "ear", "nose", "mouth", "hand",
      "hands", "foot", "feet", "leg", "arm", "arms", "heart", "hair",
      "tooth", "teeth", "blood", "bone", "skin", "brain", "throat",
      "shoulder", "knee", "elbow", "nail", "chest", "stomach", "waist",
      "neck",
    ]),
  ),
  buildCategory(
    "colors",
    "Colors",
    meaningKeywords([
      "red", "blue", "white", "black", "green", "yellow", "purple", "violet",
      "pink", "brown", "gray", "grey", "gold", "silver", "orange",
    ]),
  ),
  buildCategory(
    "phrases",
    "Common Phrases",
    meaningKeywords([
      "thank you", "good morning", "good evening", "good night", "hello",
      "goodbye", "excuse me", "i'm sorry", "please", "welcome",
      "congratulations", "nice to meet you", "see you", "take care", "cheers",
      "yes", "no",
    ]),
  ),
];

function getMatchingCategoryIds(vocab) {
  return CATEGORIES.filter((cat) => cat.match(vocab)).map((cat) => cat.id);
}

export { CATEGORIES, UNCATEGORIZED_ID, getMatchingCategoryIds };
