// Stitch fallback frame: 403 Forbidden Access
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Forbidden403({ requiredRoles = [], userRole = 'Participant' }) {
  const { switchDemoRole } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-lg w-full bg-surface border border-border rounded-modal p-8 text-center shadow-card relative overflow-hidden">
        {/* Top Warning Badge */}
        <div className="w-16 h-16 rounded-full bg-error-bg border border-error-border mx-auto flex items-center justify-center text-error mb-5">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-muted text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-3">
          HTTP 403 • ACCESS FORBIDDEN
        </div>

        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary mb-3">
          Restricted Governance Scope
        </h1>

        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Your current account role is{' '}
          <strong className="text-text-primary font-semibold underline decoration-accent decoration-2">
            {userRole}
          </strong>
          . This section requires{' '}
          <span className="font-semibold text-text-primary">
            {requiredRoles.join(' or ') || 'Admin'}
          </span>{' '}
          clearance according to your organization's quorum protocol.
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-border">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-btn bg-surface-muted hover:bg-surface-hover text-text-primary font-medium text-sm transition-colors border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          {/* Quick Demo Switcher if Admin is required */}
          <button
            onClick={() => switchDemoRole('Admin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-btn bg-accent text-accent-text hover:bg-accent-hover font-semibold text-sm transition-all shadow-sm btn-press"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Switch to Admin (Demo)</span>
          </button>
        </div>

        <p className="mt-6 text-xs text-text-secondary">
          Audit Reference: SEC-AUTH-403 • Access attempt recorded on tamper-evident log.
        </p>
      </div>
    </div>
  );
}

