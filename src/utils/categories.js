const KNOWN_CATEGORIES = {
  напитки: ["drink", "drinks", "напитки"],
  еда: ["food", "еда"],
  алкоголь: ["alcohol", "alcoholic", "алкоголь"],
  остальное: ["other", "misc", "остальное", "другое"],
};

const CATEGORY_LABELS = {
  напитки: { ru: "Напитки", en: "Drinks" },
  еда: { ru: "Еда", en: "Food" },
  алкоголь: { ru: "Алкоголь", en: "Alcohol" },
  остальное: { ru: "Остальное", en: "Other" },
};

const normalizeRawValue = (value) =>
  (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

export const normalizeCategory = (value) => {
  const normalized = normalizeRawValue(value);
  if (!normalized || normalized === "all" || normalized === "все") return "";

  for (const [slug, aliases] of Object.entries(KNOWN_CATEGORIES)) {
    if (aliases.includes(normalized)) return slug;
  }

  return normalized;
};

export const categoryLabel = (category, isEn) => {
  const slug = normalizeCategory(category);
  if (!slug) return isEn ? "All" : "Все";
  const known = CATEGORY_LABELS[slug];
  return known ? (isEn ? known.en : known.ru) : slug;
};

export const collectCategories = (items = []) => {
  const detected = new Set();
  items.forEach((item) => {
    const category = normalizeCategory(item?.category);
    if (category) detected.add(category);
  });
  return Array.from(detected);
};
