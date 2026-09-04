import { useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

/** Replaces the native confirm() the delete flow used to rely on. */
export default function ConfirmDialog({
  open, title, body, confirmLabel = 'Confirm', onConfirm, onCancel
}) {
  const confirmRef = useRef();

  useEffect(() => {
    if (!open) return undefined;

    confirmRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={styles.title}>{title}</h2>
        {body && <p className={styles.body}>{body}</p>}
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button ref={confirmRef} className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
