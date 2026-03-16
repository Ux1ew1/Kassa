/**
 * @file API utilities for interacting with the backend.
 */

const API_BASE = "/api";

/**
 * Safely parses JSON from a fetch Response.
 * @param {Response} response - Fetch response.
 * @returns {Promise<any|null>} Parsed JSON or null.
 */
export async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Loads room menu data from the server.
 * @param {string} roomId - Active room id.
 * @param {string} userId - Active user id.
 * @returns {Promise<{items: Array, activeOrder: Array}>}
 */
export async function fetchMenu(roomId, userId) {
  const response = await fetch(
    `${API_BASE}/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
  );
  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || "?? ??????? ????????? ????");
  }

  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.menu)
      ? payload.menu
      : [];

  const activeOrder = Array.isArray(payload?.activeOrder)
    ? payload.activeOrder
    : items.filter((item) => item.show).map((item) => item.id);

  return { items, activeOrder };
}

/**
 * Persists room menu data to the server.
 * @param {string} roomId - Active room id.
 * @param {string} userId - Active user id.
 * @param {Array} items - Menu items.
 * @param {Array} activeOrder - Order of visible items.
 * @returns {Promise<any>} Server response payload.
 */
export async function saveMenu(roomId, userId, items, activeOrder) {
  const response = await fetch(
    `${API_BASE}/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
    {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, activeOrder }),
    },
  );

  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || "?? ??????? ????????? ????");
  }

  return payload;
}

/**
 * Registers a new user.
 * @param {string} login - User login.
 * @param {string} password - User password.
 * @returns {Promise<{user: {id: string, login: string}}>} Registered user.
 */
export async function registerUser(login, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось зарегистрироваться");
  }

  return payload;
}

/**
 * Logs in an existing user.
 * @param {string} login - User login.
 * @param {string} password - User password.
 * @returns {Promise<{user: {id: string, login: string}}>} Authorized user.
 */
export async function loginUser(login, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });

  const payload = await safeJson(response);

  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось войти");
  }

  return payload;
}

export async function createRoom(name, userId) {
  const response = await fetch(`${API_BASE}/rooms/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, userId }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось создать комнату");
  }
  return payload;
}

export async function fetchMyRooms(userId) {
  const response = await fetch(
    `${API_BASE}/rooms/my?userId=${encodeURIComponent(userId)}`,
  );

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось загрузить комнаты");
  }
  return Array.isArray(payload?.rooms) ? payload.rooms : [];
}

export async function inviteToRoom(roomId, inviterId, login, role = "user") {
  const response = await fetch(`${API_BASE}/rooms/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, inviterId, login, role }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось пригласить пользователя");
  }
  return payload;
}

export async function joinRoomByCode(userId, code) {
  const response = await fetch(`${API_BASE}/rooms/join-by-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось войти в комнату");
  }
  return payload;
}

export async function renameRoom(roomId, actorId, name) {
  const response = await fetch(`${API_BASE}/rooms/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, name }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось изменить название комнаты");
  }
  return payload;
}

export async function leaveRoom(roomId, userId) {
  const response = await fetch(`${API_BASE}/rooms/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, userId }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось выйти из комнаты");
  }
  return payload;
}

export async function fetchRoomMembers(roomId, userId) {
  const response = await fetch(
    `${API_BASE}/rooms/members?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
  );

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось загрузить участников");
  }
  return Array.isArray(payload?.members) ? payload.members : [];
}

export async function updateRoomMemberRole(roomId, actorId, targetUserId, role) {
  const response = await fetch(`${API_BASE}/rooms/member-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, targetUserId, role }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось изменить роль");
  }
  return payload;
}

export async function kickRoomMember(roomId, actorId, targetUserId) {
  const response = await fetch(`${API_BASE}/rooms/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, targetUserId }),
  });

  const payload = await safeJson(response);
  if (!response.ok) {
    throw new Error(payload?.message || "Не удалось исключить пользователя");
  }
  return payload;
}

/**
 * Formats a price value in rubles.
 * @param {number} price - Numeric price.
 * @returns {string} Formatted price.
 */
export function formatPrice(price) {
  return `${price} руб.`;
}

/**
 * Validates a menu item shape.
 * @param {Object} item - Menu item object.
 * @returns {boolean} True if valid.
 */
export function validateMenuItem(item) {
  return (
    item &&
    typeof item.id !== "undefined" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.price === "number" &&
    item.price >= 0
  );
}
 
