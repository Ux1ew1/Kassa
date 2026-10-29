/**
 * HTTP server for the cash register app: local API plus static files.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import qrcode from "qrcode-terminal";
import { createAccounting } from "./accounting/store.js";
import { accountingApi } from "./accounting/api.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;
const POLZA_MODEL = "google/gemini-3.5-flash";
const PREFERRED_INTERFACE = process.env.PREFERRED_INTERFACE || "rmnet_data2";
const PREFERRED_INTERFACES = (process.env.PREFERRED_INTERFACES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const DEFAULT_INTERFACE_HINTS = [
  "tailscale",
  "zerotier",
  "wireguard",
  "openvpn",
  "vpn",
  "wg",
  "tun",
  "tap",
  "utun",
  "ppp",
  "l2tp",
  "pptp",
  "rmnet",
  "wlan",
  "wi-fi",
  "wifi",
  "ethernet",
  "en",
  "eth",
];

const __filename = fileURLToPath(import.meta.url);
const baseDir = path.dirname(__filename);
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(baseDir, "data");
const menuFile = path.join(dataDir, "menu.json");
const configFile = path.join(baseDir, "config.local.json");
const distDir = path.join(baseDir, "dist");
const publicDir = path.join(baseDir, "public");

const { readFile, writeFile } = fs.promises;

const createId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getLanIp = () => {
  const networks = os.networkInterfaces();
  if (!networks) return null;

  const pickAddress = (ifaceName) => {
    const entries = networks[ifaceName];
    if (!entries) return null;
    const target = entries.find(
      (item) =>
        item &&
        item.family === "IPv4" &&
        !item.internal &&
        item.address &&
        !item.address.startsWith("169.254."),
    );
    return target?.address || null;
  };

  const interfaceNames = Object.keys(networks);
  const preferredHints = [
    ...PREFERRED_INTERFACES,
    PREFERRED_INTERFACE,
    ...DEFAULT_INTERFACE_HINTS,
  ].filter(Boolean);

  for (const hint of preferredHints) {
    const hintLower = hint.toLowerCase();
    const match = interfaceNames.find((name) => {
      const nameLower = name.toLowerCase();
      return nameLower === hintLower || nameLower.includes(hintLower);
    });
    if (!match) continue;
    const address = pickAddress(match);
    if (address) return address;
  }

  for (const entries of Object.values(networks)) {
    if (!entries) continue;
    const target = entries.find(
      (item) =>
        item &&
        item.family === "IPv4" &&
        !item.internal &&
        item.address &&
        !item.address.startsWith("169.254."),
    );
    if (target?.address) return target.address;
  }

  return null;
};

const getAllLanIps = () => {
  const networks = os.networkInterfaces();
  if (!networks) return [];
  const results = [];

  for (const entries of Object.values(networks)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (
        entry &&
        entry.family === "IPv4" &&
        !entry.internal &&
        entry.address &&
        !entry.address.startsWith("169.254.")
      ) {
        results.push(entry.address);
      }
    }
  }

  return [...new Set(results)];
};

const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".jsx": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
  };
  return types[ext] || "application/octet-stream";
};

const writeJsonFile = async (filePath, data) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

const ensureDataFile = async (filePath, fallback) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch {
    await writeJsonFile(filePath, fallback);
  }
};

const readJsonFile = async (filePath, fallback = null) => {
  if (fallback !== null) {
    await ensureDataFile(filePath, fallback);
  }

  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (fallback !== null) return fallback;
    throw error;
  }
};

const normalizeCategory = (value) => {
  const v = (value || "").toString().trim().toLowerCase();
  if (["drink", "drinks", "напитки"].includes(v)) return "напитки";
  if (["food", "еда"].includes(v)) return "еда";
  if (["alcohol", "alcoholic", "алкоголь"].includes(v)) return "алкоголь";
  return "остальное";
};

const normalizeMenuItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id !== "undefined" &&
        typeof item.name === "string" &&
        item.name.trim().length > 0 &&
        typeof item.price === "number" &&
        Number.isFinite(item.price) &&
        item.price >= 0,
    )
    .map((item) => ({
      ...item,
      name: item.name.trim(),
      price: item.price,
      show: item.show !== false,
      category: normalizeCategory(item.category),
    }));
};

const ensureActiveOrderConsistency = (items, activeOrder) => {
  const validIds = new Set(items.map((item) => item.id));
  const seen = new Set();
  const order = [];

  if (Array.isArray(activeOrder)) {
    activeOrder.forEach((id) => {
      if (validIds.has(id) && !seen.has(id)) {
        order.push(id);
        seen.add(id);
      }
    });
  }

  items.forEach((item) => {
    if (item.show && !seen.has(item.id)) {
      order.push(item.id);
      seen.add(item.id);
    }
  });

  return order;
};

const normalizeSingleMenu = (menu, index = 0) => {
  const fallbackId = index === 0 ? "main" : createId("menu");
  const items = normalizeMenuItems(menu?.items || menu?.menu || []);
  return {
    id: typeof menu?.id === "string" && menu.id.trim() ? menu.id : fallbackId,
    name:
      typeof menu?.name === "string" && menu.name.trim()
        ? menu.name.trim()
        : index === 0
          ? "Основное меню"
          : `Меню ${index + 1}`,
    items,
    activeOrder: ensureActiveOrderConsistency(items, menu?.activeOrder || []),
    createdAt: menu?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const normalizeMenuStore = (data) => {
  if (data && typeof data === "object" && Array.isArray(data.menus)) {
    const usedIds = new Set();
    const menus = data.menus.map((menu, index) => {
      let normalized = normalizeSingleMenu(menu, index);
      if (usedIds.has(normalized.id)) {
        normalized = { ...normalized, id: createId("menu") };
      }
      usedIds.add(normalized.id);
      return normalized;
    });

    if (menus.length === 0) {
      menus.push(normalizeSingleMenu({ id: "main", name: "Основное меню" }, 0));
    }

    const activeMenuId = menus.some((menu) => menu.id === data.activeMenuId)
      ? data.activeMenuId
      : menus[0].id;

    return { menus, activeMenuId };
  }

  const migrated = normalizeSingleMenu(
    {
      id: "main",
      name: "Основное меню",
      items: Array.isArray(data) ? data : data?.items || data?.menu || [],
      activeOrder: data?.activeOrder || [],
    },
    0,
  );

  return { menus: [migrated], activeMenuId: migrated.id };
};

const readMenuStore = async () => {
  const raw = await readJsonFile(menuFile, {
    menus: [normalizeSingleMenu({ id: "main", name: "Основное меню" }, 0)],
    activeMenuId: "main",
  });
  const normalized = normalizeMenuStore(raw);
  return normalized;
};

const writeMenuStore = async (store) => {
  const normalized = normalizeMenuStore(store);
  await writeJsonFile(menuFile, normalized);
  return normalized;
};

const menuSummary = (menu) => ({
  id: menu.id,
  name: menu.name,
  itemCount: menu.items.length,
  createdAt: menu.createdAt,
  updatedAt: menu.updatedAt,
});

const publicMenuStorePayload = (store) => {
  const activeMenu = store.menus.find((menu) => menu.id === store.activeMenuId) || store.menus[0];
  return {
    menus: store.menus.map(menuSummary),
    activeMenuId: activeMenu.id,
    activeMenu,
    menu: activeMenu.items,
    items: activeMenu.items,
    activeOrder: activeMenu.activeOrder,
  };
};

const findMenu = (store, id) => store.menus.find((menu) => menu.id === id);

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
};

const parseRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw || raw.trim().length === 0) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
};

const handleGetMenu = async (res) => {
  try {
    const store = await readMenuStore();
    sendJson(res, 200, publicMenuStorePayload(store));
  } catch (error) {
    console.error("Menu read error:", error);
    sendJson(res, 500, { message: "Не удалось загрузить меню" });
  }
};

const handleCreateMenu = async (req, res) => {
  try {
    const payload = await parseRequestBody(req);
    const store = await readMenuStore();
    const now = new Date().toISOString();
    const menu = normalizeSingleMenu(
      {
        id: createId("menu"),
        name: payload?.name || `Меню ${store.menus.length + 1}`,
        items: [],
        activeOrder: [],
        createdAt: now,
        updatedAt: now,
      },
      store.menus.length,
    );

    const nextStore = await writeMenuStore({
      ...store,
      menus: [...store.menus, menu],
      activeMenuId: menu.id,
    });

    sendJson(res, 201, {
      message: "Меню создано",
      ...publicMenuStorePayload(nextStore),
    });
  } catch (error) {
    console.error("Menu create error:", error);
    sendJson(res, error.message === "Invalid JSON" ? 400 : 500, {
      message: error.message === "Invalid JSON" ? "Некорректный JSON" : "Не удалось создать меню",
    });
  }
};

const handleUpdateNamedMenu = async (req, res, id) => {
  try {
    const payload = await parseRequestBody(req);
    const store = await readMenuStore();
    const menu = findMenu(store, id);

    if (!menu) {
      return sendJson(res, 404, { message: "Меню не найдено" });
    }

    const nextItems = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.menu)
        ? payload.menu
        : menu.items;
    const normalizedItems = normalizeMenuItems(nextItems);
    const nextMenu = {
      ...menu,
      name:
        typeof payload?.name === "string" && payload.name.trim()
          ? payload.name.trim()
          : menu.name,
      items: normalizedItems,
      activeOrder: ensureActiveOrderConsistency(
        normalizedItems,
        Array.isArray(payload?.activeOrder) ? payload.activeOrder : menu.activeOrder,
      ),
      updatedAt: new Date().toISOString(),
    };

    const nextStore = await writeMenuStore({
      ...store,
      menus: store.menus.map((item) => (item.id === id ? nextMenu : item)),
    });

    sendJson(res, 200, {
      message: "Меню обновлено",
      ...publicMenuStorePayload(nextStore),
    });
  } catch (error) {
    console.error("Menu update error:", error);
    sendJson(res, error.message === "Invalid JSON" ? 400 : 500, {
      message: error.message === "Invalid JSON" ? "Некорректный JSON" : "Не удалось обновить меню",
    });
  }
};

const handleUpdateActiveMenu = async (req, res) => {
  const store = await readMenuStore();
  return handleUpdateNamedMenu(req, res, store.activeMenuId);
};

const handleDeleteMenu = async (res, id) => {
  try {
    const store = await readMenuStore();

    if (store.menus.length <= 1) {
      return sendJson(res, 400, { message: "Нельзя удалить последнее меню" });
    }

    if (!findMenu(store, id)) {
      return sendJson(res, 404, { message: "Меню не найдено" });
    }

    const menus = store.menus.filter((menu) => menu.id !== id);
    const activeMenuId = store.activeMenuId === id ? menus[0].id : store.activeMenuId;
    const nextStore = await writeMenuStore({ menus, activeMenuId });

    sendJson(res, 200, {
      message: "Меню удалено",
      ...publicMenuStorePayload(nextStore),
    });
  } catch (error) {
    console.error("Menu delete error:", error);
    sendJson(res, 500, { message: "Не удалось удалить меню" });
  }
};

const handleActivateMenu = async (res, id) => {
  try {
    const store = await readMenuStore();

    if (!findMenu(store, id)) {
      return sendJson(res, 404, { message: "Меню не найдено" });
    }

    const nextStore = await writeMenuStore({ ...store, activeMenuId: id });
    sendJson(res, 200, {
      message: "Активное меню обновлено",
      ...publicMenuStorePayload(nextStore),
    });
  } catch (error) {
    console.error("Menu activate error:", error);
    sendJson(res, 500, { message: "Не удалось переключить меню" });
  }
};

const readPolzaConfig = async () => {
  let config;
  try {
    config = await readJsonFile(configFile);
  } catch {
    throw new Error("Создайте config.local.json с ключом polzaAiApiKey");
  }

  const apiKey = config?.polzaAiApiKey || config?.POLZA_AI_API_KEY;
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("В config.local.json не найден polzaAiApiKey");
  }

  return { apiKey };
};

const extractJsonObject = (text) => {
  if (!text || typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  }
};

const normalizeAiImport = (payload) => {
  const rawItems = Array.isArray(payload?.items) ? payload.items : [];
  const items = rawItems
    .map((item, index) => ({
      id: index + 1,
      name: typeof item?.name === "string" ? item.name.trim() : "",
      price: Number(item?.price),
      show: true,
      category: normalizeCategory(item?.category),
    }))
    .filter(
      (item) =>
        item.name &&
        Number.isFinite(item.price) &&
        item.price >= 0,
    );

  if (items.length === 0) {
    throw new Error("ИИ не вернул подходящие позиции меню");
  }

  return {
    menuName:
      typeof payload?.menuName === "string" && payload.menuName.trim()
        ? payload.menuName.trim()
        : `Меню с фото ${new Date().toLocaleString("ru-RU")}`,
    items,
    activeOrder: items.filter((item) => item.show).map((item) => item.id),
  };
};

const normalizeComparableItemName = (value) =>
  String(value || "")
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");

const comparableNameTokens = (value) => {
  const tokens = normalizeComparableItemName(value).split(" ").filter(Boolean);
  if (tokens.length > 1) {
    return tokens.filter((token) => !["кофе", "coffee", "напиток"].includes(token));
  }
  return tokens;
};

const bigrams = (value) => {
  const compact = normalizeComparableItemName(value).replace(/\s+/g, "");
  if (compact.length < 2) return new Set(compact ? [compact] : []);
  return new Set(Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2)));
};

const itemNameSimilarity = (left, right) => {
  const a = normalizeComparableItemName(left);
  const b = normalizeComparableItemName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const aTokens = new Set(comparableNameTokens(a));
  const bTokens = new Set(comparableNameTokens(b));
  const sharedTokens = [...aTokens].filter((token) => bTokens.has(token)).length;
  const tokenUnion = new Set([...aTokens, ...bTokens]).size || 1;
  const tokenScore = sharedTokens / tokenUnion;
  const smallerTokens = Math.min(aTokens.size, bTokens.size);
  const subsetScore = smallerTokens > 0 && sharedTokens === smallerTokens ? 0.96 : 0;

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  const sharedBigrams = [...aBigrams].filter((part) => bBigrams.has(part)).length;
  const diceScore = aBigrams.size + bBigrams.size
    ? (2 * sharedBigrams) / (aBigrams.size + bBigrams.size)
    : 0;

  return Math.max(subsetScore, tokenScore, diceScore);
};

const findSimilarMenuItem = (item, existingItems) => {
  let bestMatch = null;
  existingItems.forEach((existingItem) => {
    const score = itemNameSimilarity(item.name, existingItem.name);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { item: existingItem, score };
    }
  });
  return bestMatch;
};

const compareImportedItems = (items, existingItems) =>
  items.map((item, index) => {
    const match = findSimilarMenuItem(item, existingItems);
    const score = match?.score || 0;
    return {
      ...item,
      importKey: `import-${index + 1}`,
      match: score >= 0.62
        ? {
            itemId: match.item.id,
            name: match.item.name,
            score: Math.round(score * 100) / 100,
            type: score >= 0.9 ? "duplicate" : "similar",
          }
        : null,
    };
  });

const callPolzaForMenuPhoto = async (imageData) => {
  const { apiKey } = await readPolzaConfig();
  const response = await fetch("https://polza.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: POLZA_MODEL,
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "menu_photo_import",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              menuName: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    category: {
                      type: "string",
                      enum: ["напитки", "еда", "алкоголь", "остальное"],
                    },
                    show: { type: "boolean" },
                  },
                  required: ["name", "price", "category", "show"],
                },
              },
            },
            required: ["menuName", "items"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Ты распознаешь фото меню кафе. Верни только структурированный JSON. Цены указывай числом в рублях. Если категория не ясна, используй остальное.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Распознай позиции, цены и категории на этом фото меню. Не добавляй позиции, которых нет на фото.",
            },
            {
              type: "image_url",
              image_url: { url: imageData },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error?.message || "Polza AI вернул ошибку");
  }

  const content = payload?.choices?.[0]?.message?.content;
  return normalizeAiImport(
    typeof content === "string" ? extractJsonObject(content) : content,
  );
};

const handleImportPhoto = async (req, res) => {
  try {
    const payload = await parseRequestBody(req);
    let imported;

    if (payload?.commit === true && Array.isArray(payload?.items)) {
      imported = normalizeAiImport({
        menuName: payload.menuName,
        items: payload.items,
      });
    } else {
      const imageData = payload?.imageData;

      if (
        typeof imageData !== "string" ||
        !imageData.startsWith("data:image/") ||
        imageData.length < 100
      ) {
        return sendJson(res, 400, { message: "Нужно передать фото в imageData" });
      }

      imported = await callPolzaForMenuPhoto(imageData);
    }

    if (payload?.commit === false) {
      let targetMenu = null;
      if (payload?.targetMenuId) {
        const store = await readMenuStore();
        targetMenu = findMenu(store, payload.targetMenuId);
        if (!targetMenu) {
          return sendJson(res, 404, { message: "Меню для дополнения не найдено" });
        }
      }

      return sendJson(res, 200, {
        message: "Меню распознано",
        preview: targetMenu
          ? {
              ...imported,
              targetMenuId: targetMenu.id,
              targetMenuName: targetMenu.name,
              items: compareImportedItems(imported.items, targetMenu.items),
            }
          : imported,
      });
    }

    const store = await readMenuStore();
    const now = new Date().toISOString();

    if (payload?.mode === "append") {
      const targetMenu = findMenu(store, payload?.targetMenuId);
      if (!targetMenu) {
        return sendJson(res, 404, { message: "Меню для дополнения не найдено" });
      }

      const mergedItems = [...targetMenu.items];
      const skippedItems = [];
      const addedItems = [];

      imported.items.forEach((item) => {
        const match = findSimilarMenuItem(item, mergedItems);
        if (match && match.score >= 0.9) {
          skippedItems.push({
            name: item.name,
            matchedName: match.item.name,
            score: Math.round(match.score * 100) / 100,
          });
          return;
        }

        const nextItem = { ...item, id: createId('item') };
        mergedItems.push(nextItem);
        addedItems.push(nextItem);
      });

      const nextMenu = normalizeSingleMenu(
        {
          ...targetMenu,
          items: mergedItems,
          activeOrder: ensureActiveOrderConsistency(mergedItems, [
            ...targetMenu.activeOrder,
            ...addedItems.filter((item) => item.show).map((item) => item.id),
          ]),
          updatedAt: now,
        },
        store.menus.findIndex((menuItem) => menuItem.id === targetMenu.id),
      );
      const nextStore = await writeMenuStore({
        menus: store.menus.map((menuItem) => (menuItem.id === targetMenu.id ? nextMenu : menuItem)),
        activeMenuId: targetMenu.id,
      });

      return sendJson(res, 200, {
        message: `Добавлено позиций: ${addedItems.length}`,
        importedMenu: nextMenu,
        mergeResult: { added: addedItems.length, skipped: skippedItems },
        ...publicMenuStorePayload(nextStore),
      });
    }

    const menu = normalizeSingleMenu(
      {
        id: createId("menu"),
        name: imported.menuName,
        items: imported.items,
        activeOrder: imported.activeOrder,
        createdAt: now,
        updatedAt: now,
      },
      store.menus.length,
    );
    const nextStore = await writeMenuStore({
      ...store,
      menus: [...store.menus, menu],
      activeMenuId: menu.id,
    });

    sendJson(res, 201, {
      message: "Меню импортировано",
      importedMenu: menu,
      ...publicMenuStorePayload(nextStore),
    });
  } catch (error) {
    console.error("Photo import error:", error);
    sendJson(res, error.message === "Invalid JSON" ? 400 : 500, {
      message: error.message || "Не удалось импортировать меню с фото",
    });
  }
};

const dirExists = async (dirPath) => {
  try {
    const stat = await fs.promises.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

const serveStatic = async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const safePath = path.posix.normalize(urlPath.replaceAll('\\', '/'));
    let staticDir = null;
    let indexPath = null;

    if (await dirExists(distDir)) {
      staticDir = distDir;
      indexPath = path.join(distDir, "index.html");
    } else if (await dirExists(publicDir)) {
      staticDir = publicDir;
      indexPath = path.join(baseDir, "index.html");
    }

    if (!staticDir) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found - Build the project first: npm run build");
      return;
    }

    const filePath =
      safePath === "/" || safePath === "/index.html"
        ? indexPath
        : path.join(staticDir, safePath);

    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }

    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": getMimeType(filePath) });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        const indexPath = (await dirExists(distDir))
          ? path.join(distDir, "index.html")
          : path.join(baseDir, "index.html");
        const content = await readFile(indexPath);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(content);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
      }
    } else {
      console.error("Static file error:", error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("500 Internal Server Error");
    }
  }
};

const accounting = createAccounting({ file: path.join(dataDir, 'accounting.json'), catalog: readMenuStore });
const handleAccounting = accountingApi(accounting, sendJson);
let apiQueue = Promise.resolve();
const routeApi = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  if (pathname === '/api/accounting' || pathname.startsWith('/api/accounting/')) return handleAccounting(req, res, url);

  if (req.method === "GET" && (pathname === "/api/menu" || pathname === "/api/menus")) {
    return handleGetMenu(res);
  }
  if (req.method === "PUT" && pathname === "/api/menu") {
    return handleUpdateActiveMenu(req, res);
  }
  if (req.method === "POST" && pathname === "/api/menus") {
    return handleCreateMenu(req, res);
  }
  if (req.method === "POST" && pathname === "/api/menus/import-photo") {
    return handleImportPhoto(req, res);
  }

  const menuMatch = pathname.match(/^\/api\/menus\/([^/]+)$/);
  if (menuMatch && req.method === "PUT") {
    return handleUpdateNamedMenu(req, res, decodeURIComponent(menuMatch[1]));
  }
  if (menuMatch && req.method === "DELETE") {
    return handleDeleteMenu(res, decodeURIComponent(menuMatch[1]));
  }

  const activateMatch = pathname.match(/^\/api\/menus\/([^/]+)\/activate$/);
  if (activateMatch && req.method === "POST") {
    return handleActivateMenu(res, decodeURIComponent(activateMatch[1]));
  }

  return sendJson(res, 404, { message: "Неизвестный API маршрут" });
};

const requestHandler = async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      return res.end();
    }

    if (req.url === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }

    if (req.url.startsWith("/api/")) {
      const response = apiQueue.then(() => routeApi(req, res));
      apiQueue = response.catch(() => {});
      return await response;
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error("Unhandled server error:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ message: "Внутренняя ошибка сервера" }));
  }
};

const server = http.createServer(requestHandler);

server.listen(PORT, HOST, async () => {
  const hasDist = await dirExists(distDir);
  console.log(`Server started: http://${HOST}:${PORT}`);
  console.log(`Menu data: ${menuFile}`);
  console.log(`Static files: ${hasDist ? distDir : "run npm run build for production"}`);
  const publicUrl = (process.env.PUBLIC_URL || "").trim();
  const lanIp = getLanIp();
  const allIps = getAllLanIps();
  const resolvedUrl = publicUrl || (lanIp ? `http://${lanIp}:${PORT}` : null);

  if (resolvedUrl) {
    console.log(`Public URL: ${resolvedUrl}`);
    qrcode.generate(resolvedUrl, { small: true });
  }

  if (allIps.length > 1) {
    console.log("Available IPv4 addresses:");
    allIps.forEach((ip) => console.log(` - http://${ip}:${PORT}`));
  }
});

server.on("error", (error) => {
  console.error("Server error:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  }
});
