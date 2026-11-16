// Stitch screen 01: Landing page
// Matches Stitch design 4e24a14953e745bc9634b3edad5e328e (MeetTrack Premium SaaS Landing Page)
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Calendar,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Users,
  Lock,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Play,
  PlusCircle,
} from 'lucide-react';
import { useTheme } from '../app/theme';
import { useAuth } from '../auth/AuthContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export default function Screen01Landing() {
  const { theme, setTheme } = useTheme();
  const { enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const [activeWorkflowTab, setActiveWorkflowTab] = useState(0);

  const handleExploreDemo = () => {
    enterDemoMode('user-priya'); // Default demo persona: Priya Nair
    navigate('/dashboard');
  };

  const workflowStages = [
    {
      num: '01',
      title: 'Schedule',
      desc: 'Organise sessions, align participants, and reserve quorum slots with instant calendar sync.',
      badge: 'Attendance audit',
    },
    {
      num: '02',
      title: 'Prepare',
      desc: 'Assemble agendas and carry unresolved blockers automatically into next session.',
      badge: 'Smart agenda rollup',
    },
    {
      num: '03',
      title: 'Document',
      desc: 'Structured markdown editor with real-time autosave and non-destructive diff versioning.',
      badge: 'Offline auto-cache',
    },
    {
      num: '04',
      title: 'Approve',
      desc: 'Formal review workflows for designated meeting signers. Cryptographic SHA-256 sealing.',
      badge: 'Immutable records',
    },
    {
      num: '05',
      title: 'Assign',
      desc: 'Turn decisions into owned commitments with priority SLAs and singular designated DRIs.',
      badge: 'Single DRI mandate',
      highlight: true,
    },
    {
      num: '06',
      title: 'Track',
      desc: 'Real-time velocity tracking, blocker escalations, and executive compliance dashboards.',
      badge: 'Auto-escalate blockers',
    },
  ];

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-body selection:bg-accent selection:text-text-primary">
      {/* ---------------- TOP BANNER ---------------- */}
      <aside
        aria-label="Announcement"
        className="w-full bg-text-primary text-bg py-2 px-4 text-xs font-medium border-b border-border flex items-center justify-between z-50"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center w-full">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>
            <strong>MeetTrack 2.4 Live:</strong> Real-time governance audits, one-click action delegation & AI quorum review.
          </span>
          <a href="#how-it-works" className="underline hover:text-accent transition-colors ml-1 font-semibold hidden sm:inline">
            See workflow →
          </a>
        </div>
      </aside>

      {/* ---------------- STICKY NAVIGATION BAR ---------------- */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-btn bg-text-primary text-accent flex items-center justify-center font-heading font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-text-primary">
              meet<span className="text-text-primary">track</span>
              <span className="text-accent text-2xl leading-none">.</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-text-secondary">
            <a href="#problem" className="hover:text-text-primary transition-colors py-1">
              The Dilemma
            </a>
            <a href="#how-it-works" className="hover:text-text-primary transition-colors py-1">
              How It Works
            </a>
            <a href="#features" className="hover:text-text-primary transition-colors py-1">
              Features
            </a>
            <a href="#ai-assistant" className="hover:text-text-primary transition-colors py-1 flex items-center gap-1.5">
              <span>AI Assist</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent text-accent-text font-bold">
                GEMINI
              </span>
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* 3-way Theme Switcher */}
            <div className="flex items-center bg-surface-muted p-1 rounded-btn border border-border" role="radiogroup">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-btn text-xs ${theme === 'light' ? 'bg-surface text-text-primary font-bold' : 'text-text-secondary'
                  }`}
                aria-label="Light theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-btn text-xs ${theme === 'dark' ? 'bg-surface text-text-primary font-bold' : 'text-text-secondary'
                  }`}
                aria-label="Dark theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-btn text-xs ${theme === 'system' ? 'bg-surface text-text-primary font-bold' : 'text-text-secondary'
                  }`}
                aria-label="System theme"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={handleExploreDemo}
              className="text-[13px] sm:text-[14px] font-semibold px-3 py-2 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-accent-text fill-accent" />
              <span>Explore Demo</span>
            </button>

            <Link
              to="/login"
              className="text-[14px] font-semibold px-3 py-2 text-text-primary hover:text-text-secondary transition-colors"
            >
              Sign In
            </Link>

            <Link
              to="/setup"
              className="inline-flex items-center justify-center px-4 py-2 rounded-btn font-semibold text-[14px] bg-accent text-accent-text hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Create Workspace</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- SECTION 2: HERO SECTION ---------------- */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column (Copy + CTAs) */}
            <div className="lg:col-span-6 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-btn bg-surface-muted border border-border text-xs font-semibold text-text-primary mb-6">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>A smarter way to run meetings</span>
              </div>

              <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-[58px] leading-[1.08] tracking-tight text-text-primary mb-6">
                Meetings are easy.<br />
                Making them count?<br />
                <span className="relative inline-block mt-1">
                  <span className="relative z-10 text-accent-text bg-accent px-2.5 py-0.5 rounded-btn shadow-xs">
                    That's the hard part.
                  </span>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mb-8">
                From the first agenda to the final action item, keep every discussion, decision and responsibility connected. MeetTrack turns conversations into outcomes.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto mb-6">
                <Link
                  to="/setup"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-btn font-semibold text-[15px] bg-accent text-accent-text hover:bg-accent-hover active:scale-[0.98] transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span>Create your workspace</span>
                </Link>

                <button
                  type="button"
                  onClick={handleExploreDemo}
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-btn font-semibold text-[14px] sm:text-[15px] bg-surface border border-border text-text-primary hover:bg-surface-muted active:scale-[0.98] transition-all group"
                >
                  <Play className="w-4 h-4 mr-2 text-accent-text fill-accent group-hover:scale-110 transition-transform" />
                  <span>Explore the demo with sample Engineering Fest data</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-text-secondary">
                <Check className="w-4 h-4 text-accent" />
                <span>One workspace. Single DRI ownership. Zero forgotten follow-ups.</span>
              </div>
            </div>

            {/* Right Column: Connected Workflow Stage Interactive Preview Window */}
            <div className="lg:col-span-6 relative">
              <div className="relative w-full max-w-lg mx-auto bg-surface-muted border border-border rounded-modal p-6 lg:p-7 shadow-sm">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-text-primary/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-text-primary/20" />
                    <span className="w-2.5 h-2.5 rounded-full bg-text-primary/20" />
                    <span className="font-mono text-xs text-text-secondary ml-2">
                      quorum_stream.session
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-btn bg-accent text-accent-text">
                    ● LIVE QUORUM
                  </span>
                </div>

                {/* Node 1: Meeting Card */}
                <div className="bg-surface border border-border rounded-card p-4 shadow-xs mb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-text-secondary uppercase tracking-wider">
                        Step 1 • Sync
                      </span>
                      <h3 className="font-heading font-bold text-base text-text-primary">
                        Q4 Infrastructure & Budget Quorum
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        8 attended • Elena R. presiding
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-surface-muted font-medium rounded-btn text-text-primary">
                      10:30 AM
                    </span>
                  </div>
                </div>

                {/* Connecting arrow */}
                <div className="flex justify-center my-1 text-accent font-bold text-sm">↓</div>

                {/* Node 2: Cryptographic Minutes */}
                <div className="bg-surface border border-border rounded-card p-4 shadow-xs mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-btn bg-text-primary text-accent flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                      <h3 className="font-heading font-semibold text-sm text-text-primary">
                        Minutes Cryptographically Sealed
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-text-secondary">v1.4 • SHA-256</span>
                  </div>
                  <div className="p-2 bg-surface-muted/60 border border-border rounded-btn flex items-center justify-between text-xs">
                    <span className="font-medium text-text-primary">#DEC-042: Multi-cloud migration</span>
                    <span className="font-mono text-[10px] bg-accent text-accent-text font-bold px-1.5 py-0.5 rounded">
                      UNANIMOUS 8-0
                    </span>
                  </div>
                </div>

                {/* Connecting arrow */}
                <div className="flex justify-center my-1 text-accent font-bold text-sm">↓</div>

                {/* Node 3: Assigned Action DRI (Highlighted) */}
                <div className="bg-surface border-2 border-accent rounded-card p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                      <span className="text-xs font-mono font-bold text-text-primary">
                        ACTION #1042 • DUE IN 3 DAYS
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-error bg-error-bg px-2 py-0.5 rounded-btn">
                      High Priority
                    </span>
                  </div>
                  <p className="font-medium text-sm text-text-primary mb-2.5">
                    Deliver cryptographic attestation report to compliance board
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <span className="text-text-secondary">
                      Owner: <strong className="text-text-primary">Sarah Chen</strong> (SecOps DRI)
                    </span>
                    <span className="text-success font-medium">92% On-track ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SECTION 3: THE STATUS QUO DILEMMA ---------------- */}
      <section id="problem" className="py-20 md:py-28 bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-secondary mb-2 block">
              The Status Quo Dilemma
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
              Ever left a meeting wondering…<br />
              <span className="text-text-secondary underline decoration-accent decoration-wavy decoration-2">
                who’s actually doing what?
              </span>
            </h2>
            <p className="mt-4 text-text-secondary text-base">
              Conventional meetings produce endless talk, scattered Google Docs, and forgotten Slack threads. MeetTrack resolves the three core failure points.
            </p>
          </div>

          {/* 3 Problem Cards matching Stitch geometric illustrations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* 01: The disappearing minutes */}
            <div className="card-hover bg-bg border border-border rounded-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-full h-40 bg-surface rounded-btn border border-border flex items-center justify-center mb-6 relative">
                  <svg width="160" height="110" viewBox="0 0 160 110" className="stroke-current text-text-primary fill-none stroke-2">
                    <line x1="20" y1="95" x2="140" y2="95" />
                    <circle cx="55" cy="45" r="10" />
                    <line x1="55" y1="55" x2="55" y2="80" />
                    <line x1="55" y1="80" x2="45" y2="95" />
                    <line x1="55" y1="80" x2="65" y2="95" />
                    <path d="M55 62 L40 52 L44 40" />
                    <path d="M55 62 L75 58 L90 48" />
                    <rect x="100" y="25" width="22" height="28" rx="2" className="fill-accent stroke-text-primary stroke-2" />
                    <line x1="105" y1="33" x2="117" y2="33" className="stroke-text-primary stroke-[1.5]" />
                    <line x1="105" y1="39" x2="114" y2="39" className="stroke-text-primary stroke-[1.5]" />
                    <rect x="85" y="62" width="20" height="24" rx="2" />
                  </svg>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-btn bg-surface-muted text-xs font-mono font-semibold mb-3">
                  01 / DISSIPATION
                </div>
                <h3 className="font-heading font-bold text-xl text-text-primary mb-2">
                  The disappearing minutes
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Notes get lost across personal Notion docs, buried Google drives, and private notebooks. Nobody knows which draft is the authoritative agreement.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-xs font-semibold text-text-primary">
                → Resolved by centralized, signed minutes registers.
              </div>
            </div>

            {/* 02: The forgotten follow-up */}
            <div className="card-hover bg-bg border border-border rounded-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-full h-40 bg-surface rounded-btn border border-border flex items-center justify-center mb-6 relative">
                  <svg width="160" height="110" viewBox="0 0 160 110" className="stroke-current text-text-primary fill-none stroke-2">
                    <line x1="20" y1="95" x2="140" y2="95" />
                    <line x1="90" y1="65" x2="135" y2="65" />
                    <line x1="98" y1="65" x2="98" y2="95" />
                    <line x1="130" y1="65" x2="130" y2="95" />
                    <rect x="102" y="52" width="24" height="13" rx="1" />
                    <circle cx="50" cy="55" r="10" />
                    <line x1="50" y1="65" x2="50" y2="82" />
                    <line x1="50" y1="82" x2="40" y2="95" />
                    <line x1="50" y1="82" x2="60" y2="95" />
                    <circle cx="118" cy="32" r="14" className="fill-accent stroke-text-primary stroke-2" />
                    <line x1="118" y1="32" x2="118" y2="24" className="stroke-text-primary stroke-2" />
                    <line x1="118" y1="32" x2="125" y2="32" className="stroke-text-primary stroke-2" />
                  </svg>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-btn bg-surface-muted text-xs font-mono font-semibold mb-3">
                  02 / AMNESIA
                </div>
                <h3 className="font-heading font-bold text-xl text-text-primary mb-2">
                  The forgotten follow-up
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Critical tasks discussed with high enthusiasm fade the moment the call ends. Weeks pass before someone asks: “Wait, didn’t we agree on that?”
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-xs font-semibold text-text-primary">
                → Resolved by automated SLA escalations.
              </div>
            </div>

            {/* 03: The unclear ownership */}
            <div className="card-hover bg-bg border border-border rounded-card p-6 flex flex-col justify-between">
              <div>
                <div className="w-full h-40 bg-surface rounded-btn border border-border flex items-center justify-center mb-6 relative">
                  <svg width="160" height="110" viewBox="0 0 160 110" className="stroke-current text-text-primary fill-none stroke-2">
                    <line x1="20" y1="95" x2="140" y2="95" />
                    <circle cx="45" cy="50" r="9" />
                    <line x1="45" y1="59" x2="45" y2="80" />
                    <line x1="45" y1="80" x2="38" y2="95" />
                    <line x1="45" y1="80" x2="52" y2="95" />
                    <path d="M45 68 L68 66" />
                    <circle cx="115" cy="50" r="9" />
                    <line x1="115" y1="59" x2="115" y2="80" />
                    <line x1="115" y1="80" x2="108" y2="95" />
                    <line x1="115" y1="80" x2="122" y2="95" />
                    <path d="M115 68 L92 66" />
                    <rect x="68" y="70" width="24" height="20" rx="2" className="fill-accent stroke-text-primary stroke-2" />
                  </svg>
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-btn bg-surface-muted text-xs font-mono font-semibold mb-3">
                  03 / DIFFUSION
                </div>
                <h3 className="font-heading font-bold text-xl text-text-primary mb-2">
                  The unclear ownership
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Everyone was in the room, everyone nodded, but no single DRI was assigned. When responsibility belongs to “the team,” nobody delivers it.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-xs font-semibold text-text-primary">
                → Resolved by mandatory single DRI assignment.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SECTION 4: WORKFLOW TIMELINE ---------------- */}
      <section id="how-it-works" className="py-20 md:py-28 bg-bg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-text-secondary mb-2 block">
              End-To-End Integrity
            </span>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
              From meeting room to done list.
            </h2>
            <p className="mt-4 text-text-secondary">
              A continuous loop from pre-meeting agenda to post-meeting execution. Never lose a thread again.
            </p>
          </div>

          {/* 6 Stage Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {workflowStages.map((stage, idx) => (
              <div
                key={idx}
                className={`bg-surface border rounded-card p-5 relative group transition-all ${stage.highlight
                    ? 'border-2 border-accent shadow-sm'
                    : 'border-border hover:border-accent'
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-btn flex items-center justify-center font-mono font-bold text-sm mb-3 transition-colors ${stage.highlight
                      ? 'bg-accent text-accent-text'
                      : 'bg-surface-muted text-text-primary group-hover:bg-accent group-hover:text-accent-text'
                    }`}
                >
                  {stage.num}
                </div>
                <h3 className="font-heading font-bold text-base text-text-primary mb-1">
                  {stage.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">{stage.desc}</p>
                <div className="mt-4 text-[11px] font-mono font-medium text-text-primary">
                  • {stage.badge}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- SECTION 5: FINAL CTA ---------------- */}
      <section id="ai-assistant" className="py-20 bg-surface text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="w-12 h-12 rounded-full bg-accent text-accent-text mx-auto flex items-center justify-center mb-5 font-bold shadow-sm">
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-text-primary mb-4">
            Ready for meetings that lead to results?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-8 text-base">
            Join executive teams turning scattered discussion into cryptographic decisions and single-owner execution.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="px-6 py-3.5 rounded-btn font-semibold text-sm bg-accent text-accent-text hover:bg-accent-hover shadow-sm transition-all"
            >
              Enter Workspace Dashboard
            </Link>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-btn font-semibold text-sm bg-surface-muted hover:bg-surface-hover text-text-primary border border-border transition-all"
            >
              Sign In to Your Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-border bg-bg py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-text-secondary font-mono">
          MeetTrack Governance Suite 2.4 • Cryptographic Audit Sealing • All rights reserved
        </div>
      </footer>
    </div>
  );
}

