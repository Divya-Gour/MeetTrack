// client/src/services/api.js
// Dual-Mode API service layer for MeetTrack
// In Demo Mode: operates on localStorage (mt.demo.v1) with virtual date 15 Nov 2026
// In Live Mode: makes real HTTP requests to /api with credentials: 'include' and X-Requested-With: meettrack

import { loadDemoState, saveDemoState, DEMO_DATE_STR } from '../data/demoStore';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getMode() {
  return localStorage.getItem('mt.mode') || 'demo';
}

const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

// Core API Request Helper per Section 4
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    ...(options.headers || {}),
  };

  // Rule 3: For POST, PATCH, PUT and DELETE, always add header X-Requested-With: meettrack
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(method)) {
    headers['X-Requested-With'] = 'meettrack';
  }

  // Rule 4: Send Content-Type: application/json when there is a body
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include', // Rule 2: Send credentials: 'include'
  });

  const contentType = res.headers.get('content-type') || '';
  let bodyData = null;

  if (contentType.includes('application/json')) {
    bodyData = await res.json().catch(() => null);
  } else if (contentType.includes('text/csv') || contentType.includes('text/plain') || contentType.includes('text/calendar')) {
    bodyData = await res.text();
  }

  if (!res.ok) {
    const errorObj = (bodyData && bodyData.error) || {
      code: res.status === 404 ? 'NOT_FOUND' : (res.status === 403 ? 'FORBIDDEN' : 'REQUEST_FAILED'),
      message: (bodyData && bodyData.error && bodyData.error.message) || `HTTP ${res.status}: ${res.statusText}`,
    };
    const err = new Error(errorObj.message);
    err.status = res.status;
    err.code = errorObj.code;
    err.fields = errorObj.fields;
    err.retryAfterSeconds = errorObj.retryAfterSeconds;
    throw err;
  }

  return bodyData;
}

// User-friendly error code mapping per Section 4 Rule 7
export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'The email or password is incorrect.';
    case 'ACCOUNT_LOCKED':
      return error.retryAfterSeconds
        ? `Account is temporarily locked. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minutes.`
        : 'Account is temporarily locked due to repeated failed login attempts. Try again in 15 minutes.';
    case 'RATE_LIMITED':
    case 'ASSISTANT_LIMIT':
      return error.retryAfterSeconds
        ? `Limit reached. Please wait ${error.retryAfterSeconds} seconds before trying again.`
        : 'Rate limit exceeded. Please try again later.';
    case 'VALIDATION_FAILED':
      return error.message || 'Please correct the highlighted fields.';
    case 'WEAK_PASSWORD':
      return 'Password does not meet requirements (minimum 8 chars, 1 number, 1 symbol, no email parts).';
    case 'ALREADY_MEMBER':
      return 'This person is already in the workspace.';
    case 'SETUP_ALREADY_DONE':
      return 'Workspace setup is already completed. Please sign in.';
    case 'INVITE_EXPIRED':
      return 'This invitation link has expired.';
    case 'INVITE_USED':
      return 'This invitation link has already been used.';
    case 'INVITE_REVOKED':
      return 'This invitation link has been revoked.';
    case 'INVITE_NOT_FOUND':
      return 'Invitation link not found.';
    case 'ASSISTANT_UNAVAILABLE':
      return 'AI assistant is currently unavailable.';
    case 'ASSISTANT_ERROR':
      return 'The AI assistant encountered a processing error.';
    case 'INPUT_TOO_LARGE':
      return 'Input message exceeds length limits.';
    case 'VERSION_CONFLICT':
      return 'This document has been updated by someone else. Conflict resolution required.';
    case 'FORBIDDEN':
      return 'You do not have permission to perform this action.';
    case 'NOT_FOUND':
      return 'Requested resource was not found.';
    default:
      return error.message || 'Request failed';
  }
}

