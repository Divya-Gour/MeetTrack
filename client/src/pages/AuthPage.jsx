// Auth Page (sign in, demo entry, workspace setup, forgot, reset)
// Matches Stitch design 775fb8220e2e4362b53199707bb6bfe8 (MeetTrack Sign In - Electric Lime Classic)
import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Mail,
  Lock,
  Sparkles,
  Play,
  PlusCircle,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { login, forgotPassword, resetPassword, getErrorMessage } from '../services/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enterDemoMode, enterLiveMode, demoUsers } = useAuth();
  const { showToast } = useToast();

  // Mode: 'signin' | 'forgot' | 'reset' | 'entry'
  const initialMode = searchParams.get('mode') || (searchParams.get('token') ? 'reset' : 'signin');
  const [authMode, setAuthMode] = useState(initialMode);

  // Sign-in form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // Security & Lockout State per Prompt v2
  const [errorMessage, setErrorMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Reset token state
  const resetToken = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCompleted, setResetCompleted] = useState(false);

  // 1. Explore Demo Mode Handler (No sign-up needed)
  const handleExploreDemo = () => {
    enterDemoMode('user-priya');
    showToast({
      title: 'Demo Workspace Loaded',
      description: 'Exploring Engineering Fest 2026 as Priya Nair (Coordinator & Approver).',
      variant: 'info',
    });
    navigate('/dashboard');
  };

  // 2. Sign In Handler
  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isLockedOut) {
      setErrorMessage('Too many failed attempts. Try again in 15 minutes.');
      return;
    }

    if (!email || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    setLoading(true);

    try {
      // First check if it's a demo account sign in (DemoPass@2026)
      const matchingDemoUser = (demoUsers || []).find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matchingDemoUser && password === 'DemoPass@2026') {
        enterDemoMode(matchingDemoUser.id);
        showToast({
          title: `Welcome, ${matchingDemoUser.name}`,
          description: `Signed into Demo Workspace as ${matchingDemoUser.role}.`,
          variant: 'success',
        });
        navigate('/dashboard');
        return;
      }

      // Try Live Backend Login
      const data = await login({ email, password });

      if (data && data.user) {
        enterLiveMode(data.user, data.workspace, data.membership);
        showToast({
          title: `Welcome back, ${data.user.name}`,
          description: `Connected to live workspace: ${data.workspace?.name || 'Workspace'}`,
          variant: 'success',
        });
        navigate('/dashboard');
      }
    } catch (err) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (err.code === 'ACCOUNT_LOCKED' || nextAttempts >= 5) {
        setIsLockedOut(true);
        setErrorMessage(getErrorMessage(err) || 'Too many failed attempts. Try again in 15 minutes.');
      } else {
        // Rule: Same error message for wrong email and wrong password
        setErrorMessage('The email or password is incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Forgot Password Handler
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotEmail) return;

    try {
      await forgotPassword({ email: forgotEmail });
    } catch (e) { }

    // Rule: Always return the same message whether account exists or not
    setForgotSubmitted(true);
  };

  // 4. Reset Password Handler
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      await resetPassword({ token: resetToken, password: newPassword });
      setResetCompleted(true);
    } catch (err) {
      setErrorMessage(getErrorMessage(err) || 'Password reset link is invalid or has expired.');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col justify-between selection:bg-accent selection:text-text-primary">
      {/* ---------------- HEADER BAR ---------------- */}
      <header className="w-full border-b border-border bg-surface/80 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-btn bg-text-primary text-accent flex items-center justify-center font-heading font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
            M
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-text-primary">
            meet<span className="text-text-primary">track</span>
            <span className="text-accent text-2xl leading-none">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <button
            onClick={handleExploreDemo}
            className="text-text-secondary hover:text-text-primary font-medium flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-accent-text fill-accent" />
            <span>Explore Demo</span>
          </button>
          <span className="text-border">|</span>
          <Link to="/" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
            Back to Overview
          </Link>
        </div>
      </header>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl bg-surface border border-border rounded-modal shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Two Main Entry Points / Branding (5 cols) */}
          <div className="lg:col-span-5 bg-surface-muted p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>QUORUM PROTOCOL</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary tracking-tight">
                  Two ways to experience MeetTrack.
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed">
                  Explore a fully populated sample workspace or start fresh with a real team workspace.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {/* Option A: Explore Demo */}
                <button
                  type="button"
                  onClick={handleExploreDemo}
                  className="w-full text-left p-4 rounded-card bg-surface border-2 border-accent hover:border-accent-hover transition-all shadow-sm group active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-accent-text uppercase tracking-wider flex items-center gap-1">
                      <Play className="w-3 h-3 fill-accent" />
                      Option 1: Demo
                    </span>
                    <span className="text-[10px] bg-accent/20 text-accent-text font-bold px-1.5 py-0.5 rounded">
                      Instant Access
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-text transition-colors">
                    Explore the demo with sample Engineering Fest data
                  </h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    7 committee members, 12 action items, 5 decisions, and simulated offline AI assistant. No sign-up.
                  </p>
                </button>

                {/* Option B: Create Workspace */}
                <Link
                  to="/setup"
                  className="w-full block text-left p-4 rounded-card bg-surface border border-border hover:border-text-primary transition-all shadow-xs group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                      <PlusCircle className="w-3 h-3" />
                      Option 2: Live
                    </span>
                    <span className="text-[10px] bg-surface-muted text-text-secondary font-mono px-1.5 py-0.5 rounded">
                      Blank Product
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-text-primary">Create your workspace</h4>
                  <p className="text-[11px] text-text-secondary mt-1">
                    First-run setup wizard. Set admin password, name workspace, and invite team members.
                  </p>
                </Link>
              </div>
            </div>

            <div className="pt-6 border-t border-border mt-6 flex items-center justify-between text-xs text-text-secondary">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>SOC2 Type II Enforced</span>
              </span>
              <span className="font-mono text-[11px]">v2.4.0</span>
            </div>
          </div>

          {/* Right Column: Sign-in / Forgot / Reset Forms (7 cols) */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
            {/* VIEW 1: SIGN IN FORM */}
            {authMode === 'signin' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-text-primary">
                    Sign in to your workspace
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    Enter your authorized credentials or demo password (<code className="font-mono bg-surface-muted px-1.5 py-0.5 rounded text-[11px]">DemoPass@2026</code>).
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-error-bg/30 border border-error/30 rounded-card flex items-start gap-2.5 text-xs text-error animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary" htmlFor="email">
                      Work Email
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="you@company.com or priya.nair@engfest.org"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                      />
                      <Mail className="absolute right-3.5 w-4 h-4 text-text-secondary pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-text-primary" htmlFor="password">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setErrorMessage('');
                        }}
                        className="text-xs text-text-secondary hover:text-text-primary underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                      <input
                        type="checkbox"
                        checked={keepSignedIn}
                        onChange={(e) => setKeepSignedIn(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span>Remember session</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail('priya.nair@engfest.org');
                        setPassword('DemoPass@2026');
                      }}
                      className="text-[11px] font-mono text-accent-text hover:underline"
                    >
                      Fill Demo Credentials
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isLockedOut}
                    className="w-full h-11 rounded-btn bg-text-primary text-bg font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                  <span>Don't have a workspace yet?</span>
                  <Link to="/setup" className="font-semibold text-text-primary hover:underline flex items-center gap-1">
                    <span>Create workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* VIEW 2: FORGOT PASSWORD */}
            {authMode === 'forgot' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-text-primary">
                    Reset your password
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    Enter your email. If an account exists, a secure reset token link valid for 30 minutes will be dispatched.
                  </p>
                </div>

                {forgotSubmitted ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-success-bg/30 border border-success-border rounded-card text-xs text-text-primary space-y-1">
                      <p className="font-bold text-success">Password Reset Dispatched</p>
                      <p className="text-text-secondary leading-relaxed">
                        If an account exists for <strong>{forgotEmail}</strong>, instructions and a single-use reset token have been generated. The link expires in 30 minutes.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setForgotSubmitted(false);
                        }}
                        className="text-xs font-semibold text-text-primary hover:underline"
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-primary" htmlFor="forgotEmail">
                        Work Email
                      </label>
                      <input
                        id="forgotEmail"
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-btn bg-text-primary text-bg font-semibold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="w-full text-center text-xs text-text-secondary hover:text-text-primary pt-2"
                    >
                      Cancel and return to sign in
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* VIEW 3: RESET PASSWORD */}
            {authMode === 'reset' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-text-primary">Set New Password</h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    Choose a strong password with at least 8 characters, 1 number, and 1 symbol.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-error-bg/30 border border-error/30 rounded-card text-xs text-error flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {resetCompleted ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-success-bg/30 border border-success-border rounded-card text-xs text-text-primary">
                      <p className="font-bold text-success">Password Updated Successfully</p>
                      <p className="text-text-secondary mt-1">You can now sign in using your new password.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthMode('signin')}
                      className="w-full h-11 rounded-btn bg-text-primary text-bg font-semibold text-sm hover:opacity-95 transition-all"
                    >
                      Go to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-primary">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-text-primary">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-btn bg-text-primary text-bg font-semibold text-sm hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <span>Update Password</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="w-full py-4 text-center text-xs text-text-secondary border-t border-border">
        <span>MeetTrack Quorum Platform © 2026. Cryptographically sealed meeting operations.</span>
      </footer>
    </div>
  );
}
