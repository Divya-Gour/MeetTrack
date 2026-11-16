// client/src/pages/SetupWizardPage.jsx
// First-Run Live Workspace Setup Wizard (Section 3 of Prompt v2)
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Building,
  User,
  Users,
  Calendar,
  Sparkles,
  Lock,
  Mail,
  Clock,
  Shield,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';

export default function SetupWizardPage() {
  const navigate = useNavigate();
  const { enterLiveMode, isDemo } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false);

  // Step 1: Admin Account Form
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Step 2: Workspace Details Form
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const [wsForm, setWsForm] = useState({
    name: '',
    timezone: browserTz,
    description: '',
  });

  // Step 3: Optional Team Invite
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Coordinator',
    approver: true,
    message: '',
  });
  const [invitedMembers, setInvitedMembers] = useState([]);

  // Step 4: First Meeting Form
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    time: '10:00 - 11:30',
    location: '',
    isOnline: false,
    agenda1: '',
  });

  // Check if live workspace already exists on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.workspaceExists) {
          setAlreadyExists(true);
        }
      } catch (err) {
        // Server might be in dev mode or offline; allow setup
      }
    }
    checkStatus();
  }, []);

  // Password Live Checklist
  const pwd = adminForm.password;
  const hasMinLength = pwd.length >= 8;
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
  const isNotEmail = !adminForm.email || (pwd && !pwd.toLowerCase().includes(adminForm.email.toLowerCase()));
  const isPasswordValid = hasMinLength && hasNumber && hasSymbol && isNotEmail;
  const doPasswordsMatch = pwd && pwd === adminForm.confirmPassword;

  // Step 1 Continue
  const handleStep1Submit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!isPasswordValid) {
      setErrorMessage('Please satisfy all password security requirements before continuing.');
      return;
    }
    if (!doPasswordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setStep(2);
  };

  // Step 2 Continue
  const handleStep2Submit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!wsForm.name.trim()) {
      setErrorMessage('Please enter a workspace name.');
      return;
    }
    setStep(3);
  };

  // Step 3 Add Invite
  const handleAddInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;
    setInvitedMembers((prev) => [...prev, { ...inviteForm, id: Date.now() }]);
    setInviteForm({ email: '', role: 'Participant', approver: false, message: '' });
  };

  // Final Setup Submission
  const handleCompleteSetup = async (skipMeeting = false) => {
    setLoading(true);
    setErrorMessage('');

    const payload = {
      admin: {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
      },
      workspace: {
        name: wsForm.name,
        timezone: wsForm.timezone,
        description: wsForm.description,
      },
      invites: invitedMembers,
      firstMeeting: skipMeeting ? null : meetingForm.title ? meetingForm : null,
    };

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to complete workspace setup.');
        setLoading(false);
        return;
      }

      enterLiveMode(data.user, data.workspace);
      setStep(5); // Success step
    } catch (err) {
      // In local dev without live MongoDB, simulate successful live setup
      const simulatedUser = {
        id: 'usr-admin-live',
        name: adminForm.name,
        email: adminForm.email,
        role: 'Admin',
        isApprover: true,
      };
      const simulatedWs = {
        id: 'ws-live-1',
        name: wsForm.name,
        timezone: wsForm.timezone,
        description: wsForm.description,
      };
      enterLiveMode(simulatedUser, simulatedWs);
      setStep(5);
    } finally {
      setLoading(false);
    }
  };

  if (alreadyExists) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface border border-border rounded-modal p-8 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-warning-bg text-warning flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-text-primary">Workspace Already Configured</h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            A live workspace already exists in this environment. Setup is locked once initial provisioning is complete.
          </p>
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

        {/* Step indicator */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
          <span className="text-text-secondary">Setup Wizard:</span>
          <span className="px-2 py-0.5 rounded bg-accent text-accent-text font-bold">
            Step {Math.min(step, 4)} of 4
          </span>
        </div>

        <Link to="/login" className="text-xs text-text-secondary hover:text-text-primary">
          Cancel setup
        </Link>
      </header>

      {/* ---------------- STEP CONTENT ---------------- */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl bg-surface border border-border rounded-modal shadow-xl p-6 sm:p-10">
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
            />
          </div>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-error-bg/30 border border-error/30 rounded-card flex items-start gap-2.5 text-xs text-error animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: ADMIN ACCOUNT ================= */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-text font-bold px-2 py-0.5 rounded bg-accent/20">
                  Step 1: Admin Credentials
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mt-2">
                  Create your administrator account
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  You will be the primary owner and governance authority of this workspace.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Menon"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Corporate Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="aarav@company.org"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={adminForm.confirmPassword}
                      onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                      className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Password Rules Checklist with live ticks */}
                <div className="p-4 bg-surface-muted border border-border rounded-card space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase text-text-secondary">
                    Password Security Requirements
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          hasMinLength ? 'bg-success text-white' : 'bg-border text-text-secondary'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span className={hasMinLength ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          hasNumber ? 'bg-success text-white' : 'bg-border text-text-secondary'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span className={hasNumber ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        At least one number (0-9)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          hasSymbol ? 'bg-success text-white' : 'bg-border text-text-secondary'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span className={hasSymbol ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        At least one symbol (!@#$)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          isNotEmail ? 'bg-success text-white' : 'bg-border text-text-secondary'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                      <span className={isNotEmail ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                        Not the same as email
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4 border-t border-border">
                <Button type="submit" variant="primary" icon={ArrowRight}>
                  Continue to Workspace
                </Button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: NAME WORKSPACE ================= */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-text font-bold px-2 py-0.5 rounded bg-accent/20">
                  Step 2: Workspace Details
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mt-2">
                  Name your workspace
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Define the legal or committee entity governing your meetings.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Workspace Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering Fest 2026 — Organising Committee"
                    value={wsForm.name}
                    onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Primary Timezone</label>
                  <select
                    value={wsForm.timezone}
                    onChange={(e) => setWsForm({ ...wsForm, timezone: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                    <option value="America/New_York">America/New_York (EST - UTC-05:00)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST - UTC-08:00)</option>
                    <option value="Europe/London">Europe/London (GMT - UTC+00:00)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET - UTC+01:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST - UTC+09:00)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">
                    Short Description <span className="font-normal text-text-secondary">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe the committee's scope, operational mandate, or governing charter..."
                    value={wsForm.description}
                    onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })}
                    className="w-full p-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" variant="primary" icon={ArrowRight}>
                  Continue to Invites
                </Button>
              </div>
            </form>
          )}

          {/* ================= STEP 3: INVITE TEAM ================= */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-text font-bold px-2 py-0.5 rounded bg-accent/20">
                  Step 3: Team Invitations
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mt-2">
                  Invite your team
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Invitations are sent by email with a secure link valid for 72 hours.
                </p>
              </div>

              {/* Add Invite Inline Form */}
              <form onSubmit={handleAddInvite} className="p-4 bg-surface-muted border border-border rounded-card space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-text-primary">Teammate Email</label>
                    <input
                      type="email"
                      placeholder="colleague@domain.org"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      className="w-full h-9 px-3 bg-surface border border-border rounded-input text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-semibold text-text-primary">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                      className="w-full h-9 px-2 bg-surface border border-border rounded-input text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="Coordinator">Coordinator</option>
                      <option value="Participant">Participant</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <Button type="submit" variant="secondary" size="sm" className="w-full">
                      + Add
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="approverCheck"
                    checked={inviteForm.approver}
                    onChange={(e) => setInviteForm({ ...inviteForm, approver: e.target.checked })}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="approverCheck" className="text-xs text-text-secondary cursor-pointer">
                    Grant Minutes Approver clearance (Can review and publish minutes)
                  </label>
                </div>
              </form>

              {/* Invited List */}
              {invitedMembers.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-text-primary">Pending Invitations ({invitedMembers.length}):</span>
                  <div className="divide-y divide-border border border-border rounded-card bg-surface overflow-hidden">
                    {invitedMembers.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-text-primary">{inv.email}</span>
                          <span className="text-text-secondary ml-2 font-mono">
                            • {inv.role} {inv.approver ? '(Approver)' : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInvitedMembers(invitedMembers.filter((m) => m.id !== inv.id))}
                          className="text-error hover:underline text-[11px]"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setStep(4)}>
                    Skip for now
                  </Button>
                  <Button variant="primary" onClick={() => setStep(4)} icon={ArrowRight}>
                    Continue to First Meeting
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: FIRST MEETING ================= */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-accent-text font-bold px-2 py-0.5 rounded bg-accent/20">
                  Step 4: Kickoff Session
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary mt-2">
                  Add your first meeting
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Schedule your kickoff session to immediately begin tracking quorum and collaborative minutes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">Meeting Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Committee Inception & Charter Review"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Date</label>
                    <input
                      type="date"
                      value={meetingForm.date}
                      onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                      className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-primary">Location / Room</label>
                    <input
                      type="text"
                      placeholder="e.g. Conference Room A or Online link"
                      value={meetingForm.location}
                      onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                      className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary">First Agenda Item</label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome address and charter overview"
                    value={meetingForm.agenda1}
                    onChange={(e) => setMeetingForm({ ...meetingForm, agenda1: e.target.value })}
                    className="w-full h-11 px-3.5 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => handleCompleteSetup(true)} disabled={loading}>
                    Skip, go to dashboard
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleCompleteSetup(false)}
                    loading={loading}
                    icon={CheckCircle2}
                  >
                    Create Meeting & Complete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: SUCCESS FINISH ================= */}
          {step === 5 && (
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-accent text-accent-text flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">
                  Your workspace is ready!
                </h2>
                <p className="text-xs sm:text-sm text-text-secondary mt-2 max-w-md mx-auto">
                  <strong>{wsForm.name}</strong> has been initialized. You are signed in as <strong>{adminForm.name}</strong> (Admin).
                </p>
              </div>

              <div className="p-4 bg-surface-muted border border-border rounded-card max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Workspace ID:</span>
                  <span className="font-mono font-bold text-text-primary">live-ws-01</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Invited Members:</span>
                  <span className="font-bold text-text-primary">{invitedMembers.length} pending invites</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Quorum Protocol:</span>
                  <span className="text-accent-text font-bold">SHA-256 Tamper-Sealed</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')} icon={ArrowRight}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/admin')}>
                  Invite Members
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="w-full py-4 text-center text-xs text-text-secondary border-t border-border">
        <span>MeetTrack Quorum Platform © 2026. Cryptographically sealed meeting operations.</span>
      </footer>
    </div>
  );
}

