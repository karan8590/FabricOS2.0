'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
    value: number;
    format?: 'currency' | 'percentage' | 'number';
    prefix?: string;
    suffix?: string;
    duration?: number;
    className?: string;
    style?: React.CSSProperties;
}

export default function AnimatedNumber({
    value,
    format = 'number',
    prefix = '',
    suffix = '',
    duration = 800,
    className,
    style
}: AnimatedNumberProps) {
    const [isMounted, setIsMounted] = useState(false);
    
    // We use a spring for smooth, physics-based animation
    const springValue = useSpring(value, {
        stiffness: 100,
        damping: 30,
        mass: 1,
        restDelta: 0.001
    });

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            springValue.set(value);
        }
    }, [value, isMounted, springValue]);

    // Transform the raw numeric value into a formatted string
    const displayValue = useTransform(springValue, (current) => {
        if (format === 'currency') {
            return `${prefix}${new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(Math.round(current)).replace('₹', '')}${suffix}`;
        }
        
        if (format === 'percentage') {
            return `${prefix}${Math.round(current)}${suffix}`;
        }

        return `${prefix}${new Intl.NumberFormat('en-IN').format(Math.round(current))}${suffix}`;
    });

    // To prevent hydration mismatch, render raw value on server/initial render
    if (!isMounted) {
        let initialDisplay = value.toString();
        if (format === 'currency') {
            initialDisplay = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value).replace('₹', '');
        } else if (format === 'number') {
            initialDisplay = new Intl.NumberFormat('en-IN').format(value);
        }
        return <span className={className} style={style}>{prefix}{initialDisplay}{suffix}</span>;
    }

    return (
        <motion.span className={className} style={style}>
            {displayValue}
        </motion.span>
    );
}
