// Stitch fallback frame: 404 Not Found
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound404() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-surface border border-border rounded-modal p-8 text-center shadow-card">
        <div className="w-16 h-16 rounded-full bg-accent-tint border border-border mx-auto flex items-center justify-center text-text-primary mb-5">
          <Compass className="w-8 h-8 stroke-[2]" />
        </div>

        <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-muted text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider mb-3">
          HTTP 404 • UNKNOWN PATH
        </div>

        <h1 className="font-heading font-bold text-3xl text-text-primary mb-2">
          Page Not Found
        </h1>

        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          The meeting ledger, minutes version, or resource you requested does not exist or has been archived.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-btn bg-accent text-accent-text hover:bg-accent-hover font-semibold text-sm transition-all shadow-sm btn-press"
          >
            <Home className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-btn bg-surface-muted hover:bg-surface-hover text-text-primary font-medium text-sm transition-colors border border-border"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}

