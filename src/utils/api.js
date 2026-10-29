/**
 * @file API utilities for interacting with the backend.
 */

const API_BASE = "/api";

export async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await safeJson(response);

  if (!response.ok) {
    const error = new Error(payload?.message || "Не удалось выполнить запрос");
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

function normalizeActiveMenuPayload(payload) {
  const activeMenu = payload?.activeMenu || null;
  const items = Array.isArray(activeMenu?.items)
    ? activeMenu.items
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.menu)
        ? payload.menu
        : [];

  const activeOrder = Array.isArray(activeMenu?.activeOrder)
    ? activeMenu.activeOrder
    : Array.isArray(payload?.activeOrder)
      ? payload.activeOrder
      : items.filter((item) => item.show).map((item) => item.id);

  return {
    items,
    activeOrder,
    activeMenu,
    activeMenuId: payload?.activeMenuId || activeMenu?.id || "main",
    menus: Array.isArray(payload?.menus) ? payload.menus : [],
  };
}

export async function fetchMenu() {
  const payload = await requestJson(`${API_BASE}/menu`);
  return normalizeActiveMenuPayload(payload);
}

export const fetchAccounting = () => requestJson('/api/accounting');
export const saveReportSettings = payload => accountingRequest('/settings', 'PUT', payload);
export const addPreparedProduct = (menuId, payload) => requestJson(`/api/menus/${encodeURIComponent(menuId)}/items`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});
export const fetchReport = id => requestJson(`/api/accounting/reports/${encodeURIComponent(id)}`);
const accountingRequest = (route, method, payload) => requestJson(`/api/accounting${route}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});
export const configureAccounting = (menuId, payload) => accountingRequest(`/menus/${encodeURIComponent(menuId)}`, 'PUT', payload);
export const recordMovement = payload => accountingRequest('/movements', 'POST', payload);
export const submitSale = payload => accountingRequest('/sales', 'POST', payload);
export const closeShift = shiftId => accountingRequest('/close', 'POST', { shiftId });
export const clearReports = () => accountingRequest('/clear', 'POST', { confirm: 'clear-all-reports' });

export async function downloadReport(id, format) {
  const response = await fetch(`/api/accounting/reports/${encodeURIComponent(id)}?format=${format}`);
  if (!response.ok) throw new Error((await safeJson(response))?.message || 'Не удалось скачать отчёт');
  const disposition = response.headers.get('Content-Disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = encoded ? decodeURIComponent(encoded) : `Смена.${format}`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function saveMenu(items, activeOrder) {
  return requestJson(`${API_BASE}/menu`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, activeOrder }),
  });
}

export async function fetchMenus() {
  const payload = await requestJson(`${API_BASE}/menus`);
  return normalizeActiveMenuPayload(payload);
}

export async function createMenu(name) {
  const payload = await requestJson(`${API_BASE}/menus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return normalizeActiveMenuPayload(payload);
}

export async function updateMenu(menuId, data) {
  const payload = await requestJson(`${API_BASE}/menus/${encodeURIComponent(menuId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return normalizeActiveMenuPayload(payload);
}

export async function deleteMenu(menuId) {
  const payload = await requestJson(`${API_BASE}/menus/${encodeURIComponent(menuId)}`, {
    method: "DELETE",
  });
  return normalizeActiveMenuPayload(payload);
}

export async function activateMenu(menuId) {
  const payload = await requestJson(
    `${API_BASE}/menus/${encodeURIComponent(menuId)}/activate`,
    { method: "POST" },
  );
  return normalizeActiveMenuPayload(payload);
}

export async function importMenuPhoto(imageData, targetMenuId = null) {
  const payload = await requestJson(`${API_BASE}/menus/import-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageData, commit: false, targetMenuId }),
  });
  return payload.preview;
}

export async function createImportedMenu(preview, options = {}) {
  const payload = await requestJson(`${API_BASE}/menus/import-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commit: true,
      mode: options.mode || "create",
      targetMenuId: options.targetMenuId || null,
      menuName: preview?.menuName,
      items: options.items || preview?.items,
    }),
  });
  return {
    ...normalizeActiveMenuPayload(payload),
    mergeResult: payload?.mergeResult || null,
  };
}

export function formatPrice(price) {
  return `${price} руб.`;
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
