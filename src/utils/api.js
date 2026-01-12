/**
 * API утилиты для работы с сервером
 */

const API_BASE = '/api';

/**
 * Безопасно парсит JSON из Response
 */
export async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Загружает меню с сервера
 */
export async function fetchMenu() {
  const response = await fetch(`${API_BASE}/menu`);
  const payload = await safeJson(response);
  
  if (!response.ok) {
    throw new Error(payload?.message || 'Не удалось загрузить меню');
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
 * Сохраняет меню на сервере
 */
export async function saveMenu(items, activeOrder) {
  const response = await fetch(`${API_BASE}/menu`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, activeOrder }),
  });
  
  const payload = await safeJson(response);
  
  if (!response.ok) {
    throw new Error(payload?.message || 'Не удалось сохранить меню');
  }
  
  return payload;
}

/**
 * Форматирует цену в рублях
 */
export function formatPrice(price) {
  return `${price} руб.`;
}

/**
 * Валидирует позицию меню
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

