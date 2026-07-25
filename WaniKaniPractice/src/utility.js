function range(start, end) {
  if (start > end) return [];  
  if (isNaN(start) || isNaN(end)) return [];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function normalize(input, min = 1, max = 60) {
  let value = Number(input.value);
  if (isNaN(value)) value = 1;
  value = Math.floor(value);
  value = Math.max(min, Math.min(max, value));
  input.value = value;
}

function normalizeReading(str) {
  return str.trim().replace(/\s+/g, "");
}

function checkReading(input, vocab) {
  const normalized = normalizeReading(input);
  return !!normalized && vocab.readings.some((r) => normalizeReading(r) === normalized);
}

function normalizeMeaning(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/^to\s+/, "")
    .replace(/[.,!?]+$/, "")
    .replace(/\s+/g, " ");
}

function checkMeaning(input, vocab) {
  const normalized = normalizeMeaning(input);
  return !!normalized && vocab.meanings.some((m) => normalizeMeaning(m) === normalized);
}

export { range, normalize, checkReading, checkMeaning };
