// Stitch screen 14: Profile and settings (477e6319d2c34d7ca31f7471508be89d)
import React, { useState } from 'react';
import {
  User,
  Shield,
  Building,
  Bell,
  Palette,
  Laptop,
  Smartphone,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronRight,
  LogOut,
  Save,
  Trash2,
  Sliders,
  Send,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../app/theme';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Pill from '../components/Pill';

export default function ProfilePage() {
  const { currentUser, switchDemoRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');

  // Form State
  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Divya S.',
    email: currentUser?.email || 'divya.s@acme.corp',
    jobTitle: 'Operations & Governance Lead (DRI Coordinator)',
    department: 'Engineering & Governance',
    timezone: 'UTC+05:30 (India Standard Time)',
  });

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState({
    emailDigest: true,
    quorumAlerts: true,
    slaEscalations: true,
    decisionBroadcasts: false,
    mobilePush: true,
  });

  // Active Sessions State
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      device: 'MacBook Pro 16" (macOS Sonoma)',
      browser: 'Chrome 124.0',
      location: 'Bengaluru, India (103.22.180.4)',
      current: true,
      lastActive: 'Active now',
      icon: Laptop,
    },
    {
      id: 'sess-2',
      device: 'iPhone 15 Pro (iOS 17.5)',
      browser: 'MeetTrack Mobile App',
      location: 'Bengaluru, India (103.22.180.4)',
      current: false,
      lastActive: '22 minutes ago',
      icon: Smartphone,
    },
    {
      id: 'sess-3',
      device: 'Dell XPS 15 (Windows 11)',
      browser: 'Firefox 125.0',
      location: 'San Francisco, USA (192.88.99.12)',
      current: false,
      lastActive: '3 days ago',
      icon: Laptop,
    },
  ]);

  // UI / Modal States
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [formErrorSimulated, setFormErrorSimulated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('10:44 AM');

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();

    if (formErrorSimulated) {
      addToast({
        title: 'Validation Error',
        description: 'Job title exceeds designated operational character length (max 50).',
        variant: 'error',
      });
      return;
    }

    setSaving(true);
    // Simulate API update
    setTimeout(() => {
      setSaving(false);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSaved(timeStr);
      addToast({
        title: 'Profile Updated',
        description: `Changes saved to your workspace identity at ${timeStr}.`,
        variant: 'success',
      });
    }, 400);
  };

  const handleRevokeOtherSessions = () => {
    setSessions((prev) => prev.filter((s) => s.current));
    setRevokeModalOpen(false);
    addToast({
      title: 'Sessions Terminated',
      description: 'All secondary sessions and tokens have been revoked.',
      variant: 'success',
    });
  };

  const navTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security & 2FA', icon: Shield, dot: true },
    { id: 'account', label: 'Account & Workspace', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: '5' },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'sessions', label: 'Active Sessions', icon: Laptop, badge: `${sessions.length} Live` },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* ---------------- HEADER CONTEXT ---------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-accent-text font-bold px-2 py-0.5 rounded-full bg-accent/20">
              DRI Settings Suite
            </span>
            <span className="text-text-secondary">•</span>
            <span className="text-xs text-text-secondary font-mono">Node ID: US-EAST-09</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-text-primary tracking-tight">
            Profile & Settings
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Manage your personal credentials, workspace security, notifications, and active session tokens.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 px-4 py-2 bg-surface-muted rounded-xl border border-border self-start md:self-auto shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[11px] text-text-secondary font-mono leading-none">Authenticated as</span>
            <span className="text-xs font-semibold text-text-primary">
              {currentUser?.name || formData.name}{' '}
              <span className="font-normal text-text-secondary">({currentUser?.email || formData.email})</span>
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- MAIN TWO-COLUMN LAYOUT ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sticky Nav Rail */}
        <div className="lg:col-span-4 flex flex-col space-y-4 lg:sticky lg:top-24">
          <div className="bg-surface border border-border rounded-card p-1.5 shadow-sm space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-btn text-left text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent text-accent-text font-semibold shadow-sm'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {tab.badge && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                          isActive
                            ? 'bg-accent-text/15 text-accent-text'
                            : 'bg-surface-muted text-text-secondary'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                    {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* State Sandbox & Simulator Card */}
          <div className="bg-surface border border-border rounded-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono font-bold text-text-secondary">State Sandbox</span>
              <Sliders className="w-3.5 h-3.5 text-text-secondary" />
            </div>
            <p className="text-xs text-text-secondary">
              Toggle edge states to inspect validation and auto-save pulse behavior:
            </p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setFormErrorSimulated(!formErrorSimulated)}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-muted hover:bg-border/60 rounded-btn text-xs font-medium text-text-primary transition-colors text-left"
              >
                <span>Simulate Form Error</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    formErrorSimulated ? 'bg-error animate-pulse' : 'bg-text-secondary/30'
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleSaveProfile}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface-muted hover:bg-border/60 rounded-btn text-xs font-medium text-text-primary transition-colors text-left"
              >
                <span>Emit Auto-Save Pulse</span>
                <Send className="w-3.5 h-3.5 text-accent-text" />
              </button>
            </div>
          </div>

          {/* SOC2 Enforced Card */}
          <div className="p-4 bg-surface-muted border border-border rounded-card space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Shield className="w-3.5 h-3.5 text-accent-text" />
              <span>SOC2 Type II Enforced</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Credentials are tied to Acme SSO. In accordance with enterprise governance, token auto-refreshes every 24 hours.
            </p>
          </div>
        </div>

        {/* Right Primary Panel */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'profile' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">
                    Personal Information
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Update your public profile details, role moniker, and workspace avatar.
                  </p>
                </div>
                <Pill status="success" label="DRI Primary" />
              </div>

              {/* Avatar Area */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-accent p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden font-display font-bold text-lg text-text-primary">
                      {formData.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-text" />
                  </div>
                </div>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Camera}
                      onClick={() =>
                        addToast({
                          title: 'Photo Upload',
                          description: 'File upload modal simulated. Avatar synchronized.',
                          variant: 'info',
                        })
                      }
                    >
                      Change photo
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        addToast({
                          title: 'Avatar Reset',
                          description: 'Avatar reverted to corporate default initials.',
                          variant: 'default',
                        })
                      }
                      className="text-xs text-error hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <span className="text-[11px] text-text-secondary">
                    JPG, WebP, or PNG. Maximum upload payload: 2MB.
                  </span>
                </div>
              </div>

              {/* Stacked Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-primary" htmlFor="fullName">
                    Full legal name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full h-10 px-3.5 bg-surface-muted border border-border text-text-primary rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-text-primary" htmlFor="emailAddr">
                      Workspace primary email
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent-text text-[11px] font-mono font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified SSO
                    </span>
                  </div>
                  <input
                    id="emailAddr"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="w-full h-10 px-3.5 bg-surface-muted border border-border text-text-primary rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                  />
                  <span className="text-[11px] text-text-secondary">
                    Managed through Acme Single Sign-On directory.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-text-primary" htmlFor="jobTitle">
                      Job title & moniker <span className="font-normal text-text-secondary">(optional)</span>
                    </label>
                    <span className="text-[11px] font-mono text-text-secondary">Meeting DRI Signature</span>
                  </div>
                  <input
                    id="jobTitle"
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleFormChange('jobTitle', e.target.value)}
                    className={`w-full h-10 px-3.5 bg-surface-muted border text-text-primary rounded-input text-sm focus:outline-none transition-all ${
                      formErrorSimulated
                        ? 'border-error bg-error-bg/20 ring-1 ring-error'
                        : 'border-border focus:ring-2 focus:ring-accent'
                    }`}
                  />
                  {formErrorSimulated && (
                    <p className="text-xs text-error flex items-center gap-1 pt-0.5 animate-fade-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Job title exceeds designated operational character length (max 50).
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary" htmlFor="department">
                      Department
                    </label>
                    <input
                      id="department"
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleFormChange('department', e.target.value)}
                      className="w-full h-10 px-3.5 bg-surface-muted border border-border text-text-primary rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-primary" htmlFor="timezone">
                      Primary Timezone
                    </label>
                    <input
                      id="timezone"
                      type="text"
                      value={formData.timezone}
                      onChange={(e) => handleFormChange('timezone', e.target.value)}
                      className="w-full h-10 px-3.5 bg-surface-muted border border-border text-text-primary rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Footer Save & Feedback */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-border gap-4">
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-accent-text" />
                    </div>
                    <span>Changes saved successfully at {lastSaved}</span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setFormData({
                          name: currentUser?.name || 'Divya S.',
                          email: currentUser?.email || 'divya.s@acme.corp',
                          jobTitle: 'Operations & Governance Lead (DRI Coordinator)',
                          department: 'Engineering & Governance',
                          timezone: 'UTC+05:30 (India Standard Time)',
                        });
                        setFormErrorSimulated(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button type="submit" variant="primary" loading={saving} icon={Save}>
                      Save changes
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: SECURITY & HARDWARE TOKENS */}
          {activeTab === 'security' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">
                    Security & Hardware Tokens
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Multi-factor credentials, FIDO2 WebAuthn keys, and cryptographic audit locks.
                  </p>
                </div>
                <Pill status="success" label="2FA Enforced" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
                      <Key className="w-5 h-5 text-accent-text" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">YubiKey 5C NFC (Primary Token)</h4>
                      <p className="text-xs text-text-secondary font-mono">Registered Dec 12, 2024 • Serial 9884-X0</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-accent/20 text-accent-text rounded-md">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
                      <Lock className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">Password Last Changed</h4>
                      <p className="text-xs text-text-secondary">42 days ago (Expires in 48 days per corporate policy)</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPasswordModalOpen(true)}>
                    Change
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-accent-text" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary">FIDO2 Passkeys</h4>
                      <p className="text-xs text-text-secondary">Passwordless biometric sign-in via Touch ID / Windows Hello</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addToast({
                        title: 'Passkey Prompt',
                        description: 'Hardware authentication token registered for this device.',
                        variant: 'success',
                      })
                    }
                  >
                    Add Passkey
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT & WORKSPACE */}
          {activeTab === 'account' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">
                    Account & Workspace
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Read-only workspace membership attributes and enterprise governance clearance.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-muted text-text-secondary text-xs font-mono">
                  <Lock className="w-3 h-3" />
                  <span>Managed by Admin</span>
                </div>
              </div>

              <div className="divide-y divide-border text-sm">
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="w-1/3 text-text-secondary text-xs font-medium">Primary Workspace</span>
                  <span className="w-2/3 text-text-primary font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    Acme Global Governance & Infrastructure
                  </span>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="w-1/3 text-text-secondary text-xs font-medium">Workspace Member Since</span>
                  <span className="w-2/3 text-text-primary font-semibold">November 14, 2024 (2 years active)</span>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="w-1/3 text-text-secondary text-xs font-medium">Current Role</span>
                  <div className="w-2/3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-text text-xs font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      {currentUser?.role || 'Coordinator'} & DRI Lead
                    </span>
                    <span className="text-xs text-text-secondary font-mono">Tier-1 Authority</span>
                  </div>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="w-1/3 text-text-secondary text-xs font-medium">Meeting Approver Permission</span>
                  <div className="w-2/3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-text text-xs font-mono font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {currentUser?.isApprover ? 'Granted' : 'Restricted'}
                    </span>
                    <span className="text-xs text-text-secondary">Minutes sign-off enabled</span>
                  </div>
                </div>

                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="w-1/3 text-text-secondary text-xs font-medium">Decision Ledger Access</span>
                  <span className="w-2/3 text-text-primary font-semibold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-accent-text" />
                    Cryptographic Signer Privileges Active
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-surface-muted rounded-xl border border-border">
                <HelpCircle className="w-5 h-5 text-text-secondary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-text-primary">Need escalated permissions?</h4>
                  <p className="text-xs text-text-secondary">
                    Role changes must be validated by your security lead. Use the Demo Role Switcher in the top bar to test other roles, or submit an enterprise access ticket.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">
                    Notification Preferences
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Tune quorum threshold alerts, overdue DRI warnings, and daily executive summaries.
                  </p>
                </div>
                <Pill status="default" label="Real-time Push" />
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: 'quorumAlerts',
                    label: 'Quorum Threshold Alerts',
                    desc: 'Trigger immediate push and email when meeting quorum drops below designated 75% baseline.',
                  },
                  {
                    key: 'slaEscalations',
                    label: 'DRI SLA Escalations',
                    desc: 'Notify when assigned action items reach 24 hours prior to deadline or enter overdue state.',
                  },
                  {
                    key: 'emailDigest',
                    label: 'Daily Executive Digest',
                    desc: 'A consolidated 08:00 AM summary of all active meetings, pending approvals, and decisions.',
                  },
                  {
                    key: 'decisionBroadcasts',
                    label: 'Decision Ledger Seals',
                    desc: 'Alert immediately whenever a high-impact governance decision is signed and sealed with SHA-256.',
                  },
                  {
                    key: 'mobilePush',
                    label: 'Mobile Device Push Notifications',
                    desc: 'Forward high-priority mentions and assignment escalations directly to authenticated smartphones.',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-surface-muted rounded-xl border border-border"
                  >
                    <div className="max-w-md">
                      <h4 className="text-xs sm:text-sm font-semibold text-text-primary">{item.label}</h4>
                      <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPrefs[item.key]}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setNotifPrefs((prev) => ({ ...prev, [item.key]: val }));
                          addToast({
                            title: 'Preference Updated',
                            description: `${item.label} set to ${val ? 'Enabled' : 'Disabled'}.`,
                            variant: 'default',
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: APPEARANCE (Directly integrated with useTheme!) */}
          {activeTab === 'appearance' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">Appearance</h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Customize how MeetTrack renders UI density, contrast tokens, and display themes.
                  </p>
                </div>
                <Palette className="w-5 h-5 text-text-secondary" />
              </div>

              {/* Theme Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Light */}
                <label
                  onClick={() => setTheme('light')}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    theme === 'light'
                      ? 'border-accent bg-surface shadow-md'
                      : 'border-border bg-surface-muted hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme === 'light'}
                    onChange={() => setTheme('light')}
                    className="sr-only"
                  />
                  {/* Miniature Graphic Preview Card */}
                  <div className="w-full h-24 bg-[#f9faf8] rounded-lg p-2.5 flex gap-2 border border-[#daded9] shadow-inner mb-3">
                    <div className="w-5 h-full bg-[#f3f4f2] rounded flex flex-col gap-1 p-1">
                      <div className="w-full h-1.5 bg-[#B6E34A] rounded-sm" />
                      <div className="w-full h-1 bg-[#daded9] rounded-sm" />
                      <div className="w-full h-1 bg-[#daded9] rounded-sm" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="w-1/2 h-2 bg-[#191c1b] rounded" />
                      <div className="w-full h-6 bg-white rounded shadow-sm flex items-center px-1.5">
                        <div className="w-8 h-1 bg-[#4d6700] rounded" />
                      </div>
                      <div className="w-3/4 h-2 bg-[#e2e3e1] rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-primary">Light Mode</div>
                      <div className="text-[11px] text-text-secondary">High contrast daylight</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        theme === 'light' ? 'bg-accent' : 'border border-border'
                      }`}
                    >
                      {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-accent-text" />}
                    </div>
                  </div>
                </label>

                {/* Dark */}
                <label
                  onClick={() => setTheme('dark')}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    theme === 'dark'
                      ? 'border-accent bg-surface shadow-md'
                      : 'border-border bg-surface-muted hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme === 'dark'}
                    onChange={() => setTheme('dark')}
                    className="sr-only"
                  />
                  {/* Miniature Graphic Preview Card */}
                  <div className="w-full h-24 bg-[#191c1b] rounded-lg p-2.5 flex gap-2 border border-[#2e3130] shadow-inner mb-3">
                    <div className="w-5 h-full bg-[#242725] rounded flex flex-col gap-1 p-1">
                      <div className="w-full h-1.5 bg-[#B6E34A] rounded-sm" />
                      <div className="w-full h-1 bg-[#444936] rounded-sm" />
                      <div className="w-full h-1 bg-[#444936] rounded-sm" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="w-1/2 h-2 bg-[#f0f1ef] rounded" />
                      <div className="w-full h-6 bg-[#242725] rounded shadow-sm flex items-center px-1.5">
                        <div className="w-8 h-1 bg-[#B6E34A] rounded" />
                      </div>
                      <div className="w-3/4 h-2 bg-[#404940] rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-primary">Dark Mode</div>
                      <div className="text-[11px] text-text-secondary">Calm low-light view</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        theme === 'dark' ? 'bg-accent' : 'border border-border'
                      }`}
                    >
                      {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-accent-text" />}
                    </div>
                  </div>
                </label>

                {/* System */}
                <label
                  onClick={() => setTheme('system')}
                  className={`relative flex flex-col p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    theme === 'system'
                      ? 'border-accent bg-surface shadow-md'
                      : 'border-border bg-surface-muted hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value="system"
                    checked={theme === 'system'}
                    onChange={() => setTheme('system')}
                    className="sr-only"
                  />
                  {/* Miniature Graphic Preview Card (Split) */}
                  <div className="w-full h-24 rounded-lg overflow-hidden flex border border-border shadow-inner mb-3">
                    <div className="w-1/2 h-full bg-[#f9faf8] p-2 flex flex-col gap-1.5 border-r border-[#daded9]">
                      <div className="w-6 h-1.5 bg-[#4d6700] rounded" />
                      <div className="w-full h-6 bg-white rounded shadow-xs p-1">
                        <div className="w-full h-1 bg-[#e2e3e1] rounded" />
                      </div>
                    </div>
                    <div className="w-1/2 h-full bg-[#191c1b] p-2 flex flex-col gap-1.5">
                      <div className="w-6 h-1.5 bg-[#B6E34A] rounded" />
                      <div className="w-full h-6 bg-[#242725] rounded shadow-xs p-1">
                        <div className="w-full h-1 bg-[#444936] rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-text-primary">System Sync</div>
                      <div className="text-[11px] text-text-secondary">Auto device match</div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        theme === 'system' ? 'bg-accent' : 'border border-border'
                      }`}
                    >
                      {theme === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-accent-text" />}
                    </div>
                  </div>
                </label>
              </div>

              <p className="text-xs text-text-secondary flex items-center gap-1.5 pt-2">
                <HelpCircle className="w-3.5 h-3.5" />
                Applies across all workspace views. System theme automatically adapts when your OS switches day/night mode.
              </p>
            </div>
          )}

          {/* TAB 6: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="bg-surface border border-border rounded-card p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-semibold text-text-primary">Active Sessions</h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Devices and tokens currently authenticated with your user clearance.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setRevokeModalOpen(true)}
                  disabled={sessions.length <= 1}
                >
                  Revoke other sessions
                </Button>
              </div>

              <div className="space-y-3">
                {sessions.map((sess) => {
                  const Icon = sess.icon;
                  return (
                    <div
                      key={sess.id}
                      className="p-4 rounded-xl bg-surface-muted border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center">
                          <Icon className="w-5 h-5 text-accent-text" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-text-primary">{sess.device}</h4>
                            {sess.current && <Pill status="success" label="This device" />}
                          </div>
                          <p className="text-xs text-text-secondary">
                            {sess.browser} • {sess.location}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-text-secondary">{sess.lastActive}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- REVOKE SESSIONS MODAL ---------------- */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => setRevokeModalOpen(false)}
        title="Revoke Other Sessions"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Are you sure you want to invalidate all active session tokens on other devices? You will remain signed in
            on this machine, but will need to re-authenticate on your mobile app and other browsers.
          </p>

          <div className="p-3 bg-error-bg/30 border border-error/20 rounded-card flex items-center gap-2 text-xs text-error">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This action takes effect across enterprise edge nodes immediately.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRevokeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRevokeOtherSessions}>
              Confirm Revocation
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---------------- CHANGE PASSWORD MODAL ---------------- */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change Password"
        maxWidth="max-w-md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPasswordModalOpen(false);
            addToast({
              title: 'Password Updated',
              description: 'Your login credentials were changed successfully.',
              variant: 'success',
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Current Password</label>
            <input
              type="password"
              required
              className="w-full h-10 px-3 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">New Password</label>
            <input
              type="password"
              required
              className="w-full h-10 px-3 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-[11px] text-text-secondary">Minimum 12 characters, including numbers and symbols.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-primary">Confirm New Password</label>
            <input
              type="password"
              required
              className="w-full h-10 px-3 bg-surface-muted border border-border rounded-input text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="ghost" type="button" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Update Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

