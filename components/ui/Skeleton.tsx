import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    variant?: 'text' | 'title' | 'circle' | 'rectangle';
    width?: string | number;
    height?: string | number;
    className?: string;
}

export default function Skeleton({
    variant = 'text',
    width,
    height,
    className = '',
}: SkeletonProps) {
    const classes = [styles.skeleton, styles[variant], className]
        .filter(Boolean)
        .join(' ');

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return <div className={classes} style={style} />;
}
