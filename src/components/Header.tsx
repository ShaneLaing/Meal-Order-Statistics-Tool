import React from 'react';
import { BACKEND_SHEET_URL } from '../config';

export const Header: React.FC = () => (
  <header className="sticky top-0 z-30 backdrop-blur bg-[var(--bg-color)]/85 border-b border-[var(--border-color)]">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <h1 className="text-xl md:text-2xl font-bold text-[var(--text-dark)]">訂餐統計系統</h1>
      {BACKEND_SHEET_URL && (
        <a
          href={BACKEND_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--accent-color)] text-white hover:opacity-90 transition whitespace-nowrap"
        >
          後臺管理
        </a>
      )}
    </div>
  </header>
);
