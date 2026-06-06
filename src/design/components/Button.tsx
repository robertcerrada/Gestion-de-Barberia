import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

export type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const hover = () => {
      gsap.to(el, { scale: 0.97, duration: 0.12, ease: 'power1.out' });
    };
    const leave = () => {
      gsap.to(el, { scale: 1, duration: 0.12, ease: 'power1.out' });
    };
    el.addEventListener('pointerenter', hover);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', hover);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  const base = 'rounded px-4 py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90 disabled:opacity-50',
    ghost: 'bg-transparent border border-primary text-primary hover:bg-primary/10 disabled:opacity-50',
    danger: 'bg-danger text-white hover:bg-danger/90 disabled:opacity-50',
  };

  return (
    <button
      ref={btnRef}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
