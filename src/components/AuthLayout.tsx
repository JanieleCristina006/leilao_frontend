import type { ReactNode } from 'react';
import type { Artwork } from '../types';
import { Eyebrow, Logo } from './ui';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout({ art, caption, reverse, children }: { art: Artwork; caption: string; reverse?: boolean; children: ReactNode }) {
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <div className={`relative min-h-[220px] bg-neutral-bg sm:min-h-[280px] md:min-h-screen ${reverse ? 'md:order-2' : ''}`}>
        <img src={art.img} alt={`${art.title}, de ${art.artist}`} className="absolute inset-0 size-full object-cover" />
        <div className="absolute right-6 bottom-6 left-6 flex max-w-sm flex-col gap-1 bg-page px-5 py-4 md:bottom-10 md:left-10">
          <Eyebrow>{caption}</Eyebrow>
          <span className="text-2xl leading-tight font-extrabold tracking-tight">{art.title}</span>
          <span className="text-sm text-muted">{art.artist}, {art.date}</span>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14 md:px-8">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <ThemeToggle />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
