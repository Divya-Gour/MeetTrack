// client/src/services/api.js
// Dual-Mode API service layer for MeetTrack
// In Demo Mode: operates on localStorage (mt.demo.v1) with virtual date 15 Nov 2026
// In Live Mode: makes real HTTP requests to /api scoped to current workspace

import { loadDemoState, saveDemoState, DEMO_DATE_STR } from '../data/demoStore';

function getMode() {
  return localStorage.getItem('mt.mode') || 'demo';
}

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Calculate dynamic overdue status
export function isActionOverdue(actionOrDueDate, statusArg) {
  let dueDate;
  let status;

  if (typeof actionOrDueDate === 'object' && actionOrDueDate !== null) {
    dueDate = actionOrDueDate.deadline || actionOrDueDate.dueDate;
    status = actionOrDueDate.status;
  } else {
    dueDate = actionOrDueDate;
    status = statusArg;
  }

  if (!dueDate) return false;
  if (status === 'completed' || status === 'Completed' || status === 'cancelled') return false;

  const due = new Date(dueDate);
  const mode = getMode();

  // In demo mode, compare against demo virtual date (15 Nov 2026) per spec
  const referenceDate = mode === 'demo' ? new Date(DEMO_DATE_STR) : new Date();
  return due.getTime() < referenceDate.getTime();
}

// ---------------- MEETINGS ----------------

export async function getMeetings() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.meetings];
  }

  try {
    const res = await fetch('/api/meetings');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function getMeetingById(id) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const meeting = state.meetings.find((m) => m.id === id || m.code === id);
    if (!meeting) throw new Error(`Meeting ${id} not found`);
    return { ...meeting };
  }

  const res = await fetch(`/api/meetings/${id}`);
  if (!res.ok) throw new Error('Meeting not found');
  return await res.json();
}

export async function createMeeting(meetingData) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const newMeeting = {
      id: `mtg-${Date.now()}`,
      title: meetingData.title,
      date: meetingData.date || '2026-11-30',
      time: meetingData.time || '10:00 - 11:30 IST',
      location: meetingData.location || 'Seminar Hall B-2',
      isOnline: Boolean(meetingData.isOnline),
      status: 'Scheduled',
      quorumRequired: 4,
      quorumMet: true,
      chairperson: meetingData.chairperson || 'Aarav Menon',
      recurring: meetingData.recurring || 'none',
      description: meetingData.description || '',
      attendees: state.users.map((u) => ({ id: u.id, name: u.name, role: u.role, status: 'confirmed' })),
      agenda: (meetingData.agenda || []).map((ag, idx) => ({
        id: `ag-${Date.now()}-${idx}`,
        title: typeof ag === 'string' ? ag : ag.title,
        presenter: ag.presenter || 'Aarav Menon',
        durationMin: ag.durationMin || 20,
      })),
      minutesId: null,
      minutesStatus: null,
    };
    state.meetings.unshift(newMeeting);
    saveDemoState(state);
    return newMeeting;
  }

  const res = await fetch('/api/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meetingData),
  });
  if (!res.ok) throw new Error('Failed to create meeting');
  return await res.json();
}

export async function toggleAttendance(meetingId, attendeeId, newStatus) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const meeting = state.meetings.find((m) => m.id === meetingId);
    if (meeting) {
      const att = meeting.attendees.find((a) => a.id === attendeeId);
      if (att) att.status = newStatus;
      const confirmedCount = meeting.attendees.filter((a) => a.status === 'confirmed').length;
      meeting.quorumMet = confirmedCount >= (meeting.quorumRequired || 4);
      saveDemoState(state);
      return { ...meeting };
    }
  }

  const res = await fetch(`/api/meetings/${meetingId}/attendance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendeeId, status: newStatus }),
  });
  if (!res.ok) throw new Error('Failed to toggle attendance');
  return await res.json();
}

// ---------------- MINUTES ----------------

export async function getMinutesById(id) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const minutes = state.minutes.find((m) => m.id === id || m.meetingId === id);
    if (!minutes) {
      return {
        id: `min-${Date.now()}`,
        meetingId: id,
        title: 'Draft Minutes',
        version: 1,
        status: 'draft',
        content: {
          attendanceSummary: '',
          discussionPoints: '',
          decisions: '',
          outcomes: '',
        },
      };
    }
    return { ...minutes };
  }

  const res = await fetch(`/api/minutes/${id}`);
  if (!res.ok) throw new Error('Minutes not found');
  return await res.json();
}

export async function updateMinutes(minutesId, content, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    let min = state.minutes.find((m) => m.id === minutesId);
    if (!min) {
      min = {
        id: minutesId,
        meetingId: minutesId.replace('min-', 'mtg-'),
        title: 'Meeting Minutes',
        version: 1,
        status: 'draft',
        content,
      };
      state.minutes.push(min);
    } else {
      min.content = content;
      min.version += 1;
    }
    saveDemoState(state);
    return min;
  }

  const res = await fetch(`/api/minutes/${minutesId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return await res.json();
}

export const saveMinutesDraft = updateMinutes;

export async function submitMinutesForApproval(minutesId, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId);
    if (min) {
      min.status = 'submitted';
      min.submittedBy = user?.name || 'Aarav Menon';
      min.submittedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await fetch(`/api/minutes/${minutesId}/submit`, { method: 'POST' });
  return await res.json();
}

export async function approveMinutes(minutesId, user, notes = '') {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId);
    if (min) {
      min.status = 'approved';
      min.approvedBy = user?.name || 'Ananya Desai';
      min.approvedAt = new Date().toISOString();
      min.reviewNotes = notes;
      saveDemoState(state);
      return min;
    }
  }

  const res = await fetch(`/api/minutes/${minutesId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return await res.json();
}

export async function returnMinutes(minutesId, comment, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId);
    if (min) {
      min.status = 'returned';
      min.reviewNotes = comment;
      min.returnedBy = user?.name || 'Ananya Desai';
      min.returnedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await fetch(`/api/minutes/${minutesId}/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  return await res.json();
}

