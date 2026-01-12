/**
 * Утилиты для работы с localStorage
 */

const STORAGE_KEYS = {
  CHECKS: 'checks',
  ACTIVE_CHECK_ID: 'activeCheckId',
};

/**
 * Сохраняет чеки в localStorage
 */
export function saveChecks(checks, activeCheckId) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(checks));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHECK_ID, String(activeCheckId));
  } catch (error) {
    console.error('Ошибка сохранения чеков:', error);
  }
}

/**
 * Загружает чеки из localStorage
 */
export function loadChecks() {
  try {
    const checksData = localStorage.getItem(STORAGE_KEYS.CHECKS);
    const activeCheckIdData = localStorage.getItem(STORAGE_KEYS.ACTIVE_CHECK_ID);
    
    const checks = checksData
      ? JSON.parse(checksData)
      : [{ id: 1, items: [], price: 0, change: 0 }];
    
    const activeCheckId = activeCheckIdData
      ? parseInt(activeCheckIdData, 10) || 1
      : 1;
    
    return { checks, activeCheckId };
  } catch (error) {
    console.error('Ошибка загрузки чеков:', error);
    return {
      checks: [{ id: 1, items: [], price: 0, change: 0 }],
      activeCheckId: 1,
    };
  }
}

/**
 * Очищает все данные из localStorage
 */
export function clearStorage() {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Ошибка очистки localStorage:', error);
  }
}

