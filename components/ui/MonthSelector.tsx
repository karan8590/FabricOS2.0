import React, { useState, useRef, useEffect } from 'react';
import styles from './MonthSelector.module.css';

interface MonthSelectorProps {
  value: string; // e.g. "2026-05"
  onChange: (value: string) => void;
  maxDate?: string; // e.g. "2026-05"
}

export default function MonthSelector({ value, onChange, maxDate }: MonthSelectorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const [y] = value.split('-');
    return parseInt(y) || new Date().getFullYear();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDisplayMonthYear = () => {
    const [y, m] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handlePrevMonth = () => {
    const [year, month] = value.split('-');
    let prevYear = parseInt(year);
    let prevMonth = parseInt(month) - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    onChange(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = value.split('-');
    let nextYear = parseInt(year);
    let nextMonth = parseInt(month) + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextVal = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    if (maxDate && nextVal > maxDate) return;
    onChange(nextVal);
  };

  const isNextDisabled = () => {
    if (!maxDate) return false;
    const [year, month] = value.split('-');
    let nextYear = parseInt(year);
    let nextMonth = parseInt(month) + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear += 1;
    }
    const nextVal = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    return nextVal > maxDate;
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <button
        type="button"
        className={styles.calendarIconBtn}
        onClick={() => {
          setViewYear(parseInt(value.split('-')[0]) || new Date().getFullYear());
          setCalendarOpen((prev) => !prev);
        }}
        aria-label="Open month selector"
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
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className={styles.label}>{getDisplayMonthYear()}</span>
        <button
          type="button"
          className={styles.arrowBtn}
          onClick={handleNextMonth}
          disabled={isNextDisabled()}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {calendarOpen && (
        <div className={styles.dropdown}>
          <div className={styles.calHeader}>
            <span className={styles.calTitle}>{viewYear}</span>
            <div className={styles.calNav}>
              <button
                type="button"
                className={styles.calNavBtn}
                onClick={() => setViewYear((p) => p - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className={styles.calNavBtn}
                onClick={() => setViewYear((p) => p + 1)}
                disabled={!!(maxDate && viewYear >= parseInt(maxDate.split('-')[0]))}
              >
                ›
              </button>
            </div>
          </div>
          <div className={styles.monthGrid}>
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mon, index) => {
              const paddedMonth = String(index + 1).padStart(2, '0');
              const valueStr = `${viewYear}-${paddedMonth}`;
              const isSelected = value === valueStr;
              const isDisabled = maxDate && valueStr > maxDate;

              return (
                <button
                  key={mon}
                  type="button"
                  className={`${styles.monthBtn} ${isSelected ? styles.monthActive : ''}`}
                  disabled={!!isDisabled}
                  onClick={() => {
                    onChange(valueStr);
                    setCalendarOpen(false);
                  }}
                >
                  {mon}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export type { MonthSelectorProps };
