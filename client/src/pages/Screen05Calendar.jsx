// Stitch screen 05: Calendar and scheduling
// Matches Stitch design a6d5d3f20ba24e299d62294a4d50f1da (MeetTrack Calendar & Scheduling — Desktop)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canEditMeetings } from '../auth/permissions';
import { getMeetings } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Screen05Calendar() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isCoordinator = canEditMeetings(currentUser);

  const [meetings, setMeetings] = useState([]);
  const [currentMonth, setCurrentMonth] = useState('November 2026');
  const [selectedDay, setSelectedDay] = useState(16);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [newSlotModalOpen, setNewSlotModalOpen] = useState(false);

  useEffect(() => {
    getMeetings().then(setMeetings);
  }, []);

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  // Day meeting mapper
  const getMeetingsForDay = (day) => {
    if (day === 16) return meetings.slice(0, 2);
    if (day === 17) return meetings.slice(2, 3);
    if (day === 10) return meetings.slice(3, 4);
    return [];
  };

  const selectedDayMeetings = getMeetingsForDay(selectedDay);

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
            Calendar & scheduling
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {isCoordinator
              ? 'Coordinate quorum availability, resolve slot conflicts, and reserve session rooms.'
              : 'Inspect committee calendar schedules and quorum availability.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-surface border border-border p-1 rounded-btn flex items-center shadow-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-xs rounded-btn font-semibold transition-colors ${
                viewMode === 'month'
                  ? 'bg-text-primary text-bg font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs rounded-btn font-semibold transition-colors ${
                viewMode === 'week'
                  ? 'bg-text-primary text-bg font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Week
            </button>
          </div>

          {isCoordinator && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setNewSlotModalOpen(true)}
            >
              Add Session
            </Button>
          )}
        </div>
      </div>

      {/* Main Calendar Layout (3 cols calendar grid, 1 col day details panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (lg:col-span-8) */}
        <Card padding="p-4 sm:p-6" className="lg:col-span-8 space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-bold text-lg text-text-primary">
                {currentMonth}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => showToast('Previous month loaded', 'info')}
                className="p-1.5 rounded-btn hover:bg-surface-muted border border-border text-text-secondary"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDay(16)}
                className="px-2.5 py-1 rounded-btn bg-surface-muted text-xs font-semibold text-text-primary border border-border hover:bg-surface-hover"
              >
                Today
              </button>
              <button
                onClick={() => showToast('Next month loaded', 'info')}
                className="p-1.5 rounded-btn hover:bg-surface-muted border border-border text-text-secondary"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs font-semibold text-text-secondary uppercase pb-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {/* 3 Offset Empty Days */}
            <div className="h-20 sm:h-24 bg-surface-muted/20 border border-transparent rounded-btn" />
            <div className="h-20 sm:h-24 bg-surface-muted/20 border border-transparent rounded-btn" />
            <div className="h-20 sm:h-24 bg-surface-muted/20 border border-transparent rounded-btn" />

            {daysInMonth.map((day) => {
              const dayMtgs = getMeetingsForDay(day);
              const isSelected = selectedDay === day;
              const isToday = day === 16;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 sm:h-24 p-1.5 sm:p-2 border rounded-btn flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-tint/30 shadow-xs ring-1 ring-accent'
                      : isToday
                      ? 'border-border bg-surface-muted/60'
                      : 'border-border bg-surface hover:bg-surface-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-text-primary text-bg flex items-center justify-center text-[10px]'
                          : 'text-text-primary'
                      }`}
                    >
                      {day}
                    </span>
                    {dayMtgs.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </div>

                  {/* Meeting Chips */}
                  <div className="space-y-1 overflow-hidden">
                    {dayMtgs.map((m) => (
                      <div
                        key={m.id}
                        className="truncate text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-surface border border-border text-text-primary flex items-center gap-1"
                        title={m.title}
                      >
                        <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Details & Free Slot Finder (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <Card padding="p-5" className="space-y-4">
            <div className="border-b border-border pb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
                Daily Ledger
              </span>
              <h3 className="font-heading font-bold text-lg text-text-primary">
                November {selectedDay}, 2026
              </h3>
              <p className="text-xs text-text-secondary">
                {selectedDayMeetings.length} session
                {selectedDayMeetings.length === 1 ? '' : 's'} scheduled
              </p>
            </div>

            {/* List of meetings for day */}
            {selectedDayMeetings.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary border border-dashed border-border rounded-btn p-4">
                No quorum meetings on this day.
                {isCoordinator && (
                  <button
                    onClick={() => setNewSlotModalOpen(true)}
                    className="block mx-auto mt-2 text-text-primary font-semibold hover:underline"
                  >
                    + Reserve slot
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-card bg-surface-muted/50 border border-border space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-[10px] font-bold text-text-secondary">
                        {m.code}
                      </span>
                      <Pill status={m.status} size="sm" />
                    </div>
                    <Link
                      to={`/meetings/${m.id}`}
                      className="font-heading font-bold text-sm text-text-primary hover:underline block"
                    >
                      {m.title}
                    </Link>
                    <div className="flex items-center justify-between text-xs text-text-secondary pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        {m.startTime} – {m.endTime || '12:00'}
                      </span>
                      <Link
                        to={`/meetings/${m.id}`}
                        className="text-xs font-semibold text-text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* AI Quorum Slot Finder Helper (Stitch Prompt feature) */}
          <Card padding="p-5" className="bg-accent-tint/30 border-accent/40 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent stroke-[2.5]" />
              <h4 className="font-heading font-bold text-sm text-text-primary">
                Free Quorum Slot Finder
              </h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              AI analysis scanned designated signers. The optimal free quorum slot for tomorrow is:
            </p>
            <div className="p-2.5 rounded-btn bg-surface border border-border text-xs flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">Tomorrow, 11:30 AM – 1:00 PM</div>
                <div className="text-[10px] text-text-secondary">All 6 committee DRIs available</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-success-bg text-success font-bold text-[10px]">
                0 Conflicts
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* New Slot Modal */}
      <Modal
        isOpen={newSlotModalOpen}
        onClose={() => setNewSlotModalOpen(false)}
        title="Schedule Calendar Slot"
        description="Book a new session directly onto the committee calendar."
      >
        <div className="space-y-4 text-xs">
          <p className="text-text-secondary">
            Scheduling session for <strong>November {selectedDay}, 2026</strong>.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setNewSlotModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setNewSlotModalOpen(false);
                showToast(`New calendar slot created for Nov ${selectedDay}!`, 'success');
              }}
            >
              Confirm Reservation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

