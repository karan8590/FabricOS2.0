import React from 'react';
import styles from './WeekSelector.module.css';

interface WeekSelectorProps {
  value: string; // ISO date string of Monday of the selected week (e.g. "2026-05-18")
  onChange: (value: string) => void;
}

export default function WeekSelector({ value, onChange }: WeekSelectorProps) {
  // Format date range: "18 May - 24 May 2026"
  const getDisplayRange = () => {
    const monday = new Date(value);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDay = monday.getDate();
    const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
    const endDay = sunday.getDate();
    const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
    const year = sunday.getFullYear();

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  const handlePrevWeek = () => {
    const d = new Date(value);
    d.setDate(d.getDate() - 7);
    onChange(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(value);
    d.setDate(d.getDate() + 7);
    onChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.calendarIconBtn}
        aria-label="Week display"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.calIcon}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </button>

      <div className={styles.navGroup}>
        <button
          type="button"
          className={styles.arrowBtn}
          onClick={handlePrevWeek}
          aria-label="Previous week"
        >
          ‹
        </button>
        <span className={styles.label}>{getDisplayRange()}</span>
        <button
          type="button"
          className={styles.arrowBtn}
          onClick={handleNextWeek}
          aria-label="Next week"
        >
          ›
        </button>
      </div>
    </div>
  );
}
export type { WeekSelectorProps };
