import { useEffect, type ReactNode } from 'react';

export function Modal({ open, title, onClose, children, footer, size = 'default' }: { open: boolean; title: string; onClose: () => void; children?: ReactNode; footer?: ReactNode; size?: 'default' | 'wide' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[calc(100vh-3rem)] w-full flex-col gap-5 overflow-y-auto rounded-[4px] bg-surface p-7 shadow-[0_24px_60px_rgba(14,17,22,0.25)] ${size === 'wide' ? 'max-w-[760px]' : 'max-w-[460px]'}`}>
        <h2 id="modal-title" className="text-[28px] font-extrabold leading-tight tracking-tight">{title}</h2>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="status" className="fixed bottom-7 left-1/2 z-[60] max-w-[calc(100%-48px)] -translate-x-1/2 rounded-[2px] bg-ink px-5 py-3.5 text-[15px] text-page shadow-[0_12px_32px_rgba(14,17,22,0.25)]">
      {message}
    </div>
  );
}
