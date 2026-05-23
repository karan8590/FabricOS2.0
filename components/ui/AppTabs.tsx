import React from 'react';
import styles from './AppTabs.module.css';

interface TabItem {
  id: string;
  label: string;
}

interface AppTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: any) => void;
}

export default function AppTabs({ tabs, activeTab, onChange }: AppTabsProps) {
  return (
    <div className={styles.tabsContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
export type { AppTabsProps, TabItem };
