// src/components/Skeleton.jsx
import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-surface-muted animate-pulse-subtle rounded-btn ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }) {
  return (
    <div className="w-full space-y-3">
      <div className="h-10 bg-surface-muted rounded-btn w-full animate-pulse-subtle" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-4 border-b border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-4 bg-surface-muted rounded-btn animate-pulse-subtle ${
                c === 0 ? 'w-2/5' : 'w-1/5'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="p-5 bg-surface border border-border rounded-card space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

