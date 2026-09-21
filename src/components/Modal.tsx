import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Native modal provides inert background, keyboard containment and Escape handling. */
export default function Modal({ open, onClose, label, className = '', children }:
  { open: boolean; onClose: () => void; label: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return createPortal(<dialog ref={ref} aria-label={label} className={`cx-modal ${className}`}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget as HTMLDialogElement;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close.current();
    }}>{children}</dialog>, document.body);
}
