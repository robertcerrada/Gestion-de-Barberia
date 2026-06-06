import React from 'react';

export type CardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'gold';
  className?: string;
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const base = 'rounded p-4 shadow-sm border';
  const variants: Record<string, string> = {
    default: 'bg-surface border border-border',
    gold: 'bg-surface border border-primary bg-gradient-to-br from-primary/5 to-transparent',
  };
  return (
    <div className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
