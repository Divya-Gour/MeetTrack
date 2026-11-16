// client/src/data/demoStore.js
// Dedicated LocalStorage Store for Demo Mode (Engineering Fest 2026)
// Key: mt.demo.v1 — Completely isolated from server database

import {
  MOCK_USERS,
  MOCK_WORKSPACE,
  MOCK_MEETINGS,
  MOCK_MINUTES,
  MOCK_DECISIONS,
  MOCK_ACTIONS,
  MOCK_NOTIFICATIONS,
  MOCK_AUDIT_LOG,
  DEMO_DATE,
  DEMO_DATE_STR,
} from './mockData';

export { DEMO_DATE, DEMO_DATE_STR } from './mockData';
const DEMO_STORAGE_KEY = 'mt.demo.v1';

export function getInitialDemoState() {
  return {
    version: '1.0',
    virtualDate: DEMO_DATE_STR,
    workspace: MOCK_WORKSPACE,
    users: MOCK_USERS,
    currentUser: MOCK_USERS[1], // Priya Nair (Coordinator & Approver) by default
    meetings: MOCK_MEETINGS,
    minutes: MOCK_MINUTES,
    decisions: MOCK_DECISIONS,
    actions: MOCK_ACTIONS,
    notifications: MOCK_NOTIFICATIONS,
    auditLog: MOCK_AUDIT_LOG,
  };
}

export function loadDemoState() {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      const initial = getInitialDemoState();
      saveDemoState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.meetings || !parsed.actions) {
      const initial = getInitialDemoState();
      saveDemoState(initial);
      return initial;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load demo state from localStorage, falling back to initial', err);
    return getInitialDemoState();
  }
}

export function saveDemoState(state) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save demo state to localStorage', err);
  }
}

export function resetDemoState() {
  const pristine = getInitialDemoState();
  saveDemoState(pristine);
  return pristine;
}

// Dynamic overdue calculation helper for Demo Mode:
// Compares deadline to demo virtual date (15 Nov 2026)
export function isDemoActionOverdue(action) {
  if (!action || !action.deadline) return false;
  if (action.status === 'completed' || action.status === 'cancelled') return false;
  const deadlineDate = new Date(action.deadline);
  const virtualNow = new Date(DEMO_DATE_STR);
  return deadlineDate.getTime() < virtualNow.getTime();
}
