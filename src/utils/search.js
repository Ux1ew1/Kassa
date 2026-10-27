const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU_KEYS = "йцукенгшщзхъфывапролджэячсмитьбюё";

const normalize = (value) => String(value ?? "").toLowerCase()
  .replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Optimal string alignment distance: insertion, deletion, replacement and swaps.
function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function tokenScore(query, word) {
  if (word === query) return 0;
  if (word.startsWith(query)) return 1;
  if (word.includes(query)) return 2;
  // Short fragments and numbers must match literally to avoid noisy results.
  if (query.length < 3 || /\d/.test(query)) return Infinity;
  const limit = query.length >= 6 ? 2 : 1;
  let best = Infinity;
  for (let length = Math.max(1, query.length - limit);
    length <= Math.min(word.length, query.length + limit); length++) {
    best = Math.min(best, distance(query, word.slice(0, length)));
  }
  return best <= limit ? 3 + best : Infinity;
}

/** Search names with typo tolerance; keep the existing order for equal scores. */
export function searchMenu(items, value) {
  const raw = String(value ?? "").toLowerCase();
  const query = normalize(raw);
  if (!query) return items;
  const corrected = normalize([...raw].map((char) => {
    const index = EN_KEYS.indexOf(char);
    return index < 0 ? char : RU_KEYS[index];
  }).join(""));
  const variants = [...new Set([query, corrected])].filter(Boolean);
  return items.map((item, index) => {
    const name = normalize(item.name);
    const words = name.split(" ");
    let score = Infinity;
    for (const variant of variants) {
      const penalty = variant === query ? 0 : 0.5;
      if (name.includes(variant)) {
        score = Math.min(score, (name === variant ? 0 : 1) + penalty);
        continue;
      }
      const tokens = variant.split(" ");
      const total = tokens.reduce((sum, token) => sum +
        Math.min(...words.map((word) => tokenScore(token, word))), 0);
      score = Math.min(score, 2 + total + penalty);
    }
    return { item, index, score };
  }).filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ item }) => item);
}
