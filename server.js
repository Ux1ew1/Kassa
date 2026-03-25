import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const loadDotEnv = () => {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, "utf-8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
};

loadDotEnv();

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_PUBLIC_URL = "https://quickcashier.ru";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const SUPABASE_USERS_TABLE = (process.env.SUPABASE_USERS_TABLE || "users").trim();


const __filename = fileURLToPath(import.meta.url);
const baseDir = path.dirname(__filename);
const dataDir = path.join(baseDir, "data");
const menuFile = path.join(dataDir, "menu.json");
const distDir = path.join(baseDir, "dist");
const publicDir = path.join(baseDir, "public");

const DEFAULT_MENU = [];


const { readFile, writeFile } = fs.promises;

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
  } catch {
    if (fallback !== null) return fallback;
    throw new Error(`Cannot read json file: ${filePath}`);
  }
};

const normalizeMenuData = (data) => {
  let items = [];
  let activeOrder = [];

  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.items)) items = data.items;
    if (Array.isArray(data.activeOrder)) activeOrder = data.activeOrder;
  }

  items = items.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.id !== "undefined" &&
      typeof item.name === "string" &&
      typeof item.price === "number" &&
      item.price >= 0,
  );

  const validIds = new Set(items.map((item) => item.id));
  const seen = new Set();
  const sanitizedOrder = [];

  activeOrder.forEach((id) => {
    if (validIds.has(id) && !seen.has(id)) {
      sanitizedOrder.push(id);
      seen.add(id);
    }
  });

  items.forEach((item) => {
    if (item?.show && !seen.has(item.id) && validIds.has(item.id)) {
      sanitizedOrder.push(item.id);
      seen.add(item.id);
    }
  });

  return { items, activeOrder: sanitizedOrder };
};

const readMenuData = async () => {
  const raw = await readJsonFile(menuFile, DEFAULT_MENU);
  return normalizeMenuData(raw);
};

const writeMenuData = async (data) => {
  const normalized = normalizeMenuData(data);
  await writeJsonFile(menuFile, normalized);
  return normalized;
};

const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const normalizeLogin = (value) => (value || "").toString().trim().toLowerCase();
const REGISTER_LOGIN_MIN_LENGTH = 3;
const REGISTER_LOGIN_MAX_LENGTH = 24;
const REGISTER_PASSWORD_MIN_LENGTH = 6;
const REGISTER_PASSWORD_MAX_LENGTH = 72;
const REGISTER_LOGIN_PATTERN = /^[a-z0-9._-]+$/i;
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString("hex");
const validateRegisterCredentials = (login, password) => {
  if (!login) return "Логин обязателен";
  if (login.length < REGISTER_LOGIN_MIN_LENGTH) {
    return `Логин должен содержать минимум ${REGISTER_LOGIN_MIN_LENGTH} символа`;
  }
  if (login.length > REGISTER_LOGIN_MAX_LENGTH) {
    return `Логин должен содержать не более ${REGISTER_LOGIN_MAX_LENGTH} символов`;
  }
  if (!REGISTER_LOGIN_PATTERN.test(login)) {
    return "Логин может содержать только буквы, цифры, точку, подчёркивание и дефис";
  }
  if (!password) return "Пароль обязателен";
  if (password.length < REGISTER_PASSWORD_MIN_LENGTH) {
    return `Пароль должен содержать минимум ${REGISTER_PASSWORD_MIN_LENGTH} символов`;
  }
  if (password.length > REGISTER_PASSWORD_MAX_LENGTH) {
    return `Пароль должен содержать не более ${REGISTER_PASSWORD_MAX_LENGTH} символов`;
  }
  return null;
};

const verifyPassword = (password, salt, expectedHash) => {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
};

const buildSupabaseUrl = (pathSuffix) => `${SUPABASE_URL.replace(/\/$/, "")}${pathSuffix}`;

