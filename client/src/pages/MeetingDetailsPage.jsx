// Stitch screen 06: Meeting details and agenda
// Matches Stitch design 1d10df0569df46bdab22f02aebddfdd7 (Coordinator) and 852cdda860e04476be89c7fe70d7e2ee (Participant)
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  FileText,
  Plus,
  ArrowLeft,
  Check,
  X,
  ExternalLink,
  Shield,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canEditMeetings } from '../auth/permissions';
import { getMeetingById } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function MeetingDetailsPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isCoordinator = canEditMeetings(currentUser);

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('agenda'); // 'agenda' | 'attendance' | 'decisions'
  const [addAgendaModalOpen, setAddAgendaModalOpen] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDuration, setAgendaDuration] = useState('20');
  const [agendaPresenter, setAgendaPresenter] = useState('Sarah Chen');

  useEffect(() => {
    getMeetingById(id || 'mtg-101')
      .then(setMeeting)
      .catch(() => {
        // Fallback to primary meeting
        getMeetingById('mtg-101').then(setMeeting);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !meeting) {
    return (
      <div className="py-20 text-center text-text-secondary animate-fade-in font-mono text-xs">
        Loading quorum meeting details...
      </div>
    );
  }

  const handleAddAgenda = (e) => {
    e.preventDefault();
    if (!agendaTitle.trim()) return;

    const newAgenda = {
      id: `ag-${Date.now()}`,
      order: (meeting.agenda?.length || 0) + 1,
      title: agendaTitle,
      durationMinutes: parseInt(agendaDuration, 10) || 15,
      presenter: agendaPresenter,
      notes: '',
      hasActions: false,
    };

    setMeeting({
      ...meeting,
      agenda: [...(meeting.agenda || []), newAgenda],
    });
    setAddAgendaModalOpen(false);
    setAgendaTitle('');
    showToast('Agenda item appended to quorum protocol', 'success');
  };

  const toggleAttendance = (attendeeIdx) => {
    if (!isCoordinator) {
      showToast('Only Coordinators can record attendance sign-offs', 'info');
      return;
    }
    const updated = [...meeting.attendees];
    const curr = updated[attendeeIdx];
    curr.signedIn = !curr.signedIn;
    curr.attendance = curr.signedIn ? 'Present' : 'Absent';
    setMeeting({ ...meeting, attendees: updated });
    showToast(`Updated attendance for ${curr.name}`, 'info');
  };

  const signedInCount = meeting.attendees?.filter((a) => a.signedIn).length || 0;

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <Link to="/meetings" className="hover:text-text-primary transition-colors">
          Meetings
        </Link>
        <span>/</span>
        <span className="font-mono text-text-primary font-semibold">{meeting.code}</span>
      </div>

      {/* Meeting Hero Banner */}
      <Card padding="p-6" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-muted border border-border">
                {meeting.code}
              </span>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
                {meeting.title}
              </h1>
              <Pill status={meeting.status} />
              {signedInCount >= (meeting.quorumRequired || 6) && (
                <span className="px-2.5 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quorum Established ({signedInCount}/{meeting.quorumRequired || 6})
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl leading-relaxed">
              {meeting.description}
            </p>

            <div className="flex items-center gap-5 text-xs text-text-secondary font-mono pt-1 flex-wrap">
              <span className="flex items-center gap-1.5 text-text-primary font-medium">
                <Clock className="w-3.5 h-3.5 text-accent" />
                {meeting.date} • {meeting.startTime} – {meeting.endTime || '11:45 AM'}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {meeting.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Presiding: {meeting.organizerName}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <Link
              to={`/minutes/${meeting.minutesId || meeting.id || 'min-1'}`}
              className="px-4 py-2 rounded-btn bg-accent text-accent-text hover:bg-accent-hover text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Minutes Editor</span>
            </Link>
            <Button
              variant="secondary"
              size="md"
              icon={Download}
              onClick={() => showToast('Exporting executive meeting packet...', 'info')}
            >
              Export Packet
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs: Agenda / Quorum Attendance / Pre-Meeting Decisions */}
      <div className="border-b border-border flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'agenda'
              ? 'border-accent text-text-primary font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Agenda Items ({meeting.agenda?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 transition-colors border-b-2 ${
            activeTab === 'attendance'
              ? 'border-accent text-text-primary font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Quorum Roll Call ({signedInCount}/{meeting.attendees?.length || 0})
        </button>
      </div>

      {/* TAB 1: AGENDA ITEMS */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Agendas carry unresolved commitments and roll over automatically into subsequent sessions.
            </span>
            {isCoordinator && (
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setAddAgendaModalOpen(true)}
              >
                Add Agenda
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {meeting.agenda?.map((ag) => (
              <Card key={ag.id} padding="p-4 sm:p-5" className="hover:border-accent transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-btn bg-surface-muted text-text-primary flex items-center justify-center font-mono font-bold text-xs">
                        {ag.order}
                      </span>
                      <h3 className="font-heading font-bold text-base text-text-primary">
                        {ag.title}
                      </h3>
                    </div>
                    {ag.notes && (
                      <p className="text-xs text-text-secondary pl-8 leading-relaxed">
                        {ag.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-medium text-text-secondary block">
                      {ag.durationMinutes} mins
                    </span>
                    <span className="text-[11px] text-text-primary font-semibold">
                      Presenter: {ag.presenter}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE ROLL CALL */}
      {activeTab === 'attendance' && (
        <Card padding="p-5" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-text-primary">
                Designated Quorum Roll Call
              </h3>
              <p className="text-xs text-text-secondary">
                {isCoordinator ? 'Click toggle to mark authenticated participant attendance.' : 'Read-only committee authentication.'}
              </p>
            </div>
            <span className="font-mono text-xs text-text-primary font-bold">
              Quorum: {signedInCount} / {meeting.quorumRequired || 6} required
            </span>
          </div>

          <div className="divide-y divide-border">
            {meeting.attendees?.map((att, idx) => (
              <div
                key={idx}
                className="py-3 flex items-center justify-between text-xs hover:bg-surface-muted/40 transition-colors px-2 rounded-btn"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-muted text-text-primary flex items-center justify-center font-bold text-xs">
                    {att.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-text-primary block">{att.name}</span>
                    <span className="text-[11px] text-text-secondary">{att.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {att.time && (
                    <span className="font-mono text-[11px] text-text-secondary">
                      Signed in at {att.time}
                    </span>
                  )}
                  <button
                    onClick={() => toggleAttendance(idx)}
                    disabled={!isCoordinator}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      att.signedIn
                        ? 'bg-success-bg text-success border border-success-border'
                        : 'bg-surface-muted text-text-secondary border border-border'
                    }`}
                  >
                    {att.signedIn ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{att.signedIn ? 'Authenticated' : 'Absent'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Agenda Modal */}
      <Modal
        isOpen={addAgendaModalOpen}
        onClose={() => setAddAgendaModalOpen(false)}
        title="Add Agenda Item"
        description="Insert an agenda discussion topic into this meeting's protocol."
      >
        <form onSubmit={handleAddAgenda} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Agenda Title</label>
            <input
              type="text"
              required
              value={agendaTitle}
              onChange={(e) => setAgendaTitle(e.target.value)}
              placeholder="e.g. Q4 Cloud Reserve Allocation Review"
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Allocated Minutes</label>
              <input
                type="number"
                value={agendaDuration}
                onChange={(e) => setAgendaDuration(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Lead Presenter</label>
              <input
                type="text"
                value={agendaPresenter}
                onChange={(e) => setAgendaPresenter(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setAddAgendaModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add Agenda Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