// Helper: Calculate dynamic overdue status
export function isActionOverdue(actionOrDueDate, statusArg) {
  if (actionOrDueDate && typeof actionOrDueDate === 'object') {
    if (actionOrDueDate.overdue !== undefined) {
      return Boolean(actionOrDueDate.overdue);
    }
  }

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

// ---------------- AUTH & SETUP ----------------

export async function getSetupStatus() {
  const mode = getMode();
  if (mode === 'demo') {
    return { setupComplete: true };
  }
  return await apiRequest('/setup/status');
}

export async function setupWorkspace(payload) {
  const res = await apiRequest('/setup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function login({ email, password }) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

export async function logout() {
  const mode = getMode();
  if (mode === 'live') {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {}
  }
}

export async function getCurrentUser() {
  const mode = getMode();
  if (mode === 'demo') {
    const state = loadDemoState();
    return {
      user: state.currentUser || state.users[1],
      workspace: state.workspace,
      membership: { role: (state.currentUser || state.users[1]).role.toLowerCase(), approver: (state.currentUser || state.users[1]).isApprover },
    };
  }
  return await apiRequest('/auth/me');
}

export async function forgotPassword({ email }) {
  return await apiRequest('/auth/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword({ token, password }) {
  return await apiRequest('/auth/reset', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function changePassword({ currentPassword, newPassword }) {
  return await apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ---------------- INVITATIONS ----------------

export async function getInviteInfo(token) {
  const res = await apiRequest(`/invites/token/${token}`);
  return res.data;
}

export async function acceptInvite(token, { name, password }) {
  const res = await apiRequest(`/invites/token/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify({ name, password }),
  });
  return res.data;
}

export async function getInvites() {
  const mode = getMode();
  if (mode === 'demo') return [];
  const res = await apiRequest('/invites');
  return res.data || [];
}

export async function createInvite(data) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return {
      _id: `inv-${Date.now()}`,
      email: data.email,
      role: data.role,
      approver: Boolean(data.approver),
      status: 'pending',
    };
  }
  const res = await apiRequest('/invites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function resendInvite(id) {
  const res = await apiRequest(`/invites/${id}/resend`, { method: 'POST' });
  return res.data;
}

export async function revokeInvite(id) {
  const res = await apiRequest(`/invites/${id}/revoke`, { method: 'POST' });
  return res.data;
}

// ---------------- DASHBOARD ----------------

export async function getDashboard() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const now = new Date(DEMO_DATE_STR);
    const overdue = state.actions.filter((a) => isDemoActionOverdue(a)).length;
    return {
      meetingsTotal: state.meetings.length,
      actionsTotal: state.actions.length,
      actionsCompleted: state.actions.filter((a) => a.status === 'completed').length,
      actionsOverdue: overdue,
      decisionsTotal: state.decisions.length,
      upcomingMeetings: state.meetings.slice(0, 3),
      myActions: state.actions.slice(0, 5),
    };
  }

  const res = await apiRequest('/dashboard');
  return res.data;
}

// ---------------- MEETINGS ----------------

export async function getMeetings(filters = {}) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.meetings];
  }

  const query = new URLSearchParams(filters).toString();
  const res = await apiRequest(`/meetings${query ? `?${query}` : ''}`);
  const list = res.data || [];
  return list.map((m) => ({
    ...m,
    id: m.id || m._id,
    code: m.code || `MT-${String(m._id || '').slice(-4).toUpperCase()}`,
    date: m.date || (m.startsAt ? new Date(m.startsAt).toISOString().split('T')[0] : '2026-11-20'),
    time: m.time || (m.startsAt ? `${new Date(m.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${m.endsAt ? new Date(m.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}` : '10:00 - 11:30'),
    startTime: m.startTime || (m.startsAt ? new Date(m.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
    location: m.location || m.venue || (m.onlineLink ? 'Online' : 'Seminar Hall B-2'),
    organizerName: m.organizerName || m.organiserId?.name || 'Chairperson',
  }));
}

export async function getMeetingById(id) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const meeting = state.meetings.find((m) => m.id === id || m.code === id || m._id === id);
    if (!meeting) throw new Error(`Meeting ${id} not found`);
    return { ...meeting };
  }

  const res = await apiRequest(`/meetings/${id}`);
  const m = res.data || res;
  return {
    ...m,
    id: m.id || m._id,
    code: m.code || `MT-${String(m._id || '').slice(-4).toUpperCase()}`,
    date: m.date || (m.startsAt ? new Date(m.startsAt).toISOString().split('T')[0] : '2026-11-20'),
    startTime: m.startTime || (m.startsAt ? new Date(m.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM'),
    location: m.location || m.venue || (m.onlineLink ? 'Online' : 'Seminar Hall B-2'),
    organizerName: m.organizerName || m.organiserId?.name || 'Chairperson',
    attendees: (m.attendance || m.attendees || []).map((att) => ({
      ...att,
      id: att.userId?._id || att.userId || att.id || att._id,
      name: att.userId?.name || att.name || 'Member',
      role: att.userId?.role || att.role || 'Participant',
      signedIn: att.signedIn || att.status === 'present',
      status: att.status || (att.signedIn ? 'present' : 'absent'),
    })),
    agenda: (m.agenda || []).map((ag, idx) => ({
      ...ag,
      id: ag.id || ag._id,
      order: ag.order || (idx + 1),
      title: ag.title,
      durationMinutes: ag.durationMinutes || ag.minutes || 15,
      presenter: ag.presenter || ag.presenterId?.name || 'Presenter',
    })),
  };
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
      location: meetingData.location || meetingData.venue || 'Seminar Hall B-2',
      isOnline: Boolean(meetingData.isOnline),
      status: 'scheduled',
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

  // Format startsAt and endsAt for server
  const payload = {
    title: meetingData.title,
    type: meetingData.type || 'regular',
    startsAt: meetingData.startsAt || new Date(`${meetingData.date}T${(meetingData.time || '10:00').split(' - ')[0]}:00`),
    endsAt: meetingData.endsAt || new Date(new Date(meetingData.startsAt || `${meetingData.date}T10:00:00`).getTime() + 90 * 60000),
    venue: meetingData.location || meetingData.venue || '',
    onlineLink: meetingData.onlineLink || '',
    recurrence: meetingData.recurring || meetingData.recurrence || 'none',
  };

  const res = await apiRequest('/meetings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateMeeting(id, meetingData) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const m = state.meetings.find((x) => x.id === id || x._id === id);
    if (m) {
      Object.assign(m, meetingData);
      saveDemoState(state);
      return m;
    }
  }

  const res = await apiRequest(`/meetings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(meetingData),
  });
  return res.data;
}

export async function cancelMeeting(id, reason) {
  const res = await apiRequest(`/meetings/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export async function toggleAttendance(meetingId, attendeeId, newStatus) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const meeting = state.meetings.find((m) => m.id === meetingId || m._id === meetingId);
    if (meeting) {
      const att = meeting.attendees.find((a) => a.id === attendeeId || a.userId === attendeeId);
      if (att) att.status = newStatus;
      const confirmedCount = meeting.attendees.filter((a) => a.status === 'confirmed' || a.status === 'present').length;
      meeting.quorumMet = confirmedCount >= (meeting.quorumRequired || 4);
      saveDemoState(state);
      return { ...meeting };
    }
  }

  const res = await apiRequest(`/meetings/${meetingId}/attendance`, {
    method: 'PUT',
    body: JSON.stringify({
      records: [{ userId: attendeeId, status: newStatus }],
    }),
  });
  return res.data;
}

export async function updateMeetingAttendance(meetingId, records) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const m = state.meetings.find((x) => x.id === meetingId);
    if (m) {
      records.forEach((r) => {
        const att = m.attendees.find((a) => a.id === r.userId);
        if (att) att.status = r.status;
      });
      saveDemoState(state);
      return m;
    }
  }

  const res = await apiRequest(`/meetings/${meetingId}/attendance`, {
    method: 'PUT',
    body: JSON.stringify({ records }),
  });
  return res.data;
}

export async function addAgendaItem(meetingId, item) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const m = state.meetings.find((x) => x.id === meetingId || x._id === meetingId);
    if (!m) throw new Error('Meeting not found');
    const newItem = {
      id: `ag-${Date.now()}`,
      order: (m.agenda?.length || 0) + 1,
      title: item.title,
      durationMinutes: item.durationMinutes || item.minutes || 15,
      presenter: item.presenter || item.presenterName || 'Aarav Menon',
      notes: item.notes || '',
      hasActions: false,
    };
    m.agenda = [...(m.agenda || []), newItem];
    saveDemoState(state);
    return newItem;
  }

  const res = await apiRequest(`/meetings/${meetingId}/agenda`, {
    method: 'POST',
    body: JSON.stringify({
      title: item.title,
      presenterId: item.presenterId || item.presenter,
      minutes: parseInt(item.durationMinutes || item.minutes || 15, 10),
    }),
  });
  return res.data;
}

export async function updateAgendaItem(itemId, item) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    for (const m of state.meetings) {
      const ag = m.agenda?.find((a) => a.id === itemId);
      if (ag) {
        Object.assign(ag, item);
        saveDemoState(state);
        return ag;
      }
    }
    return item;
  }

  const res = await apiRequest(`/agenda/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(item),
  });
  return res.data;
}

export async function deleteAgendaItem(itemId, meetingId) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const m = state.meetings.find((x) => x.id === meetingId || x._id === meetingId);
    if (m && m.agenda) {
      m.agenda = m.agenda.filter((a) => a.id !== itemId);
      saveDemoState(state);
    }
    return { ok: true };
  }

  const res = await apiRequest(`/agenda/${itemId}`, {
    method: 'DELETE',
  });
  return res.data;
}

export async function reorderAgendaItems(meetingId, order) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const m = state.meetings.find((x) => x.id === meetingId || x._id === meetingId);
    if (m && m.agenda) {
      const map = new Map(m.agenda.map((a) => [a.id, a]));
      m.agenda = order.map((id, idx) => {
        const item = map.get(id);
        return item ? { ...item, order: idx + 1 } : null;
      }).filter(Boolean);
      saveDemoState(state);
      return m.agenda;
    }
  }

  const res = await apiRequest(`/meetings/${meetingId}/agenda/reorder`, {
    method: 'POST',
    body: JSON.stringify({ order }),
  });
  return res.data;
}

export function getMeetingIcsUrl(meetingId) {
  return `${API_BASE}/meetings/${meetingId}/ics`;
}

export function getCalendarIcsUrl() {
  return `${API_BASE}/meetings/calendar.ics`;
}

export function getMinutesPdfUrl(minutesId) {
  return `${API_BASE}/minutes/${minutesId}/pdf`;
}

// ---------------- MINUTES ----------------

export async function getMinutesById(id) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const minutes = state.minutes.find((m) => m.id === id || m.meetingId === id || m._id === id);
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

  const res = await apiRequest(`/meetings/${id}/minutes`);
  const min = res.data || res;
  return {
    ...min,
    id: min.id || min._id,
    meetingId: min.meetingId?._id || min.meetingId || id,
    meetingTitle: min.meetingId?.title || min.meetingTitle || 'Meeting Minutes',
    meetingCode: min.meetingCode || `MT-${String(min.meetingId?._id || min.meetingId || id).slice(-4).toUpperCase()}`,
    currentVersion: min.currentVersion ? `v${min.currentVersion}.0` : 'v1.0',
    status: min.status ? min.status.charAt(0).toUpperCase() + min.status.slice(1) : 'Draft',
    lastModifiedBy: min.submittedBy?.name || min.lastModifiedBy || 'Coordinator',
  };
}

export async function updateMinutes(minutesId, content, user, currentVersion = 1) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    let min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
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
      min.version = (min.version || 1) + 1;
    }
    saveDemoState(state);
    return min;
  }

  const bodyStr = typeof content === 'string' ? content : (content.body || JSON.stringify(content));
  const res = await apiRequest(`/minutes/${minutesId}/draft`, {
    method: 'PUT',
    headers: {
      'If-Match': String(currentVersion),
    },
    body: JSON.stringify({
      body: bodyStr,
      changeNote: content.changeNote || 'Autosave draft update',
    }),
  });
  return res.data;
}

