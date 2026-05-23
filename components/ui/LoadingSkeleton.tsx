import React from 'react';
import Skeleton from './Skeleton';
import styles from './Skeleton.module.css';

interface LoadingSkeletonProps {
  variant?: 'table' | 'cards' | 'form' | 'text';
  rows?: number;
  columns?: number;
}

export default function LoadingSkeleton({
  variant = 'text',
  rows = 3,
  columns = 4,
}: LoadingSkeletonProps) {
  if (variant === 'table') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} variant="title" width={`${100 / columns}%`} height={16} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px', padding: '8px 0' }}>
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} variant="text" width={`${100 / columns}%`} height={14} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ padding: '20px', border: '1px solid var(--border-primary)', borderRadius: '12px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton variant="title" width="40%" height={16} />
            <Skeleton variant="text" width="80%" height={12} />
            <Skeleton variant="text" width="60%" height={12} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton variant="text" width="120px" height={14} />
            <Skeleton variant="rectangle" width="100%" height={40} className={styles.roundedInput} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="text" width={i === rows - 1 ? '60%' : '100%'} height={14} />
      ))}
    </div>
  );
}
export type { LoadingSkeletonProps };
