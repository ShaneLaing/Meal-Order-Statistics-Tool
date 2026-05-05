import React from 'react';
import { UtensilsCrossed, Settings as SettingsIcon } from 'lucide-react';

export type AppPage = 'order' | 'settings';

interface SidebarProps {
  currentPage: AppPage;
  onChange: (page: AppPage) => void;
}

interface NavItem {
  key: AppPage;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { key: 'order', label: '點餐', icon: UtensilsCrossed },
  { key: 'settings', label: '設定', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onChange }) => {
  return (
    <aside
      aria-label="主選單"
      className="md:sticky md:top-[57px] md:self-start md:h-[calc(100vh-57px)] md:w-[200px] md:shrink-0 md:border-r md:border-[var(--border-color)] md:bg-[var(--card-bg)]/40 md:backdrop-blur"
    >
      <nav
        className="
          flex md:flex-col gap-1 p-2 md:p-3
          overflow-x-auto md:overflow-visible
          border-b md:border-b-0 border-[var(--border-color)]
          bg-[var(--card-bg)]/50 md:bg-transparent
        "
      >
        {NAV_ITEMS.map(item => {
          const active = currentPage === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition whitespace-nowrap md:w-full md:justify-start ${
                active
                  ? 'bg-[var(--primary-color)] text-[var(--text-dark)] shadow-sm'
                  : 'text-[var(--text-gray)] hover:bg-[var(--card-bg)]/80 hover:text-[var(--text-dark)]'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
