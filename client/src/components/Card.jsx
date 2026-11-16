// src/components/Card.jsx
import React from 'react';

export default function Card({
  children,
  hover = false,
  className = '',
  padding = 'p-5 sm:p-6',
  ...props
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-card shadow-card ${
        hover ? 'card-hover cursor-pointer' : ''
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

