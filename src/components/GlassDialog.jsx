import { useEffect, useId, useRef } from 'react';
import './GlassDialog.css';

/** Shared glass surface and keyboard behaviour for cashier dialogs. */
export default function GlassDialog({ title, caption, onClose, children, className = '', panelClassName = '', raised = false, initialFocusRef }) {
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    (initialFocusRef?.current || panel.current?.querySelector('button'))?.focus();
    const keyboard = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...panel.current.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')];
      if (!controls.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return <div className={`glass-dialog ${raised ? 'glass-dialog--raised' : ''} ${className}`} onClick={onClose}>
    <section ref={panel} className={`glass-dialog__panel ${panelClassName}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <header className="glass-dialog__header"><div><h2 id={titleId}>{title}</h2>{caption && <p>{caption}</p>}</div>
        <button type="button" className="glass-dialog__close" onClick={onClose} aria-label="Закрыть">×</button>
      </header>
      {children}
    </section>
  </div>;
}