export async function publishMinutes(minutesId, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId);
    if (min) {
      min.status = 'published';
      min.publishedBy = user?.name || 'Aarav Menon';
      min.publishedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await fetch(`/api/minutes/${minutesId}/publish`, { method: 'POST' });
  return await res.json();
}

// ---------------- ACTIONS ----------------

export async function getActions() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.actions];
  }

  try {
    const res = await fetch('/api/actions');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function createAction(actionData) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const newAction = {
      id: `act-${Date.now()}`,
      title: actionData.title,
      dri: actionData.dri || actionData.ownerName || 'Priya Nair',
      priority: actionData.priority || 'Medium',
      deadline: actionData.deadline || actionData.dueDate || '2026-11-28',
      status: 'pending',
      progressPercent: 0,
      sourceMeeting: actionData.sourceMeeting || '',
      notes: actionData.description || actionData.notes || '',
      blocker: null,
    };
    state.actions.unshift(newAction);
    saveDemoState(state);
    return newAction;
  }

  const res = await fetch('/api/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(actionData),
  });
  return await res.json();
}

export async function updateAction(actionId, updates) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const act = state.actions.find((a) => a.id === actionId);
    if (act) {
      Object.assign(act, updates);
      saveDemoState(state);
      return act;
    }
  }

  const res = await fetch(`/api/actions/${actionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return await res.json();
}

export async function updateActionStatus(actionId, newStatus) {
  return updateAction(actionId, { status: newStatus });
}

export async function reassignAction(actionId, newDriName) {
  return updateAction(actionId, { dri: newDriName });
}

export async function reportActionBlocker(actionId, reason) {
  return updateAction(actionId, {
    status: 'blocked',
    blocker: {
      isBlocked: true,
      reason,
      reportedAt: new Date().toISOString(),
    },
  });
}

export const logActionBlocker = reportActionBlocker;

export async function resolveActionBlocker(actionId) {
  return updateAction(actionId, {
    status: 'in_progress',
    blocker: null,
  });
}

// ---------------- DECISIONS ----------------

export async function getDecisions() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.decisions];
  }

  try {
    const res = await fetch('/api/decisions');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function createDecision(decisionData) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionData.title,
      description: decisionData.description || '',
      category: decisionData.category || 'General',
      impact: decisionData.impact || 'Medium',
      voteSummary: decisionData.voteSummary || { for: 4, against: 0, abstain: 0 },
      meetingTitle: decisionData.meetingTitle || 'Organising Committee Session',
      status: 'Active',
      followUps: [],
      recordedAt: '2026-11-15',
    };
    state.decisions.unshift(newDecision);
    saveDemoState(state);
    return newDecision;
  }

  const res = await fetch('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(decisionData),
  });
  return await res.json();
}

export async function updateFollowUpItemStatus(decisionId, followUpId, newStatus) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const dec = state.decisions.find((d) => d.id === decisionId);
    if (dec && dec.followUps) {
      const fup = dec.followUps.find((f) => f.id === followUpId);
      if (fup) fup.status = newStatus;
      saveDemoState(state);
      return dec;
    }
  }
}

// ---------------- NOTIFICATIONS ----------------

export async function getNotifications() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.notifications];
  }

  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function markNotificationRead(notifId) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const n = state.notifications.find((notif) => notif.id === notifId);
    if (n) {
      n.unread = false;
      saveDemoState(state);
    }
    return n;
  }

  const res = await fetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
  return await res.json();
}

export async function clearAllNotifications() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    state.notifications = [];
    saveDemoState(state);
    return [];
  }

  const res = await fetch('/api/notifications', { method: 'DELETE' });
  return [];
}

// ---------------- ADMIN & WORKSPACE ----------------

export async function getWorkspace() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().workspace;
  }

  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    return data.workspace;
  } catch (err) {
    return null;
  }
}

export async function getUsers() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().users;
  }

  try {
    const res = await fetch('/api/admin/members');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}

export async function updateUserRole(userId, newRole) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const user = state.users.find((u) => u.id === userId);
    if (user) {
      user.role = newRole;
      saveDemoState(state);
      return user;
    }
  }

  const res = await fetch(`/api/admin/members/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: newRole }),
  });
  return await res.json();
}

export async function getAuditLog() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().auditLog;
  }

  try {
    const res = await fetch('/api/admin/audit');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    return [];
  }
}