export const saveMinutesDraft = updateMinutes;

export async function submitMinutesForApproval(minutesId, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min) {
      min.status = 'submitted';
      min.submittedBy = user?.name || 'Aarav Menon';
      min.submittedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await apiRequest(`/minutes/${minutesId}/submit`, { method: 'POST' });
  return res.data;
}

export async function approveMinutes(minutesId, user, notes = '') {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min) {
      min.status = 'approved';
      min.approvedBy = user?.name || 'Ananya Desai';
      min.approvedAt = new Date().toISOString();
      min.reviewNotes = notes;
      saveDemoState(state);
      return min;
    }
  }

  const res = await apiRequest(`/minutes/${minutesId}/approve`, { method: 'POST' });
  return res.data;
}

export async function returnMinutes(minutesId, comment, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min) {
      min.status = 'returned';
      min.reviewNotes = comment;
      min.returnedBy = user?.name || 'Ananya Desai';
      min.returnedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await apiRequest(`/minutes/${minutesId}/return`, {
    method: 'POST',
    body: JSON.stringify({ comment }),
  });
  return res.data;
}

export async function publishMinutes(minutesId, user) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min) {
      min.status = 'published';
      min.publishedBy = user?.name || 'Aarav Menon';
      min.publishedAt = new Date().toISOString();
      saveDemoState(state);
      return min;
    }
  }

  const res = await apiRequest(`/minutes/${minutesId}/publish`, { method: 'POST' });
  return res.data;
}

