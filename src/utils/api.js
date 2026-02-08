/**
 * @file API utilities for interacting with the backend.
 */

const API_BASE = '/api';

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
 * Loads menu data from the server.
 * @returns {Promise<{items: Array, activeOrder: Array}>}
 */
export async function fetchMenu() {
  const response = await fetch(`${API_BASE}/menu`);
  const payload = await safeJson(response);
  
  if (!response.ok) {
    throw new Error(payload?.message || '?? ??????? ????????? ????');
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
 * Persists menu data to the server.
 * @param {Array} items - Menu items.
 * @param {Array} activeOrder - Order of visible items.
 * @returns {Promise<any>} Server response payload.
 */
export async function saveMenu(items, activeOrder) {
  const response = await fetch(`${API_BASE}/menu`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, activeOrder }),
  });
  
  const payload = await safeJson(response);
  
  if (!response.ok) {
    throw new Error(payload?.message || '?? ??????? ????????? ????');
  }
  
  return payload;
}

/**
 * Formats a price value in rubles.
 * @param {number} price - Numeric price.
 * @returns {string} Formatted price.
 */
export function formatPrice(price) {
  return `${price} ???.`;
}

/**
 * Validates a menu item shape.
 * @param {Object} item - Menu item object.
 * @returns {boolean} True if valid.
 */
export function validateMenuItem(item) {
  return (
    item &&
    typeof item.id !== 'undefined' &&
    typeof item.name === 'string' &&
    item.name.trim().length > 0 &&
    typeof item.price === 'number' &&
    item.price >= 0
  );
}
