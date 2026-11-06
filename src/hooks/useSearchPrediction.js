import { useCallback, useEffect, useState } from 'react';

const key = 'kassa-search-prediction';
const eventName = 'search-prediction-changed';
const read = () => { try { return localStorage.getItem(key) !== 'false'; } catch { return true; } };

/** This device's search preference, shared by cashier and administration pages. */
export function useSearchPrediction() {
  const [enabled, update] = useState(read);
  useEffect(() => {
    const changed = event => { if (typeof event.detail === 'boolean') update(event.detail); };
    const stored = event => { if (event.key === key || event.key === null) update(read()); };
    window.addEventListener(eventName, changed);
    window.addEventListener('storage', stored);
    return () => { window.removeEventListener(eventName, changed); window.removeEventListener('storage', stored); };
  }, []);
  const setEnabled = useCallback(value => {
    update(value);
    try { localStorage.setItem(key, String(value)); } catch { /* Keep the session preference if storage is unavailable. */ }
    window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
  }, []);
  return [enabled, setEnabled];
}
