import React from 'react';
import Button from './Button';

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export default function SecondaryButton({ children, ...props }: SecondaryButtonProps) {
  return (
    <Button variant="secondary" {...props}>
      {children}
    </Button>
  );
}
