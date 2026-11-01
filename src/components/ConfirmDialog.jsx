import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ title, children, confirmText, busy, onCancel, onConfirm, danger = true, error = '' }) {
  const dialog = useRef(null);
  const callbacks = useRef({ busy, onCancel });
  callbacks.current = { busy, onCancel };
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const keyboard = event => {
      if (event.key === 'Escape' && !callbacks.current.busy) callbacks.current.onCancel();
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled)')];
      if (!controls.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="accounting-dialog-backdrop" onClick={() => !busy && onCancel()}>
    <section ref={dialog} className="accounting-dialog" role="dialog" aria-modal="true" aria-labelledby="management-confirm-title" aria-busy={busy} onClick={event => event.stopPropagation()}>
      <h2 id="management-confirm-title">{title}</h2><p>{children}</p>
      {error && <p role="alert">{error}</p>}
      <div className="accounting-actions"><button type="button" disabled={busy} onClick={onCancel}>Отмена</button><button type="button" className={danger ? 'management-danger' : 'management-primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Сохраняем…' : confirmText}</button></div>
    </section>
  </div>;
}