export async function getMinutesVersions(minutesId) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min && min.versions && min.versions.length) {
      return min.versions;
    }
    return [
      {
        version: min?.version || 2,
        changeNote: 'Latest approved committee revision',
        createdAt: new Date().toISOString(),
        editedBy: { name: min?.lastModifiedBy || 'Aarav Menon' },
      },
      {
        version: 1,
        changeNote: 'Initial draft submitted by Aarav Menon',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        editedBy: { name: 'Aarav Menon' },
      },
    ];
  }

  const res = await apiRequest(`/minutes/${minutesId}/versions`);
  return res.data || [];
}

export async function getMinutesVersionBody(minutesId, version) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return {
      version,
      body: `## Meeting Minutes (Version ${version})\nQuorum established for Engineering Fest 2026.\nAll committee agenda items reviewed.`,
    };
  }
  const res = await apiRequest(`/minutes/${minutesId}/versions/${version}`);
  return res.data;
}

export async function getMinutesDiff(minutesId, from, to) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return [
      { type: 'unchanged', text: '## Meeting Minutes\nQuorum reached with full committee attendance.' },
      { type: 'added', text: '+ Added scoring weights for the robotics round (40% code, 30% design, 30% speed).' },
    ];
  }

  const res = await apiRequest(`/minutes/${minutesId}/diff?from=${from}&to=${to}`);
  return res.data;
}