const supabaseRequest = async (pathSuffix, { method = "GET", body, headers = {} } = {}) => {
  const response = await fetch(buildSupabaseUrl(pathSuffix), {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message || payload?.error_description || payload?.error || "Supabase request failed";
    throw new Error(message);
  }

  return payload;
};

const findUserByLogin = async (login) => {
  const safeLogin = encodeURIComponent(login);
  const query =
    `/rest/v1/${SUPABASE_USERS_TABLE}` +
    `?select=id,login,password_hash,password_salt` +
    `&login=eq.${safeLogin}&limit=1`;
  const users = await supabaseRequest(query);
  return Array.isArray(users) && users.length > 0 ? users[0] : null;
};

const findUserById = async (userId) => {
  const safeId = encodeURIComponent(userId);
  const query =
    `/rest/v1/${SUPABASE_USERS_TABLE}` +
    `?select=id,login` +
    `&id=eq.${safeId}&limit=1`;
  const users = await supabaseRequest(query);
  return Array.isArray(users) && users.length > 0 ? users[0] : null;
};

const findRoomById = async (roomId) => {
  const safeRoomId = encodeURIComponent(roomId);
  const rooms = await supabaseRequest(
    `/rest/v1/rooms?select=id,name,code,created_by&` +
      `id=eq.${safeRoomId}&limit=1`,
  );
  return Array.isArray(rooms) && rooms.length > 0 ? rooms[0] : null;
};

const findMembership = async (roomId, userId) => {
  const safeRoomId = encodeURIComponent(roomId);
  const safeUserId = encodeURIComponent(userId);
  const members = await supabaseRequest(
    `/rest/v1/room_members?select=room_id,user_id,role&` +
      `room_id=eq.${safeRoomId}&user_id=eq.${safeUserId}&limit=1`,
  );
  return Array.isArray(members) && members.length > 0 ? members[0] : null;
};

const canManageRoom = (role) => role === "owner" || role === "admin";

const createRoomCodeCandidate = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
};

const generateUniqueRoomCode = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = createRoomCodeCandidate();
    const rows = await supabaseRequest(
      `/rest/v1/rooms?select=id&code=eq.${encodeURIComponent(code)}&limit=1`,
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return code;
    }
  }
  throw new Error("Не удалось сгенерировать короткий ID комнаты");
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
};

const parseRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw || raw.trim().length === 0) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
};

const handleGetMenu = async (res, roomId, userId) => {
  if (!roomId || !userId) {
    return sendJson(res, 400, { message: "roomId и userId обязательны" });
  }
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const membership = await findMembership(roomId, userId);
    if (!membership) {
      return sendJson(res, 403, { message: "Нет доступа к комнате" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    const rows = await supabaseRequest(
      `/rest/v1/room_menus?select=items,active_order&room_id=eq.${safeRoomId}&limit=1`,
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return sendJson(res, 200, { menu: [], activeOrder: [] });
    }

    const row = rows[0];
    const items = Array.isArray(row?.items) ? row.items : [];
    const activeOrder = Array.isArray(row?.active_order) ? row.active_order : [];

    sendJson(res, 200, { menu: items, activeOrder });
  } catch (error) {
    console.error("Ошибка чтения меню:", error);
    sendJson(res, 500, { message: "Не удалось загрузить меню" });
  }
};

const handleUpdateMenu = async (req, res, roomId, userId) => {
  if (!roomId || !userId) {
    return sendJson(res, 400, { message: "roomId и userId обязательны" });
  }
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const membership = await findMembership(roomId, userId);
    if (!membership || !canManageRoom(membership.role)) {
      return sendJson(res, 403, { message: "Недостаточно прав для изменения меню" });
    }

    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.menu)
        ? payload.menu
        : null;

    if (!Array.isArray(items)) {
      return sendJson(res, 400, { message: "Меню должно быть массивом" });
    }

    const activeOrder = Array.isArray(payload?.activeOrder) ? payload.activeOrder : [];
    const normalized = normalizeMenuData({ items, activeOrder });

    await supabaseRequest("/rest/v1/room_menus", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: [
        {
          room_id: roomId,
          items: normalized.items,
          active_order: normalized.activeOrder,
          updated_at: new Date().toISOString(),
        },
      ],
    });

    sendJson(res, 200, {
      message: "Меню обновлено",
      menu: normalized.items,
      activeOrder: normalized.activeOrder,
    });
  } catch (error) {
    console.error("Ошибка обновления меню:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    sendJson(res, 500, { message: "Не удалось обновить меню" });
  }
};

