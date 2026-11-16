// src/components/Pill.jsx
// Spec: "Status pills always show an icon and a text label."
import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Send,
  Eye,
  Lock,
  Flame,
  Check,
} from 'lucide-react';

export default function Pill({
  status = 'default',
  icon: CustomIcon,
  label,
  size = 'md',
  className = '',
}) {
  const norm = String(status).toLowerCase();

  let colorClasses = 'bg-surface-muted text-text-secondary border-border';
  let DefaultIcon = Clock;

  if (norm.includes('completed') || norm.includes('approved') || norm.includes('verified') || norm.includes('adopted')) {
    colorClasses = 'bg-success-bg text-success border-success-border font-medium';
    DefaultIcon = CheckCircle2;
  } else if (norm.includes('published') || norm.includes('sealed')) {
    colorClasses = 'bg-accent-tint text-text-primary border-accent font-semibold';
    DefaultIcon = Lock;
  } else if (norm.includes('urgent') || norm.includes('error') || norm.includes('blocked') || norm.includes('overdue')) {
    colorClasses = 'bg-error-bg text-error border-error-border font-bold';
    DefaultIcon = norm.includes('blocked') ? AlertTriangle : Flame;
  } else if (norm.includes('high')) {
    colorClasses = 'bg-warning-bg text-warning border-warning-border font-semibold';
    DefaultIcon = AlertTriangle;
  } else if (norm.includes('in progress') || norm.includes('submitted') || norm.includes('review')) {
    colorClasses = 'bg-info-bg text-info border-info-border font-medium';
    DefaultIcon = Eye;
  } else if (norm.includes('draft')) {
    colorClasses = 'bg-surface-muted text-text-secondary border-border';
    DefaultIcon = FileText;
  } else if (norm.includes('returned')) {
    colorClasses = 'bg-warning-bg text-warning border-warning-border';
    DefaultIcon = XCircle;
  }

  const IconComponent = CustomIcon || DefaultIcon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : size === 'lg'
      ? 'px-3 py-1 text-sm gap-1.5'
      : 'px-2.5 py-0.5 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorClasses} ${sizeClasses} select-none transition-colors ${className}`}
    >
      <IconComponent className={size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} />
      <span className="truncate">{label || status}</span>
    </span>
  );
}

