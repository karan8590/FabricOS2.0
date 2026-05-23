import React from 'react';
import Input from './Input';

interface DateSelectorProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function DateSelector({ label, error, helperText, ...props }: DateSelectorProps) {
  return (
    <Input
      type="date"
      label={label}
      error={error}
      helperText={helperText}
      {...props}
    />
  );
}
