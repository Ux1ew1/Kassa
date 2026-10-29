import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAccounting } from '../utils/api';

export function useAccounting() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const pending = useRef(null);
  const reload = useCallback(() => {
    if (pending.current) return pending.current;
    pending.current = fetchAccounting().then(data => {
      if (mounted.current) { setState(data); setError(''); }
      return data;
    }).catch(error => {
      if (mounted.current) setError(error.message || 'Сервер учёта недоступен');
      return null;
    }).finally(() => { pending.current = null; });
    return pending.current;
  }, []);
  useEffect(() => {
    mounted.current = true; reload();
    const refresh = () => { if (!document.hidden) reload(); };
    const timer = setInterval(refresh, 3000);
    window.addEventListener('focus', refresh);
    window.addEventListener('accounting-changed', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      mounted.current = false; clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('accounting-changed', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);
  return { state, error, reload };
}
