import React from 'react';

export const Header: React.FC = () => (
  <header className="sticky top-0 z-30 backdrop-blur bg-[var(--bg-color)]/85 border-b border-[var(--border-color)]">
    <div className="max-w-6xl mx-auto px-4 py-3">
      <h1 className="text-xl md:text-2xl font-bold text-[var(--text-dark)]">訂餐統計系統</h1>
    </div>
  </header>
);