const handleRegister = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const login = normalizeLogin(payload?.login);
    const password = (payload?.password || "").toString().trim();
    const validationError = validateRegisterCredentials(login, password);
    if (validationError) {
      return sendJson(res, 400, { message: validationError });
    }

    const existingUser = await findUserByLogin(login);
    if (existingUser) {
      return sendJson(res, 409, { message: "Пользователь с таким логином уже существует" });
    }

    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);

    await supabaseRequest(`/rest/v1/${SUPABASE_USERS_TABLE}`, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [
        {
          id: userId,
          login,
          password_hash: passwordHash,
          password_salt: salt,
          created_at: new Date().toISOString(),
        },
      ],
    });

    return sendJson(res, 201, { user: { id: userId, login } });
  } catch (error) {
    console.error("Ошибка регистрации пользователя:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось зарегистрировать пользователя" });
  }
};

const handleLogin = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const login = normalizeLogin(payload?.login);
    const password = (payload?.password || "").toString().trim();

    if (!login || !password) {
      return sendJson(res, 400, { message: "Укажите логин и пароль" });
    }

    const user = await findUserByLogin(login);
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return sendJson(res, 401, { message: "Неверный логин или пароль" });
    }

    return sendJson(res, 200, {
      user: {
        id: user.id,
        login: user.login,
      },
    });
  } catch (error) {
    console.error("Ошибка входа пользователя:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось выполнить вход" });
  }
};

const handleCreateRoom = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const name = (payload?.name || "").toString().trim();
    const userId = (payload?.userId || "").toString().trim();

    if (!name || !userId) {
      return sendJson(res, 400, { message: "name и userId обязательны" });
    }

    const owner = await findUserById(userId);
    if (!owner) {
      return sendJson(res, 404, { message: "Пользователь не найден" });
    }

    const roomId = crypto.randomUUID();
    const roomCode = await generateUniqueRoomCode();
    await supabaseRequest("/rest/v1/rooms", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{ id: roomId, code: roomCode, name, created_by: userId }],
    });

    await supabaseRequest("/rest/v1/room_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{ room_id: roomId, user_id: userId, role: "owner", invited_by: userId }],
    });

    await supabaseRequest("/rest/v1/room_menus", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{ room_id: roomId, items: [], active_order: [] }],
    });

    return sendJson(res, 201, {
      room: { id: roomId, code: roomCode, name, role: "owner" },
    });
  } catch (error) {
    console.error("Ошибка создания комнаты:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось создать комнату" });
  }
};

const handleGetMyRooms = async (res, userId) => {
  if (!userId) {
    return sendJson(res, 400, { message: "userId обязателен" });
  }
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const safeUserId = encodeURIComponent(userId);
    const members = await supabaseRequest(
      `/rest/v1/room_members?select=room_id,role&user_id=eq.${safeUserId}`,
    );

    if (!Array.isArray(members) || members.length === 0) {
      return sendJson(res, 200, { rooms: [] });
    }

    const roomIds = members.map((row) => row.room_id).filter(Boolean);
    const uniqueRoomIds = [...new Set(roomIds)];
    const inQuery = uniqueRoomIds.map((id) => `\"${id}\"`).join(",");
    const rooms = await supabaseRequest(`/rest/v1/rooms?select=id,name,code&id=in.(${inQuery})`);
    const roomsMap = new Map((Array.isArray(rooms) ? rooms : []).map((room) => [room.id, room]));

    const result = members
      .map((member) => {
        const room = roomsMap.get(member.room_id);
        if (!room) return null;
        return { id: room.id, code: room.code, name: room.name, role: member.role };
      })
      .filter(Boolean);

    return sendJson(res, 200, { rooms: result });
  } catch (error) {
    console.error("Ошибка загрузки комнат пользователя:", error);
    return sendJson(res, 500, { message: error.message || "Не удалось загрузить комнаты" });
  }
};

const handleInviteToRoom = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const roomId = (payload?.roomId || "").toString().trim();
    const inviterId = (payload?.inviterId || "").toString().trim();
    const login = normalizeLogin(payload?.login);
    const role = (payload?.role || "user").toString().trim().toLowerCase();
    const targetRole = role === "admin" ? "admin" : "user";

    if (!roomId || !inviterId || !login) {
      return sendJson(res, 400, { message: "roomId, inviterId и login обязательны" });
    }

    const inviterMembership = await findMembership(roomId, inviterId);
    if (!inviterMembership || !canManageRoom(inviterMembership.role)) {
      return sendJson(res, 403, { message: "Недостаточно прав для приглашения" });
    }

    const room = await findRoomById(roomId);
    if (!room) {
      return sendJson(res, 404, { message: "Комната не найдена" });
    }

    const invitedUser = await findUserByLogin(login);
    if (!invitedUser) {
      return sendJson(res, 404, { message: "Пользователь с таким логином не найден" });
    }

    const existingMembership = await findMembership(roomId, invitedUser.id);
    const finalRole =
      existingMembership?.role === "owner" ? "owner" : targetRole;

    await supabaseRequest("/rest/v1/room_members", {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: [
        {
          room_id: roomId,
          user_id: invitedUser.id,
          role: finalRole,
          invited_by: inviterId,
        },
      ],
    });

    return sendJson(res, 200, {
      member: {
        roomId,
        userId: invitedUser.id,
        login: invitedUser.login,
        role: finalRole,
      },
    });
  } catch (error) {
    console.error("Ошибка приглашения в комнату:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось пригласить пользователя" });
  }
};

