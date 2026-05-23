import React from 'react';
import styles from './FormSection.module.css';

interface FormSectionProps {
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}

export default function FormSection({
  title,
  description,
  columns = 1,
  children,
}: FormSectionProps) {
  const gridClass = styles[`grid-${columns}`] || styles['grid-1'];

  return (
    <div className={styles.section}>
      {(title || description) && (
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      <div className={`${styles.grid} ${gridClass}`}>{children}</div>
    </div>
  );
}
export type { FormSectionProps };
