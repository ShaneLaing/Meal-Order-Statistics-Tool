import React from 'react';
import { MenuManager } from './MenuManager';
import { DeadlineSettingsCard } from './DeadlineSettingsCard';
import type { DeadlineStatus, Meal } from '../types';

interface SettingsPageProps {
  meals: Meal[];
  onMenuUpsert: (item: { name: string; price: number; prevName?: string }) => Promise<Meal | null>;
  onMenuDelete: (name: string) => Promise<boolean>;
  deadline: DeadlineStatus;
  onDeadlineRefresh: () => Promise<void>;
  onDeadlineUpdate: (iso: string | null) => Promise<boolean>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  meals,
  onMenuUpsert,
  onMenuDelete,
  deadline,
  onDeadlineRefresh,
  onDeadlineUpdate,
}) => {
  return (
    <div className="space-y-4">
      <h1 className="text-lg md:text-xl font-bold text-[var(--text-dark)]">設定</h1>

      <section aria-labelledby="settings-menu-heading" className="space-y-2">
        <h2 id="settings-menu-heading" className="sr-only">Menu</h2>
        <MenuManager meals={meals} onUpsert={onMenuUpsert} onDelete={onMenuDelete} />
      </section>

      <section aria-labelledby="settings-config-heading" className="space-y-2">
        <h2 id="settings-config-heading" className="sr-only">Config</h2>
        <DeadlineSettingsCard
          deadline={deadline.deadline}
          isClosed={deadline.isClosed}
          remainingMs={deadline.remainingMs}
          label={deadline.label}
          onRefresh={onDeadlineRefresh}
          onUpdate={onDeadlineUpdate}
        />
      </section>
    </div>
  );
};
