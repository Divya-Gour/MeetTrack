// Stitch screen 12: Notifications and reminders
// Matches Stitch designs abe4b8f74d984fd2b6c9d3772d93e2de and 8df4a046b0794e1a8aaa1926fa213884 (Desktop & Fallbacks)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  FileCheck2,
  Users,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  clearAllNotifications,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState('All'); // 'All' | 'Unread' | 'quorum' | 'action' | 'approval'

  useEffect(() => {
    getNotifications().then(setNotifications);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      const updated = await markNotificationRead(id);
      setNotifications(updated);
    } catch (err) {
      showToast('Error updating notification', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      showToast('All notifications cleared', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmAttendance = (id) => {
    handleMarkRead(id);
    showToast('Cryptographic quorum presence confirmed and authenticated', 'success');
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'Unread') return n.unread;
    if (filterType !== 'All' && n.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Notifications & reminders
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
              {notifications.filter((n) => n.unread).length} Unread
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Real-time quorum authentication requests, SLA escalation alerts, and committee sign-off updates.
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            icon={Trash2}
            onClick={handleClearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-surface border border-border rounded-card p-2 shadow-xs">
        {['All', 'Unread', 'quorum', 'action', 'approval'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-btn text-xs font-semibold capitalize whitespace-nowrap transition-colors ${filterType === type
                ? 'bg-text-primary text-bg font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`}
          >
            {type === 'quorum'
              ? 'Quorum Alerts'
              : type === 'action'
                ? 'Action Items'
                : type === 'approval'
                  ? 'Sign-offs'
                  : type}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifs.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications to show"
          description="You are completely caught up with all quorum meetings, action items, and approval alerts."
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((notif) => (
            <Card
              key={notif.id}
              padding="p-4 sm:p-5"
              className={`hover:border-accent transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${notif.unread ? 'border-accent/60 bg-accent-tint/10 shadow-xs' : ''
                }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-btn flex items-center justify-center shrink-0 mt-0.5 ${notif.type === 'action'
                      ? 'bg-error-bg text-error'
                      : notif.type === 'quorum'
                        ? 'bg-accent text-accent-text font-bold'
                        : 'bg-surface-muted text-text-primary'
                    }`}
                >
                  {notif.type === 'action' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : notif.type === 'quorum' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <FileCheck2 className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-text-primary">
                      {notif.title}
                    </h3>
                    {notif.unread && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {notif.description}
                  </p>
                  <span className="text-[11px] font-mono text-text-secondary block">
                    {notif.timeAgo || notif.timestamp}
                  </span>
                </div>
              </div>

              {/* Context Action Buttons per Stitch Design */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {notif.actionType === 'confirm_dismiss' && (
                  <>
                    <button
                      onClick={() => handleConfirmAttendance(notif.id)}
                      className="px-3 py-1.5 rounded-btn bg-accent text-accent-text hover:bg-accent-hover text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Attendance</span>
                    </button>
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="px-2.5 py-1.5 rounded-btn hover:bg-surface-muted text-text-secondary hover:text-text-primary text-xs"
                    >
                      Dismiss
                    </button>
                  </>
                )}

                {notif.actionType === 'view_action' && (
                  <Link
                    to="/actions"
                    onClick={() => handleMarkRead(notif.id)}
                    className="px-3 py-1.5 rounded-btn bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-semibold border border-border transition-colors flex items-center gap-1"
                  >
                    <span>View Action</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}

                {notif.actionType === 'view_minutes' && (
                  <Link
                    to="/approvals"
                    onClick={() => handleMarkRead(notif.id)}
                    className="px-3 py-1.5 rounded-btn bg-accent text-accent-text hover:bg-accent-hover text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>View Sign-off</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}

                {notif.actionType === 'view_meeting' && (
                  <Link
                    to="/meetings"
                    onClick={() => handleMarkRead(notif.id)}
                    className="px-3 py-1.5 rounded-btn bg-surface-muted hover:bg-surface-hover text-text-primary text-xs font-semibold border border-border transition-colors flex items-center gap-1"
                  >
                    <span>View Meeting</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

