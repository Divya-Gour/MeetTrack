// src/components/Button.jsx
import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg' | 'icon'
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none btn-press';

  const variantClasses = {
    primary:
      'bg-accent text-accent-text hover:bg-accent-hover shadow-sm font-semibold active:scale-[0.98]',
    secondary:
      'bg-surface-muted hover:bg-surface-hover text-text-primary border border-border',
    outline:
      'bg-transparent hover:bg-surface-muted text-text-primary border border-border hover:border-text-secondary',
    ghost:
      'bg-transparent hover:bg-surface-muted text-text-secondary hover:text-text-primary',
    danger:
      'bg-error-bg text-error hover:bg-error/20 border border-error-border font-semibold',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs rounded-btn gap-1.5',
    md: 'h-10 px-4 text-sm rounded-btn gap-2',
    lg: 'h-11 px-5 text-[15px] rounded-btn gap-2.5 font-semibold',
    icon: 'h-9 w-9 p-0 rounded-btn',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

