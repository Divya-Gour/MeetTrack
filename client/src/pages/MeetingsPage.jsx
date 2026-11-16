// Stitch screen 04: Meeting management
// Matches Stitch design b9c96985a9334338b8f3f428823638b1 (Coordinator) and 8343a0e0759c48f4a3d762cc52b4589b (Participant)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MoreVertical,
  FileText,
  Video,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canEditMeetings } from '../auth/permissions';
import { getMeetings } from '../services/api';
import Pill from '../components/Pill';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function MeetingsPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isCoordinator = canEditMeetings(currentUser);

  const [meetings, setMeetings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);

  // New meeting form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('2026-11-22');
  const [startTime, setStartTime] = useState('11:00');
  const [quorumReq, setQuorumReq] = useState('6');

  useEffect(() => {
    getMeetings().then(setMeetings);
  }, []);

  const filteredMeetings = meetings.filter((m) => {
    const matchesStatus = filterStatus === 'All' || m.status === filterStatus;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newM = {
      id: `mtg-${Date.now()}`,
      code: `MT-2026-${String(meetings.length + 45).padStart(3, '0')}`,
      title,
      date,
      startTime,
      status: 'Scheduled',
      quorumRequired: parseInt(quorumReq, 10) || 6,
      quorumReached: false,
      attendees: [{ name: currentUser.name, role: currentUser.role, signedIn: true }],
      agenda: [{ order: 1, title: 'Session Introduction & Roll Call' }],
    };

    setMeetings([newM, ...meetings]);
    setNewMeetingModalOpen(false);
    setTitle('');
    showToast(`Meeting "${newM.title}" added to governance register`, 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Meeting management
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-muted text-text-secondary text-xs font-mono font-semibold">
              {meetings.length} sessions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {isCoordinator
              ? 'Schedule, configure quorums, and supervise live governance sessions.'
              : 'View upcoming and concluded quorum sessions across your committees.'}
          </p>
        </div>

        {isCoordinator && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setNewMeetingModalOpen(true)}
          >
            New meeting
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border rounded-card p-3 shadow-xs">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['All', 'In Progress', 'Scheduled', 'Concluded'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-btn text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? 'bg-text-primary text-bg shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by code or title..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface-muted/60 border border-border rounded-input text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Meetings List */}
      {filteredMeetings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No matching meetings found"
          description="Try selecting a different filter status or clearing your search keywords."
          actionLabel={isCoordinator ? 'Schedule New Meeting' : undefined}
          onAction={isCoordinator ? () => setNewMeetingModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMeetings.map((mtg) => (
            <Card
              key={mtg.id}
              className="hover:border-accent transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-text-secondary">
                    {mtg.code}
                  </span>
                  <Link
                    to={`/meetings/${mtg.id}`}
                    className="font-heading font-bold text-base text-text-primary hover:underline"
                  >
                    {mtg.title}
                  </Link>
                  <Pill status={mtg.status} size="sm" />
                  {mtg.quorumReached && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-success bg-success-bg px-2 py-0.5 rounded-full border border-success-border">
                      <CheckCircle2 className="w-3 h-3" />
                      Quorum Achieved
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-secondary line-clamp-1 max-w-2xl">
                  {mtg.description || 'Quarterly governance committee review and agenda follow-up.'}
                </p>

                <div className="flex items-center gap-4 text-xs text-text-secondary font-mono flex-wrap">
                  <span className="flex items-center gap-1 text-text-primary font-medium">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    {mtg.date} • {mtg.startTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {mtg.attendees?.length || 4} Attendees ({mtg.quorumRequired || 6} Quorum Req.)
                  </span>
                  <span>{mtg.agenda?.length || 2} Agendas</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-start lg:self-center shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border w-full lg:w-auto justify-end">
                <Link
                  to={`/meetings/${mtg.id}`}
                  className="px-3.5 py-2 rounded-btn bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-semibold border border-border transition-colors flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Agenda & Details</span>
                </Link>

                <Link
                  to={`/minutes/${mtg.minutesId || mtg.id || 'min-1'}`}
                  className="px-3.5 py-2 rounded-btn bg-accent text-accent-text hover:bg-accent-hover text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Minutes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Meeting Modal */}
      <Modal
        isOpen={newMeetingModalOpen}
        onClose={() => setNewMeetingModalOpen(false)}
        title="Schedule Governance Meeting"
        description="Configure agenda requirements, session quorum threshold, and committee notifications."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Meeting Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Audit Sign-off Quorum"
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Quorum Members Threshold</label>
            <input
              type="number"
              min="1"
              max="20"
              value={quorumReq}
              onChange={(e) => setQuorumReq(e.target.value)}
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setNewMeetingModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

