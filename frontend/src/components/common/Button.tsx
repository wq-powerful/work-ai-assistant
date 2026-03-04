import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:
      'gradient-orange text-white hover:shadow-lg hover:shadow-orange-500/25 focus:ring-brand-orange',
    secondary:
      'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] focus:ring-brand-blue',
    danger:
      'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] focus:ring-brand-blue',
  };

  const sizes: Record<string, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
