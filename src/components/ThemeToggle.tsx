import { useTheme } from '../store/ThemeContext';

export default function ThemeToggle({ light = false }: { light?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === 'dark'}
      title={label}
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[2px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${light ? 'border-white/35 text-white hover:bg-white/10 focus-visible:outline-white' : 'border-field text-ink hover:bg-soft focus-visible:outline-ink'}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
        {theme === 'dark' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
          </>
        ) : (
          <path d="M20.9 13.1A8.5 8.5 0 0 1 10.9 3.1 8.5 8.5 0 1 0 20.9 13.1Z" />
        )}
      </svg>
    </button>
  );
}
