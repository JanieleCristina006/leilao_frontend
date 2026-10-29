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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-3 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[calc(100vh-1.5rem)] w-full min-w-0 flex-col gap-5 overflow-y-auto rounded-[4px] bg-surface p-5 shadow-[0_24px_60px_rgba(14,17,22,0.25)] sm:max-h-[calc(100vh-3rem)] sm:p-7 ${size === 'wide' ? 'max-w-[760px]' : 'max-w-[460px]'}`}>
        <h2 id="modal-title" className="break-words text-[25px] font-extrabold leading-tight tracking-tight sm:text-[28px]">{title}</h2>
        {children}
        {footer && <div className="flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' }) {
  const toneClass = tone === 'error' ? 'bg-live-bg text-live' : 'bg-ok-bg text-ok';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} className={`fixed top-6 left-1/2 z-[60] max-w-[calc(100%-48px)] -translate-x-1/2 rounded-[2px] px-5 py-3.5 text-[15px] shadow-[0_12px_32px_rgba(14,17,22,0.25)] ${toneClass}`}>
      {message}
    </div>
  );
}