export async function restoreMinutesVersion(minutesId, version) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const min = state.minutes.find((m) => m.id === minutesId || m._id === minutesId);
    if (min) {
      min.version = (min.version || 1) + 1;
      saveDemoState(state);
      return min;
    }
  }

  const res = await apiRequest(`/minutes/${minutesId}/restore`, {
    method: 'POST',
    body: JSON.stringify({ version }),
  });
  return res.data;
}

// ---------------- ACTIONS ----------------

export async function getActions(filters = {}) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.actions];
  }

  const query = new URLSearchParams(filters).toString();
  const res = await apiRequest(`/actions${query ? `?${query}` : ''}`);
  const list = res.data || [];
  return list.map((a) => ({
    ...a,
    id: a.id || a._id,
    code: a.code || `ACT-${String(a._id || '').slice(-4).toUpperCase()}`,
    ownerId: a.ownerId?._id || a.ownerId?.id || a.ownerId,
    ownerName: a.ownerName || a.ownerId?.name || (a.dri || 'Assigned Member'),
    ownerInitials: a.ownerInitials || (a.ownerId?.name ? a.ownerId.name.split(' ').map((n) => n[0]).join('') : 'DR'),
    deadline: a.deadline || (a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : '2026-11-28'),
    dueDate: a.dueDate || a.deadline,
    priority: a.priority ? a.priority.charAt(0).toUpperCase() + a.priority.slice(1) : 'Medium',
    status: a.status === 'in_progress' ? 'in_progress' : a.status,
  }));
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

  const payload = {
    title: actionData.title,
    description: actionData.description || actionData.notes || '',
    ownerId: actionData.ownerId || actionData.driId,
    dueDate: actionData.dueDate || actionData.deadline,
    priority: (actionData.priority || 'medium').toLowerCase(),
    sourceMeetingId: actionData.sourceMeetingId || null,
  };

  const res = await apiRequest('/actions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateAction(actionId, updates) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const act = state.actions.find((a) => a.id === actionId || a._id === actionId);
    if (act) {
      Object.assign(act, updates);
      saveDemoState(state);
      return act;
    }
  }

  const res = await apiRequest(`/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function updateActionStatus(actionId, newStatus) {
  const mode = getMode();
  if (mode === 'demo') {
    return updateAction(actionId, { status: newStatus });
  }

  const res = await apiRequest(`/actions/${actionId}/status`, {
    method: 'POST',
    body: JSON.stringify({ status: newStatus.toLowerCase() }),
  });
  return res.data;
}

export async function reassignAction(actionId, newOwner, reason = 'Reassigned via dashboard') {
  const newOwnerId = typeof newOwner === 'object' && newOwner !== null ? (newOwner.id || newOwner._id) : newOwner;
  const mode = getMode();
  if (mode === 'demo') {
    return updateAction(actionId, {
      dri: typeof newOwner === 'object' ? newOwner.name : newOwnerId,
      ownerId: newOwnerId,
    });
  }

  const res = await apiRequest(`/actions/${actionId}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ ownerId: newOwnerId, reason: reason || 'Reassigned via dashboard' }),
  });
  return res.data;
}

