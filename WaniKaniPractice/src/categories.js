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

const GROUP_GRAMMAR = "grammar";
const GROUP_THEME = "theme";

function buildCategory(id, label, match, group = GROUP_THEME) {
  return { id, label, match, group };
}

const CATEGORIES = [
  // --- Exact (from WaniKani's own tagging — verified against real data) ---
  buildCategory("verbs", "Verbs", partOfSpeechMatches(/verb/i), GROUP_GRAMMAR),
  buildCategory(
    "adjectives",
    "Adjectives",
    partOfSpeechMatches(/adjective/i),
    GROUP_GRAMMAR,
  ),
  buildCategory(
    "adverbs",
    "Adverbs",
    partOfSpeechMatches(/adverb/i),
    GROUP_GRAMMAR,
  ),
  buildCategory(
    "expressions",
    "Expressions",
    partOfSpeechMatches(/expression|interjection/i),
    GROUP_GRAMMAR,
  ),
  buildCategory(
    "counters",
    "Counters / Suffixes",
    partOfSpeechMatches(/counter|suffix|prefix/i),
    GROUP_GRAMMAR,
  ),
  buildCategory(
    "numbers",
    "Numbers",
    partOfSpeechMatches(/numeral/i),
    GROUP_GRAMMAR,
  ),
  buildCategory(
    "loanwords",
    "Katakana Loanwords",
    isKatakanaLoanword,
    GROUP_GRAMMAR,
  ),

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
      "era", "january", "february", "march", "april", "may", "june", "july",
      "august", "september", "october", "november", "december", "noon",
      "daytime", "midnight", "dawn",
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
      "grandfather", "aunt", "uncle", "cousin", "niece", "nephew",
      "grandparent", "grandparents", "siblings", "brothers", "sisters",
      "in-law", "stepmother", "stepfather", "twin", "twins", "relative",
      "relatives", "ancestor", "descendant", "widow", "widower", "orphan",
      "spouse", "daughter",
    ]),
  ),
  buildCategory(
    "places",
    "Places / Geography",
    meaningKeywords([
      "school", "house", "home", "station", "city", "town", "country",
      "room", "building", "hospital", "park", "store", "shop", "restaurant",
      "office", "road", "street", "bridge", "river", "mountain", "sea",
      "ocean", "lake", "garden", "library", "museum", "airport", "hotel",
      "temple", "shrine", "church", "district", "entrance", "exit", "ground",
      "hall", "residence", "neighborhood",
      // Generic geography terms (confirmed against real vocab data).
      "prefecture", "island", "peninsula", "strait", "bay", "gulf",
      "continent", "region", "area", "zone", "territory", "border",
      "province",
      // Continents / world regions.
      "asia", "europe", "africa", "north america", "south america",
      "antarctica", "east asia", "middle east", "western europe",
      // Countries.
      "japan", "china", "korea", "south korea", "taiwan", "mongolia",
      "america", "united states", "usa", "britain", "united kingdom",
      "england",
      // Japan-specific regions, islands, and cities.
      "hokkaido", "honshu", "shikoku", "kyushu", "okinawa", "tohoku",
      "kansai", "tokyo", "osaka", "kyoto", "nagoya", "yokohama",
      "hiroshima", "sendai", "nagasaki", "nara", "kagoshima", "okayama",
      "chiba", "saitama", "kawasaki",
      // Astronomy — planets and other celestial bodies.
      "milky way", "uranus", "mercury", "venus", "mars", "jupiter",
      "saturn", "neptune", "pluto", "planet", "planets", "solar system",
      "galaxy", "universe", "comet", "asteroid", "constellation",
      "satellite", "orbit",
      // Notable landmarks.
      "mt fuji", "mount fuji",
    ]),
  ),
  buildCategory(
    "directions",
    "Directions",
    meaningKeywords([
      "above", "below", "over there", "here", "where", "east", "west",
      "north", "south", "northeast", "northwest", "southeast", "southwest",
      "direction", "inside", "outside", "left side", "right side",
      "left hand", "right hand", "cardinal",
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
      "liberal democratic party", "political party", "parliament", "vote",
      "voting", "ballot", "politician", "governor", "mayor", "diplomacy",
      "diplomat",
    ]),
  ),
  buildCategory(
    "school",
    "School / Education",
    meaningKeywords([
      "school", "student", "teacher", "study", "lesson", "homework", "exam",
      "examination", "university", "class", "professor", "grade", "kanji",
      "character", "sentence", "writing", "letter", "book", "textbook",
      "dictionary", "education", "learn", "scholarship", "kindergarten",
      "preschool", "academy", "institute",
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
    "Food / Drink",
    meaningKeywords([
      "food", "eat", "drink", "rice", "water", "tea", "coffee", "bread",
      "meat", "fish", "vegetable", "fruit", "egg", "milk", "sugar", "salt",
      "meal", "breakfast", "lunch", "dinner", "cook", "cooking", "taste",
      "delicious", "sweet", "spicy", "onion", "carrot", "potato", "cucumber",
      "cabbage", "tomato", "spinach", "mushroom", "corn", "pepper", "garlic",
      "ginger", "radish", "beans", "noodle", "noodles", "soup", "tofu",
      "miso", "soy sauce", "pickle", "shochu", "sake", "beer", "wine",
      "liquor", "alcohol", "whiskey", "whisky", "juice", "soda", "tonkatsu",
      "pork", "pear", "strawberry", "wheat", "konbu", "flour", "peach",
      "melon", "watermelon", "cherry", "pumpkin", "sushi", "ramen",
      "sashimi", "seaweed",
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
      "spider", "ant", "worm", "swan", "crow", "pigeon", "dragon",
      "mosquito", "squid", "clam", "cattle", "owl", "eagle", "hawk",
      "sparrow", "peacock", "penguin", "dolphin", "shark", "octopus",
      "shrimp", "oyster", "jellyfish", "otter", "squirrel", "bat", "goose",
      "boar", "panda", "gorilla", "lizard", "centipede", "dragonfly",
      "cicada", "cockroach", "snail", "starfish", "raccoon", "camel",
      "puppy", "eel", "goldfish", "kitten", "carp", "salmon", "koi",
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
      "neck", "eyeball", "testicle", "testicles", "buttocks", "spine",
      "lung", "lungs", "liver", "intestine", "muscle", "joint", "wrist",
      "ankle", "eyebrow", "finger", "fingers", "toe", "toes", "nipple",
      "breast", "lips", "lip", "tongue", "tail", "fist",
    ]),
  ),
  buildCategory(
    "feelings",
    "Feelings",
    meaningKeywords([
      "joy", "anger", "happiness", "happy", "sad", "sadness", "pain",
      "affection", "hatred", "hate", "love", "relax", "relaxation", "ease",
      "discomfort", "fear", "surprise", "worry", "anxiety", "excitement",
      "excited", "calm", "lonely", "loneliness", "jealous", "jealousy",
      "pride", "proud", "shame", "regret", "hope", "disappointment",
      "grief", "comfort", "pleasure", "irritation", "gratitude", "emotion",
      "feeling", "mood",
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
    "occupations",
    "Occupations",
    meaningKeywords([
      "assistant", "priest", "nurse", "doctor", "physician", "engineer",
      "pharmacist", "singer", "actor", "actress", "artist", "musician",
      "writer", "author", "poet", "photographer", "dancer", "chef", "cook",
      "baker", "butcher", "farmer", "fisherman", "carpenter", "plumber",
      "electrician", "mechanic", "driver", "pilot", "captain", "sailor",
      "firefighter", "officer", "bodyguard", "lawyer", "attorney",
      "accountant", "banker", "clerk", "salesman", "manager", "director",
      "president", "secretary", "receptionist", "waiter", "waitress",
      "barber", "hairdresser", "tailor", "designer", "architect",
      "scientist", "researcher", "professor", "lecturer", "teacher",
      "coach", "athlete", "player", "reporter", "journalist", "editor",
      "announcer", "comedian", "magician", "dentist", "surgeon",
      "veterinarian", "therapist", "counselor", "interpreter", "translator",
      "programmer", "technician", "inspector", "detective", "spy", "monk",
      "nun", "craftsman", "artisan", "sumo wrestler", "samurai",
      "superintendent", "custodian", "conductor", "chairman", "chairperson",
      "chairwoman", "ninja", "shogun", "knight",
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

export {
  CATEGORIES,
  UNCATEGORIZED_ID,
  GROUP_GRAMMAR,
  GROUP_THEME,
  getMatchingCategoryIds,
};
