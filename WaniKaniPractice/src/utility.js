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

export { range, normalize };
