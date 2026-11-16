// Stitch screen 03: Role-based dashboard
// Matches Stitch design 7502e27232334dbea1527e4a6ec77444 (MeetTrack Dashboard — Coordinator Variant)
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  AlertTriangle,
  FileCheck,
  Plus,
  SlidersHorizontal,
  CloudOff,
  X,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  AlertOctagon,
  RefreshCw,
  Check,
  MoreVertical,
  Filter,
  Shield,
  Activity,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getMeetings, getActions, isActionOverdue } from '../services/api';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { TableSkeleton, MetricCardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // State
  const [meetings, setMeetings] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Simulator bar states per Stitch screen
  const [simulatorView, setSimulatorView] = useState('active'); // 'active' | 'empty' | 'error'
  const [offlineBannerVisible, setOfflineBannerVisible] = useState(false);
  const [sessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false);
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);

  // New meeting form modal
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingDate, setNewMeetingDate] = useState('2026-11-20');
  const [newMeetingTime, setNewMeetingTime] = useState('14:00');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mtgs, acts] = await Promise.all([getMeetings(), getActions()]);
      setMeetings(mtgs);
      setActions(acts);
    } catch (err) {
      showToast('Error syncing dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const overdueActionsCount = actions.filter((a) =>
    isActionOverdue(a.dueDate, a.status)
  ).length;

  const openActionsCount = actions.filter((a) => a.status !== 'Completed').length;

  const handleCreateMeeting = (e) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const newMtg = {
      id: `mtg-${Date.now()}`,
      code: `MT-2026-${String(meetings.length + 45).padStart(3, '0')}`,
      title: newMeetingTitle,
      date: newMeetingDate,
      startTime: newMeetingTime,
      status: 'Scheduled',
      attendees: [{ name: currentUser.name, role: currentUser.role, signedIn: true }],
      agenda: [{ order: 1, title: 'Session Introduction & Quorum Roll Call' }],
    };

    setMeetings([newMtg, ...meetings]);
    setNewMeetingModalOpen(false);
    setNewMeetingTitle('');
    showToast(`Meeting "${newMtg.title}" scheduled successfully!`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* ---------------- SIMULATOR BAR (STITCH COMPONENT) ---------------- */}
      <div className="bg-surface border border-border rounded-card p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-xs select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider font-semibold px-2">
            Simulator:
          </span>
          <button
            onClick={() => setSimulatorView('active')}
            className={`px-2.5 py-1 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simulatorView === 'active'
                ? 'bg-text-primary text-bg shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span>Active View</span>
          </button>
          <button
            onClick={() => setSimulatorView('empty')}
            className={`px-2.5 py-1 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simulatorView === 'empty'
                ? 'bg-text-primary text-bg shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            <span>Empty State View</span>
          </button>
          <button
            onClick={() => setSimulatorView('error')}
            className={`px-2.5 py-1 rounded-btn text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simulatorView === 'error'
                ? 'bg-text-primary text-bg shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            <span>500 Error State</span>
          </button>
          <button
            onClick={() => setSessionExpiredModalOpen(true)}
            className="px-2.5 py-1 rounded-btn text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-all"
          >
            <span>Session Expired Modal</span>
          </button>
          <button
            onClick={() => setOfflineBannerVisible(!offlineBannerVisible)}
            className={`px-2.5 py-1 rounded-btn text-xs font-semibold transition-all ${
              offlineBannerVisible ? 'bg-error-bg text-error border border-error-border' : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            <span>Offline Banner {offlineBannerVisible ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-mono px-2 hidden sm:flex">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span>Realtime Consensus Synced</span>
        </div>
      </div>

      {/* ---------------- OFFLINE WARNING BANNER (STITCH COMPONENT) ---------------- */}
      {offlineBannerVisible && (
        <div className="bg-surface-muted border border-border rounded-card p-3 flex items-center justify-between text-text-primary animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CloudOff className="w-4 h-4 text-warning shrink-0" />
            <p className="text-xs">
              <span className="font-semibold">Local Storage Mode:</span> Minutes and action item updates are saving locally and will synchronize once quorum network connectivity is restored.
            </p>
          </div>
          <button
            onClick={() => setOfflineBannerVisible(false)}
            className="p-1 rounded-btn hover:bg-surface text-text-secondary hover:text-text-primary"
            aria-label="Dismiss offline banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ---------------- 500 ERROR STATE VIEW ---------------- */}
      {simulatorView === 'error' && (
        <div className="p-8 sm:p-12 bg-surface border border-error-border rounded-card text-center space-y-4 shadow-sm animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-error-bg text-error mx-auto flex items-center justify-center border border-error-border">
            <AlertOctagon className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-full bg-error-bg text-error font-mono text-[11px] font-bold">
            HTTP 500 • CONSENSUS ENGINE FAILURE
          </div>
          <h2 className="font-heading font-bold text-2xl text-text-primary">
            Quorum Ledger Unreachable
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            The workspace quorum ledger encountered an internal synchronization exception. The automated recovery process has been dispatched.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={() => {
                setSimulatorView('active');
                fetchData();
              }}
            >
              Retry quorum sync
            </Button>
          </div>
        </div>
      )}

      {/* ---------------- EMPTY STATE VIEW ---------------- */}
      {simulatorView === 'empty' && (
        <EmptyState
          icon={Calendar}
          title="No meetings or open actions on record"
          description="Your workspace has no active quorum sessions scheduled for today. Start by scheduling a new executive meeting."
          actionLabel="Schedule First Meeting"
          actionIcon={Plus}
          onAction={() => setNewMeetingModalOpen(true)}
        />
      )}

      {/* ---------------- ACTIVE COORDINATOR / ROLE VIEW ---------------- */}
      {simulatorView === 'active' && (
        <>
          {/* Header Greeting & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
                Good morning, {currentUser?.name || 'Divya'}
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                Acme Governance Workspace • Today, November 16, 2026
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="secondary"
                size="md"
                icon={SlidersHorizontal}
                onClick={() => showToast('Horizon filter set: Next 14 Days', 'info')}
              >
                Filter Horizon
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => setNewMeetingModalOpen(true)}
              >
                New meeting
              </Button>
            </div>
          </div>

          {/* 4 Summary Metric Cards per Stitch screen */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Upcoming Meetings */}
              <Card className="flex flex-col justify-between hover:border-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary uppercase font-mono tracking-wider">
                    Upcoming meetings
                  </span>
                  <div className="w-8 h-8 rounded-btn bg-surface-muted flex items-center justify-center text-text-secondary">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-heading font-bold text-3xl text-text-primary tabular-nums">
                    {meetings.length}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span>2 scheduled for today</span>
                  </div>
                </div>
              </Card>

              {/* Metric 2: Open Actions */}
              <Card className="flex flex-col justify-between hover:border-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary uppercase font-mono tracking-wider">
                    Open actions
                  </span>
                  <div className="w-8 h-8 rounded-btn bg-surface-muted flex items-center justify-center text-text-secondary">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-heading font-bold text-3xl text-text-primary tabular-nums">
                    {openActionsCount}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    12 on schedule, <strong className="text-text-primary">4 under review</strong>
                  </div>
                </div>
              </Card>

              {/* Metric 3: Overdue Actions */}
              <Card className="flex flex-col justify-between border-error-border/60 hover:border-error transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-error uppercase font-mono tracking-wider">
                    Overdue actions
                  </span>
                  <div className="w-8 h-8 rounded-btn bg-error-bg flex items-center justify-center text-error">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-heading font-bold text-3xl text-error tabular-nums">
                    {overdueActionsCount}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-error font-medium">
                    <span>Requires coordinator escalation</span>
                  </div>
                </div>
              </Card>

              {/* Metric 4: Minutes awaiting approval */}
              <Card className="flex flex-col justify-between hover:border-accent transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary uppercase font-mono tracking-wider">
                    Minutes for approval
                  </span>
                  <div className="w-8 h-8 rounded-btn bg-surface-muted flex items-center justify-center text-text-secondary">
                    <FileCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="font-heading font-bold text-3xl text-text-primary tabular-nums">
                    3
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    <strong className="text-text-primary">2 quorum sign-offs</strong> pending
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main 2-Column Operational Grid (2fr / 1fr) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT 2 COLS: Upcoming meetings & My Actions table */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Upcoming Meetings Panel */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-base text-text-primary">
                      Upcoming meetings
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-xs font-mono font-semibold">
                      Today ({meetings.slice(0, 2).length})
                    </span>
                  </div>
                  <Link
                    to="/calendar"
                    className="text-xs font-semibold text-text-primary hover:text-accent transition-colors flex items-center gap-1"
                  >
                    <span>View calendar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {meetings.slice(0, 3).map((mtg, idx) => (
                    <div
                      key={mtg.id}
                      className={`p-3.5 rounded-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        idx === 0
                          ? 'bg-accent-tint/40 border-accent/70'
                          : 'bg-surface-muted/40 border-border hover:bg-surface-muted'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/meetings/${mtg.id}`}
                            className="font-heading font-bold text-sm text-text-primary hover:underline"
                          >
                            {mtg.title}
                          </Link>
                          {idx === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-text text-[11px] font-mono font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-text-primary animate-ping" />
                              Live Quorum Active
                            </span>
                          ) : (
                            <Pill status={mtg.status} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {mtg.startTime} – {mtg.endTime || '12:00 PM'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {mtg.attendees?.filter((a) => a.signedIn)?.length || 6} signed in
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link
                          to={`/meetings/${mtg.id}`}
                          className="px-3 py-1.5 rounded-btn bg-surface border border-border text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors shadow-xs"
                        >
                          {idx === 0 ? 'Open Room' : 'Details & Agenda'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* My Actions & Accountability Table */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-base text-text-primary">
                      My actions & accountability
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-xs font-mono font-semibold">
                      {actions.length} tracked
                    </span>
                  </div>
                  <Link
                    to="/actions"
                    className="text-xs font-semibold text-text-primary hover:text-accent transition-colors flex items-center gap-1"
                  >
                    <span>All actions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto -mx-5 px-5">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                        <th className="py-2.5 px-3">Action Item</th>
                        <th className="py-2.5 px-3">DRI Owner</th>
                        <th className="py-2.5 px-3 text-center">Priority</th>
                        <th className="py-2.5 px-3 text-right">Due Date</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {actions.slice(0, 5).map((act) => {
                        const overdue = isActionOverdue(act.dueDate, act.status);
                        return (
                          <tr
                            key={act.id}
                            className={`hover:bg-surface-muted/50 transition-colors ${
                              overdue ? 'bg-error-bg/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-medium text-text-primary">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={act.status === 'Completed'}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded border-border accent-accent"
                                />
                                <span className={overdue ? 'font-bold text-error' : ''}>
                                  {act.title}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-surface-muted flex items-center justify-center font-bold text-[10px]">
                                  {act.ownerInitials || 'U'}
                                </div>
                                <span className="text-text-secondary">{act.ownerName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Pill status={act.priority} size="sm" />
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums text-text-secondary">
                              {act.dueDate}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Pill status={overdue ? 'Overdue' : act.status} size="sm" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* RIGHT 1 COL: Deadlines, Activity, Notifications */}
            <div className="space-y-6">
              
              {/* Deadlines Next 7 Days */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h3 className="font-heading font-bold text-sm text-text-primary">
                    Deadlines, next 7 days
                  </h3>
                  <Calendar className="w-4 h-4 text-text-secondary" />
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-start gap-3 pb-2 border-b border-border/50">
                    <span className="font-mono font-bold text-text-primary w-10 shrink-0">Mon</span>
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      <span className="truncate">2 meeting quorums, 1 board packet</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-2 border-b border-border/50">
                    <span className="font-mono text-text-secondary w-10 shrink-0">Tue</span>
                    <div className="flex items-center gap-2 truncate text-text-secondary">
                      <span className="w-2 h-2 rounded-full bg-text-secondary shrink-0" />
                      <span className="truncate">Vendor contract milestone</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-2 border-b border-border/50">
                    <span className="font-mono text-text-secondary w-10 shrink-0">Wed</span>
                    <div className="flex items-center gap-2 truncate text-text-secondary">
                      <span className="w-2 h-2 rounded-full bg-text-secondary shrink-0" />
                      <span className="truncate">SOC2 audit window freeze</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-2 border-b border-border/50">
                    <span className="font-mono text-text-secondary w-10 shrink-0">Thu</span>
                    <div className="flex items-center gap-2 truncate text-text-secondary">
                      <span className="w-2 h-2 rounded-full bg-text-secondary shrink-0" />
                      <span className="truncate">Weekly executive sync</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-text-secondary w-10 shrink-0">Fri</span>
                    <div className="flex items-center gap-2 truncate text-text-secondary">
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      <span className="truncate">Bi-monthly minute archiving</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Activity Feed */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <h3 className="font-heading font-bold text-sm text-text-primary">
                    Recent activity
                  </h3>
                  <span className="text-[10px] font-mono text-text-secondary">Realtime</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-accent-tint text-accent-text flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-text-primary">
                        <strong className="font-semibold">Sarah Chen</strong> signed off on minutes #MT-2026-042
                      </p>
                      <span className="text-[10px] text-text-secondary font-mono">12m ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-surface-muted text-text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="text-text-primary">
                        <strong className="font-semibold">Quorum reached</strong> for Product Council
                      </p>
                      <span className="text-[10px] text-text-secondary font-mono">1h ago</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-surface-muted text-text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <CheckSquare className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="text-text-primary">
                        New action assigned to <strong className="font-semibold">Divya S.</strong>
                      </p>
                      <span className="text-[10px] text-text-secondary font-mono">3h ago</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* ---------------- SESSION EXPIRED MODAL (FALLBACK STATE) ---------------- */}
      <Modal
        isOpen={sessionExpiredModalOpen}
        onClose={() => setSessionExpiredModalOpen(false)}
        title="Session Expired"
        description="Your cryptographic quorum authentication session has timed out."
      >
        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <p>
            For regulatory compliance and tamper-evident logging, sessions are invalidated after 60 minutes of inactivity. Any unsaved drafts have been cached in your local browser storage.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setSessionExpiredModalOpen(false);
                navigate('/login');
              }}
            >
              Sign In Again
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---------------- NEW MEETING MODAL ---------------- */}
      <Modal
        isOpen={newMeetingModalOpen}
        onClose={() => setNewMeetingModalOpen(false)}
        title="Schedule New Meeting"
        description="Set up an executive quorum session with agenda & quorum threshold."
      >
        <form onSubmit={handleCreateMeeting} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Meeting Title</label>
            <input
              type="text"
              required
              value={newMeetingTitle}
              onChange={(e) => setNewMeetingTitle(e.target.value)}
              placeholder="e.g. Q1 Architecture & Compliance Quorum"
              className="w-full h-9 px-3 rounded-input bg-surface border border-border text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Date</label>
              <input
                type="date"
                required
                value={newMeetingDate}
                onChange={(e) => setNewMeetingDate(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border text-xs focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Start Time</label>
              <input
                type="time"
                required
                value={newMeetingTime}
                onChange={(e) => setNewMeetingTime(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border text-xs focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setNewMeetingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm & Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
