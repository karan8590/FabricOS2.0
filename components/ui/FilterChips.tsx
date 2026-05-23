import React from 'react';
import styles from './FilterChips.module.css';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
}

export default function FilterChips({ options, selectedValue, onChange }: FilterChipsProps) {
  return (
    <div className={styles.container}>
      {options.map((opt) => {
        const isActive = selectedValue === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.chip} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
export type { FilterChipsProps, FilterOption };