const handleJoinRoomByCode = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const userId = (payload?.userId || "").toString().trim();
    const code = (payload?.code || "").toString().trim().toUpperCase();

    if (!userId || !code) {
      return sendJson(res, 400, { message: "userId и code обязательны" });
    }

    const rows = await supabaseRequest(
      `/rest/v1/rooms?select=id,name,code&code=eq.${encodeURIComponent(code)}&limit=1`,
    );
    const room = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!room) {
      return sendJson(res, 404, { message: "Комната с таким ID не найдена" });
    }

    await supabaseRequest("/rest/v1/room_members", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: [{ room_id: room.id, user_id: userId, role: "user", invited_by: null }],
    });

    const membership = await findMembership(room.id, userId);
    return sendJson(res, 200, {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        role: membership?.role || "user",
      },
    });
  } catch (error) {
    console.error("Ошибка входа в комнату по ID:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось присоединиться к комнате" });
  }
};

const handleRenameRoom = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const roomId = (payload?.roomId || "").toString().trim();
    const actorId = (payload?.actorId || "").toString().trim();
    const name = (payload?.name || "").toString().trim();

    if (!roomId || !actorId || !name) {
      return sendJson(res, 400, { message: "roomId, actorId и name обязательны" });
    }

    const actorMembership = await findMembership(roomId, actorId);
    if (!actorMembership || !canManageRoom(actorMembership.role)) {
      return sendJson(res, 403, { message: "Недостаточно прав для изменения комнаты" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    await supabaseRequest(`/rest/v1/rooms?id=eq.${safeRoomId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: { name },
    });

    const room = await findRoomById(roomId);
    return sendJson(res, 200, {
      room: {
        id: room.id,
        code: room.code,
        name: room.name,
        role: actorMembership.role,
      },
    });
  } catch (error) {
    console.error("Ошибка переименования комнаты:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось изменить название комнаты" });
  }
};

const handleLeaveRoom = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const roomId = (payload?.roomId || "").toString().trim();
    const userId = (payload?.userId || "").toString().trim();

    if (!roomId || !userId) {
      return sendJson(res, 400, { message: "roomId и userId обязательны" });
    }

    const membership = await findMembership(roomId, userId);
    if (!membership) {
      return sendJson(res, 404, { message: "Вы не состоите в этой комнате" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    if (membership.role === "owner") {
      const members = await supabaseRequest(
        `/rest/v1/room_members?select=user_id,role&room_id=eq.${safeRoomId}`,
      );
      const otherMembers = (Array.isArray(members) ? members : []).filter(
        (member) => member.user_id !== userId,
      );

      if (otherMembers.length === 0) {
        await supabaseRequest(`/rest/v1/room_members?room_id=eq.${safeRoomId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        await supabaseRequest(`/rest/v1/room_menus?room_id=eq.${safeRoomId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        await supabaseRequest(`/rest/v1/rooms?id=eq.${safeRoomId}`, {
          method: "DELETE",
          headers: { Prefer: "return=minimal" },
        });
        return sendJson(res, 200, { ok: true, roomDeleted: true });
      }

      const nextOwner =
        otherMembers.find((member) => member.role === "admin") || otherMembers[0];
      const safeNextOwnerUserId = encodeURIComponent(nextOwner.user_id);

      await supabaseRequest(
        `/rest/v1/room_members?room_id=eq.${safeRoomId}&user_id=eq.${safeNextOwnerUserId}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { role: "owner" },
        },
      );
      await supabaseRequest(`/rest/v1/rooms?id=eq.${safeRoomId}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: { created_by: nextOwner.user_id },
      });
    }

    const safeUserId = encodeURIComponent(userId);
    await supabaseRequest(
      `/rest/v1/room_members?room_id=eq.${safeRoomId}&user_id=eq.${safeUserId}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      },
    );

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Ошибка выхода из комнаты:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось выйти из комнаты" });
  }
};

const roleOrder = { owner: 0, admin: 1, user: 2 };

const handleGetRoomMembers = async (res, roomId, userId) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }
  if (!roomId || !userId) {
    return sendJson(res, 400, { message: "roomId и userId обязательны" });
  }

  try {
    const requester = await findMembership(roomId, userId);
    if (!requester) {
      return sendJson(res, 403, { message: "Нет доступа к комнате" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    const rows = await supabaseRequest(
      `/rest/v1/room_members?select=user_id,role,users!room_members_user_id_fkey(id,login)&room_id=eq.${safeRoomId}`,
    );

    const members = (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        userId: row.user_id,
        login: row.users?.login || "",
        role: row.role,
      }))
      .sort((a, b) => {
        const byRole = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
        if (byRole !== 0) return byRole;
        return a.login.localeCompare(b.login, "ru");
      });

    return sendJson(res, 200, { members });
  } catch (error) {
    console.error("Ошибка загрузки участников комнаты:", error);
    return sendJson(res, 500, { message: error.message || "Не удалось загрузить участников" });
  }
};

