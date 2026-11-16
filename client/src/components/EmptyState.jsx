// src/components/EmptyState.jsx
import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no active items in this category currently.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-border rounded-card bg-surface-muted/40 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-text-secondary mb-4 border border-border">
        <Icon className="w-6 h-6 stroke-[1.8]" />
      </div>
      <h3 className="font-heading font-semibold text-base sm:text-lg text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" icon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

