const API_BASE = "/api";

export async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchMenu(roomId, userId) {
  const response = await fetch(
    `${API_BASE}/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
  );
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to load menu");

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
  const response = await fetch(
    `${API_BASE}/menu?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, activeOrder }),
    },
  );
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to save menu");
  return payload;
}

export async function registerUser(login, password) {
  const response = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to register");
  return payload;
}

export async function loginUser(login, password) {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to sign in");
  return payload;
}

export async function createRoom(name, userId) {
  const response = await fetch(`${API_BASE}/rooms/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, userId }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to create room");
  return payload;
}

export async function fetchMyRooms(userId) {
  const response = await fetch(`${API_BASE}/rooms/my?userId=${encodeURIComponent(userId)}`);
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to load rooms");
  return Array.isArray(payload?.rooms) ? payload.rooms : [];
}

export async function inviteToRoom(roomId, inviterId, login, role = "user") {
  const response = await fetch(`${API_BASE}/rooms/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, inviterId, login, role }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to invite user");
  return payload;
}

export async function joinRoomByCode(userId, code) {
  const response = await fetch(`${API_BASE}/rooms/join-by-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, code }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to join room");
  return payload;
}

export async function renameRoom(roomId, actorId, name) {
  const response = await fetch(`${API_BASE}/rooms/rename`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, name }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to rename room");
  return payload;
}

export async function leaveRoom(roomId, userId) {
  const response = await fetch(`${API_BASE}/rooms/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, userId }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to leave room");
  return payload;
}

export async function fetchRoomMembers(roomId, userId) {
  const response = await fetch(
    `${API_BASE}/rooms/members?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`,
  );
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to load room members");
  return Array.isArray(payload?.members) ? payload.members : [];
}

export async function updateRoomMemberRole(roomId, actorId, targetUserId, role) {
  const response = await fetch(`${API_BASE}/rooms/member-role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, targetUserId, role }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to update role");
  return payload;
}

export async function kickRoomMember(roomId, actorId, targetUserId) {
  const response = await fetch(`${API_BASE}/rooms/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, actorId, targetUserId }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(payload?.message || "Failed to kick user");
  return payload;
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