const handleUpdateRoomMemberRole = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const roomId = (payload?.roomId || "").toString().trim();
    const actorId = (payload?.actorId || "").toString().trim();
    const targetUserId = (payload?.targetUserId || "").toString().trim();
    const role = (payload?.role || "").toString().trim().toLowerCase();
    const nextRole = role === "admin" ? "admin" : "user";

    if (!roomId || !actorId || !targetUserId) {
      return sendJson(res, 400, { message: "roomId, actorId и targetUserId обязательны" });
    }

    const actorMembership = await findMembership(roomId, actorId);
    if (!actorMembership || !canManageRoom(actorMembership.role)) {
      return sendJson(res, 403, { message: "Недостаточно прав для смены роли" });
    }

    const targetMembership = await findMembership(roomId, targetUserId);
    if (!targetMembership) {
      return sendJson(res, 404, { message: "Пользователь не состоит в комнате" });
    }

    if (targetMembership.role === "owner") {
      return sendJson(res, 403, { message: "Нельзя изменить роль owner" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    const safeTargetUserId = encodeURIComponent(targetUserId);
    await supabaseRequest(
      `/rest/v1/room_members?room_id=eq.${safeRoomId}&user_id=eq.${safeTargetUserId}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: { role: nextRole },
      },
    );

    return sendJson(res, 200, { ok: true, role: nextRole });
  } catch (error) {
    console.error("Ошибка смены роли участника:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось изменить роль" });
  }
};

const handleKickRoomMember = async (req, res) => {
  if (!hasSupabaseConfig()) {
    return sendJson(res, 500, {
      message: "Supabase не настроен. Укажите SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  try {
    const payload = await parseRequestBody(req);
    const roomId = (payload?.roomId || "").toString().trim();
    const actorId = (payload?.actorId || "").toString().trim();
    const targetUserId = (payload?.targetUserId || "").toString().trim();

    if (!roomId || !actorId || !targetUserId) {
      return sendJson(res, 400, { message: "roomId, actorId и targetUserId обязательны" });
    }

    if (actorId === targetUserId) {
      return sendJson(res, 400, { message: "Нельзя исключить себя. Используйте выход из комнаты." });
    }

    const actorMembership = await findMembership(roomId, actorId);
    if (!actorMembership || !canManageRoom(actorMembership.role)) {
      return sendJson(res, 403, { message: "Недостаточно прав для исключения" });
    }

    const targetMembership = await findMembership(roomId, targetUserId);
    if (!targetMembership) {
      return sendJson(res, 404, { message: "Пользователь не состоит в комнате" });
    }
    if (targetMembership.role === "owner") {
      return sendJson(res, 403, { message: "Нельзя исключить owner" });
    }

    const safeRoomId = encodeURIComponent(roomId);
    const safeTargetUserId = encodeURIComponent(targetUserId);
    await supabaseRequest(
      `/rest/v1/room_members?room_id=eq.${safeRoomId}&user_id=eq.${safeTargetUserId}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      },
    );

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("Ошибка исключения участника:", error);
    if (error.message === "Invalid JSON") {
      return sendJson(res, 400, { message: "Некорректный JSON" });
    }
    return sendJson(res, 500, { message: error.message || "Не удалось исключить пользователя" });
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

const getPublicBaseUrl = (req) => {
  const configured = (process.env.PUBLIC_URL || DEFAULT_PUBLIC_URL).trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const forwardedProto = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  const forwardedHost = (req.headers["x-forwarded-host"] || "").toString().split(",")[0].trim();
  const host = forwardedHost || (req.headers.host || `localhost:${PORT}`).toString().trim();
  const protocol = forwardedProto || "http";

  return `${protocol}://${host}`.replace(/\/+$/, "");
};

const handleRobotsTxt = (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const payload = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join("\n");

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  res.end(payload);
};

const handleSitemapXml = (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const now = new Date().toISOString();
  const payload = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  res.writeHead(200, {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
  });
  res.end(payload);
};

const serveStatic = async (req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");

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
      return;
    }

    console.error("Ошибка отдачи статического файла:", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 Internal Server Error");
  }
};

const requestHandler = async (req, res) => {
  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const pathname =
      requestUrl.pathname.length > 1
        ? requestUrl.pathname.replace(/\/+$/, "")
        : requestUrl.pathname;
    const roomId = requestUrl.searchParams.get("roomId") || "";
    const userId = requestUrl.searchParams.get("userId") || "";

    if (req.method === "OPTIONS") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      return res.end();
    }

    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === "GET" && pathname === "/robots.txt") {
      return handleRobotsTxt(req, res);
    }

    if (req.method === "GET" && pathname === "/sitemap.xml") {
      return handleSitemapXml(req, res);
    }

    if (pathname.startsWith("/api/")) {
      if (req.method === "GET" && pathname === "/api/menu") {
        return handleGetMenu(res, roomId, userId);
      }
      if (req.method === "PUT" && pathname === "/api/menu") {
        return handleUpdateMenu(req, res, roomId, userId);
      }
      if (req.method === "POST" && pathname === "/api/register") {
        return handleRegister(req, res);
      }
      if (req.method === "POST" && pathname === "/api/login") {
        return handleLogin(req, res);
      }
      if (req.method === "POST" && pathname === "/api/rooms/create") {
        return handleCreateRoom(req, res);
      }
      if (req.method === "GET" && pathname === "/api/rooms/my") {
        return handleGetMyRooms(res, userId);
      }
      if (req.method === "POST" && pathname === "/api/rooms/invite") {
        return handleInviteToRoom(req, res);
      }
      if (req.method === "POST" && pathname === "/api/rooms/join-by-code") {
        return handleJoinRoomByCode(req, res);
      }
      if (req.method === "POST" && pathname === "/api/rooms/rename") {
        return handleRenameRoom(req, res);
      }
      if (req.method === "POST" && pathname === "/api/rooms/leave") {
        return handleLeaveRoom(req, res);
      }
      if (req.method === "GET" && pathname === "/api/rooms/members") {
        return handleGetRoomMembers(res, roomId, userId);
      }
      if (req.method === "POST" && pathname === "/api/rooms/member-role") {
        return handleUpdateRoomMemberRole(req, res);
      }
      if (req.method === "POST" && pathname === "/api/rooms/kick") {
        return handleKickRoomMember(req, res);
      }
      return sendJson(res, 404, { message: "Неизвестный API маршрут" });
    }

    await serveStatic(req, res);
  } catch (error) {
    console.error("Необработанная ошибка:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ message: "Внутренняя ошибка сервера" }));
  }
};

const server = http.createServer(requestHandler);

server.listen(PORT, HOST, async () => {
  const hasDist = await dirExists(distDir);
  console.log(`Сервер запущен: http://${HOST}:${PORT}`);
  console.log(`Данные меню: ${menuFile}`);
  console.log(`Статические файлы: ${hasDist ? distDir : "используйте 'npm run build'"}`);

  if (!hasSupabaseConfig()) {
    console.log("[warn] Supabase auth disabled: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const publicUrl = (process.env.PUBLIC_URL || "").trim();
  if (publicUrl) {
    console.log(`Публичный URL: ${publicUrl}`);
  }
});

server.on("error", (error) => {
  console.error("Ошибка сервера:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`Порт ${PORT} уже занят. Попробуйте другой порт.`);
  }
});
