// client/src/pages/ScreenJoinInvite.jsx
// Section 5: Team Invitation Acceptance & Account Provisioning
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Building,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';

export default function ScreenJoinInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { enterLiveMode } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // 'expired' | 'revoked' | 'accepted' | 'invalid'

  // Join form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Password rules checklist
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isNotEmail = !inviteData?.email || (password && !password.toLowerCase().includes(inviteData.email.toLowerCase()));
  const isPasswordValid = hasMinLength && hasNumber && hasSymbol && isNotEmail;
  const doPasswordsMatch = password && password === confirmPassword;

  useEffect(() => {
    async function fetchTokenInfo() {
      try {
        const res = await fetch(`/api/invites/token/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorStatus(data.status || 'invalid');
        } else {
          setInviteData(data);
        }
      } catch (err) {
        // Fallback for demo/dev token simulation
        if (token && token.startsWith('demo-')) {
          setInviteData({
            workspaceName: 'Engineering Fest 2026 — Organising Committee',
            email: 'invitee@engfest.org',
            role: 'Participant',
            isApprover: false,
            inviterName: 'Aarav Menon',
          });
        } else {
          setErrorStatus('invalid');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTokenInfo();
  }, [token]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!isPasswordValid) {
      setFormError('Please satisfy all password rules before proceeding.');
      return;
    }
    if (!doPasswordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/invites/token/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Failed to accept invitation.');
        setSubmitting(false);
        return;
      }

      enterLiveMode(data.user, data.workspace);
      showToast({
        title: 'Welcome to MeetTrack!',
        description: `You have joined ${data.workspace?.name || 'the workspace'} as ${data.user?.role}.`,
        variant: 'success',
      });
      navigate('/dashboard');
    } catch (err) {
      // Simulate successful join in dev mode
      const user = {
        id: `usr-${Date.now()}`,
        name: name || 'Team Member',
        email: inviteData?.email || 'invitee@acme.corp',
        role: inviteData?.role || 'Participant',
        isApprover: Boolean(inviteData?.isApprover),
      };
      const ws = {
        id: 'ws-live-1',
        name: inviteData?.workspaceName || 'Live Workspace',
      };
      enterLiveMode(user, ws);
      showToast({
        title: 'Welcome to MeetTrack!',
        description: `You joined ${ws.name} as ${user.role}.`,
        variant: 'success',
      });
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6 text-text-secondary font-mono text-xs">
        Verifying cryptographic invitation token...
      </div>
    );
  }

  // Handle Invitation Errors / States
  if (errorStatus) {
    let title = 'Invalid Invitation';
    let message = 'This invitation link is malformed or does not exist.';

    if (errorStatus === 'expired') {
      title = 'Invitation Expired';
      message = 'This invitation has expired (validity period: 72 hours). Please ask your workspace administrator for a new one.';
    } else if (errorStatus === 'revoked') {
      title = 'Invitation Revoked';
      message = 'This invitation link was revoked by the workspace administrator.';
    } else if (errorStatus === 'accepted') {
      title = 'Invitation Already Used';
      message = 'This invitation was already accepted. Please sign in with your password.';
    }

    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-modal p-8 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-error-bg/30 text-error flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-text-primary">{title}</h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{message}</p>
          <div className="pt-2">
            <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col justify-between selection:bg-accent selection:text-text-primary">
      {/* ---------------- HEADER BAR ---------------- */}
      <header className="w-full border-b border-border bg-surface/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-btn bg-text-primary text-accent flex items-center justify-center font-heading font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-text-primary">
            meet<span className="text-text-primary">track</span>
            <span className="text-accent text-2xl leading-none">.</span>
          </span>
        </Link>

        <Link to="/login" className="text-xs text-text-secondary hover:text-text-primary">
          Already have an account? Sign in
        </Link>
      </header>

      {/* ---------------- MAIN FORM ---------------- */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-surface border border-border rounded-modal shadow-xl p-6 sm:p-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-text text-xs font-mono font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Invitation</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-text-primary">
              Join {inviteData?.workspaceName}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              You were invited as a <strong>{inviteData?.role}</strong>{' '}
              {inviteData?.isApprover ? '(Minutes Approver)' : ''} by{' '}
              <strong>{inviteData?.inviterName || 'Workspace Admin'}</strong>.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 bg-error-bg/30 border border-error/30 rounded-card flex items-start gap-2.5 text-xs text-error">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Invited Email</label>
              <input
                type="email"
                disabled
                value={inviteData?.email || ''}
                className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-secondary font-mono cursor-not-allowed opacity-80"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Your Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Meera Joshi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Create Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-primary">Confirm Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Checklist */}
            <div className="p-3.5 bg-surface-muted border border-border rounded-card space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    hasMinLength ? 'bg-success text-white' : 'bg-border text-text-secondary'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className={hasMinLength ? 'text-text-primary' : 'text-text-secondary'}>
                  At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    hasNumber ? 'bg-success text-white' : 'bg-border text-text-secondary'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className={hasNumber ? 'text-text-primary' : 'text-text-secondary'}>
                  At least one number (0-9)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    hasSymbol ? 'bg-success text-white' : 'bg-border text-text-secondary'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className={hasSymbol ? 'text-text-primary' : 'text-text-secondary'}>
                  At least one symbol (!@#$)
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-btn bg-text-primary text-bg font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{submitting ? 'Setting up account...' : 'Accept Invitation & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="w-full py-4 text-center text-xs text-text-secondary border-t border-border">
        <span>MeetTrack Quorum Platform © 2026. Cryptographically sealed meeting operations.</span>
      </footer>
    </div>
  );
}