export async function reportActionBlocker(actionId, reason) {
  const mode = getMode();
  if (mode === 'demo') {
    return updateAction(actionId, {
      status: 'blocked',
      blocker: {
        isBlocked: true,
        reason,
        reportedAt: new Date().toISOString(),
      },
    });
  }

  const res = await apiRequest(`/actions/${actionId}/blockers`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
}

export const logActionBlocker = reportActionBlocker;

export async function resolveActionBlocker(arg1, arg2) {
  const blockerId = arg2 || arg1;
  const mode = getMode();
  if (mode === 'demo') {
    return updateAction(arg1, {
      status: 'in_progress',
      blocker: null,
    });
  }

  const res = await apiRequest(`/blockers/${blockerId}/resolve`, { method: 'POST' });
  return res.data;
}

export async function escalateActionBlocker(blockerId) {
  const res = await apiRequest(`/blockers/${blockerId}/escalate`, { method: 'POST' });
  return res.data;
}

export async function getActionHistory(actionId) {
  const res = await apiRequest(`/actions/${actionId}/history`);
  return res.data || [];
}

// ---------------- DECISIONS ----------------

export async function getDecisions(filters = {}) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    if (typeof filters === 'string' && filters.trim()) {
      const q = filters.toLowerCase();
      return state.decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.rationale && d.rationale.toLowerCase().includes(q))
      );
    }
    return [...state.decisions];
  }

  const query = typeof filters === 'string'
    ? (filters.trim() ? `q=${encodeURIComponent(filters.trim())}` : '')
    : new URLSearchParams(filters).toString();
  const res = await apiRequest(`/decisions${query ? `?${query}` : ''}`);
  const list = res.data || [];
  return list.map((d) => ({
    ...d,
    id: d.id || d._id,
    code: d.code || `DEC-${String(d._id || '').slice(-4).toUpperCase()}`,
    decisionDate: d.decisionDate ? new Date(d.decisionDate).toISOString().split('T')[0] : '2026-11-15',
    category: d.category || 'Architecture & Capital',
    voteSummary: d.voteSummary || { for: 4, against: 0, abstain: 0 },
    followUpItems: (d.followUps || d.followUpItems || []).map((f) => ({
      ...f,
      id: f.id || f._id,
      status: f.status || 'suggested',
      text: f.text || f.title || '',
    })),
  }));
}

