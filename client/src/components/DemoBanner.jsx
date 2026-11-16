// client/src/components/DemoBanner.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RotateCcw, PlusCircle, AlertTriangle, Sparkles, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';
import Modal from './Modal';
import Button from './Button';

export default function DemoBanner() {
  const { isDemo, resetDemoData, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [livePromptOpen, setLivePromptOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Live mode NEVER renders this banner per specification
  if (!isDemo) return null;

  const handleConfirmReset = () => {
    setResetting(true);
    setTimeout(() => {
      resetDemoData();
      setResetting(false);
      setResetModalOpen(false);
      showToast({
        title: 'Demo Data Restored',
        description: 'Engineering Fest 2026 sample data has been reset to its pristine state.',
        variant: 'success',
      });
      // Trigger page reload or view refresh
      window.location.reload();
    }, 350);
  };

  const handleSwitchToLive = () => {
    logout();
    setLivePromptOpen(false);
    navigate('/setup');
  };

  return (
    <>
      {/* ---------------- PERSISTENT DEMO BANNER ---------------- */}
      <aside
        aria-label="Demo mode notice"
        className="w-full bg-accent text-accent-text border-b border-accent-hover py-2 px-4 shadow-sm z-50 select-none flex items-center justify-between transition-all"
      >
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-text-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-text-primary" />
            </span>
            <span className="leading-snug">
              <strong>Demo Mode:</strong> You're exploring the demo. Changes stay in your browser and can be reset.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setResetModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-text/10 hover:bg-accent-text/20 text-accent-text text-xs font-semibold transition-all active:scale-95 border border-accent-text/15"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset demo data</span>
            </button>

            <button
              onClick={() => setLivePromptOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-text-primary text-bg hover:opacity-90 text-xs font-bold transition-all active:scale-95 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-accent" />
              <span>Create your workspace</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- RESET DEMO CONFIRMATION MODAL ---------------- */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Data"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-warning-bg/40 border border-warning-border rounded-card text-xs text-text-primary">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-text-primary">Restore Engineering Fest 2026 Sample Records?</p>
              <p className="text-text-secondary leading-relaxed">
                This will overwrite any edits you made during this demo session (minutes drafts, attendance marks, newly logged actions) and restore the default 7 committee meetings, 12 action items, and 5 decisions.
              </p>
            </div>
          </div>

          <p className="text-xs text-text-secondary">
            Your browser's local cache (<code className="font-mono bg-surface-muted px-1.5 py-0.5 rounded">mt.demo.v1</code>) will be re-initialized.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setResetModalOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReset} loading={resetting} icon={RotateCcw}>
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---------------- SWITCH TO LIVE WORKSPACE MODAL ---------------- */}
      <Modal
        isOpen={livePromptOpen}
        onClose={() => setLivePromptOpen(false)}
        title="Create Your Live Workspace"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            You are currently in <strong>Demo Mode</strong>. To create a real workspace, you must exit demo mode.
          </p>
          <div className="p-3 bg-surface-muted border border-border rounded-card text-xs text-text-secondary leading-relaxed">
            <strong>Important:</strong> Switching to live mode gives you a fresh, blank workspace. Demo records (Engineering Fest) will not be copied over.
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button variant="ghost" onClick={() => setLivePromptOpen(false)}>
              Stay in Demo
            </Button>
            <Button variant="primary" onClick={handleSwitchToLive}>
              Continue to Setup
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

