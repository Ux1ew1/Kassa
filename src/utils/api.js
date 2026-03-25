const rawApiBase = (import.meta.env.VITE_API_BASE_URL || "/api").trim();
const API_BASE = rawApiBase.replace(/\/+$/, "") || "/api";

const buildApiUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

async function apiRequest(path, options = {}, fallbackMessage = "Request failed") {
  let response;
  try {
    response = await fetch(buildApiUrl(path), options);
  } catch {
    throw new Error("API server is unavailable. Check VITE_API_BASE_URL and backend status.");
  }

  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || fallbackMessage);
  return payload;
}

export async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchMenu(roomId, userId) {
  const payload = await apiRequest(
    `/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
    {},
    "Failed to load menu",
  );

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

export async function saveMenu(roomId, userId, items, activeOrder) {
  return apiRequest(
    `/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, activeOrder }),
    },
    "Failed to save menu",
  );
}

export async function registerUser(login, password) {
  return apiRequest(
    "/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    },
    "Failed to register",
  );
}

export async function loginUser(login, password) {
  return apiRequest(
    "/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    },
    "Failed to sign in",
  );
}

export async function createRoom(name, userId) {
  return apiRequest(
    "/rooms/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId }),
    },
    "Failed to create room",
  );
}

export async function fetchMyRooms(userId) {
  const payload = await apiRequest(
    `/rooms/my?userId=${encodeURIComponent(userId)}`,
    {},
    "Failed to load rooms",
  );
  return Array.isArray(payload?.rooms) ? payload.rooms : [];
}

export async function inviteToRoom(roomId, inviterId, login, role = "user") {
  return apiRequest(
    "/rooms/invite",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, inviterId, login, role }),
    },
    "Failed to invite user",
  );
}

export async function joinRoomByCode(userId, code) {
  return apiRequest(
    "/rooms/join-by-code",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, code }),
    },
    "Failed to join room",
  );
}

export async function renameRoom(roomId, actorId, name) {
  return apiRequest(
    "/rooms/rename",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, actorId, name }),
    },
    "Failed to rename room",
  );
}

export async function leaveRoom(roomId, userId) {
  return apiRequest(
    "/rooms/leave",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, userId }),
    },
    "Failed to leave room",
  );
}

export async function fetchRoomMembers(roomId, userId) {
  const payload = await apiRequest(
    `/rooms/members?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
    {},
    "Failed to load room members",
  );
  return Array.isArray(payload?.members) ? payload.members : [];
}

export async function updateRoomMemberRole(roomId, actorId, targetUserId, role) {
  return apiRequest(
    "/rooms/member-role",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, actorId, targetUserId, role }),
    },
    "Failed to update role",
  );
}

export async function kickRoomMember(roomId, actorId, targetUserId) {
  return apiRequest(
    "/rooms/kick",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, actorId, targetUserId }),
    },
    "Failed to kick user",
  );
}

export function formatPrice(price) {
  return `${price} ₽`;
}

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