export async function createDecision(decisionData) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const newDecision = {
      id: `dec-${Date.now()}`,
      title: decisionData.title,
      rationale: decisionData.rationale || decisionData.description || '',
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

  const payload = {
    title: decisionData.title,
    rationale: decisionData.rationale || decisionData.description || 'Decided during committee session.',
    decisionDate: decisionData.decisionDate || new Date(),
    sourceMeetingId: decisionData.sourceMeetingId || null,
  };

  const res = await apiRequest('/decisions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateDecision(id, payload) {
  const res = await apiRequest(`/decisions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteDecision(id) {
  const res = await apiRequest(`/decisions/${id}`, { method: 'DELETE' });
  return res.data;
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
    return dec;
  }

  const res = await apiRequest(`/followup/${followUpId}/decide`, {
    method: 'POST',
    body: JSON.stringify({ decision: newStatus.toLowerCase() }),
  });
  return res.data;
}

export async function getFollowUpItems() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return [];
  }
  const res = await apiRequest('/followup');
  return res.data || [];
}

export async function decideFollowUpItem(id, { decision, text, targetMeetingId }) {
  const res = await apiRequest(`/followup/${id}/decide`, {
    method: 'POST',
    body: JSON.stringify({ decision, text, targetMeetingId }),
  });
  return res.data;
}

export async function saveFollowUpToAgenda(meetingId) {
  const res = await apiRequest('/followup/save-to-agenda', {
    method: 'POST',
    body: JSON.stringify({ meetingId }),
  });
  return res.data;
}

// ---------------- NOTIFICATIONS ----------------

export async function getNotifications(filters = {}) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    return [...state.notifications];
  }

  const query = new URLSearchParams(filters).toString();
  const res = await apiRequest(`/notifications${query ? `?${query}` : ''}`);
  return res.data || [];
}

export async function markNotificationRead(notifId) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const n = state.notifications.find((notif) => notif.id === notifId || notif._id === notifId);
    if (n) {
      n.unread = false;
      saveDemoState(state);
    }
    return n;
  }

  const res = await apiRequest(`/notifications/${notifId}/read`, { method: 'POST' });
  return res.data;
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

  const res = await apiRequest('/notifications/read-all', { method: 'POST' });
  return res.data;
}

// ---------------- ADMIN & WORKSPACE ----------------

export async function getWorkspace() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().workspace;
  }

  const res = await apiRequest('/workspace');
  return res.data;
}

export async function updateWorkspace(payload) {
  const res = await apiRequest('/workspace', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getUsers() {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().users;
  }

  const res = await apiRequest('/members');
  // Normalize membership record to user shape for UI
  return (res.data || []).map((m) => ({
    id: m.userId?._id || m.userId,
    _id: m.userId?._id || m.userId,
    membershipId: m._id,
    name: m.userId?.name || 'User',
    email: m.userId?.email || '',
    role: m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Participant',
    isApprover: Boolean(m.approver),
    status: m.status,
  }));
}

export async function updateUserRole(id, newRole, isApprover) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    const user = state.users.find((u) => u.id === id || u._id === id || u.membershipId === id);
    if (user) {
      if (newRole) user.role = newRole;
      if (isApprover !== undefined) user.isApprover = Boolean(isApprover);
      saveDemoState(state);
      return user;
    }
  }

  const payload = {};
  if (newRole) payload.role = newRole.toLowerCase();
  if (isApprover !== undefined) payload.approver = Boolean(isApprover);

  const res = await apiRequest(`/members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function removeMember(id) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    const state = loadDemoState();
    state.users = state.users.filter((u) => u.id !== id && u._id !== id);
    saveDemoState(state);
    return { ok: true };
  }

  const res = await apiRequest(`/members/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}

export async function getAuditLog(filters = {}) {
  const mode = getMode();
  if (mode === 'demo') {
    await delay();
    return loadDemoState().auditLog;
  }

  const query = new URLSearchParams(filters).toString();
  const res = await apiRequest(`/audit${query ? `?${query}` : ''}`);
  return res.data || [];
}
