// src/auth/permissions.js
// Single source of truth for all role and permission rules across MeetTrack.
// The AI assistant also uses this module to ensure it never reveals data or actions
// a user is not permitted to see or execute.
//
// NOTE: Route guards and UI conditional renders improve UX only.
// The production backend must enforce all permission and authorization checks on every endpoint.

export const ROLES = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  PARTICIPANT: 'Participant',
};

/**
 * Check if user has one of the allowed roles
 */
export function hasRole(user, allowedRoles = []) {
  if (!user || !user.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Can user edit and schedule meetings
 */
export function canEditMeetings(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR;
}

/**
 * Can user edit minutes for a meeting
 */
export function canEditMinutes(user, minutes) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR) return true;
  // Explicitly allowed editors can also edit drafts
  if (minutes && minutes.allowedEditors && minutes.allowedEditors.includes(user.id)) {
    return true;
  }
  return false;
}

/**
 * Can user sign off / approve minutes (Approver flag on user or Admin)
 */
export function canApproveMinutes(user) {
  if (!user) return false;
  return Boolean(user.isApprover || user.role === ROLES.ADMIN);
}

/**
 * Can user publish approved minutes
 */
export function canPublishMinutes(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR;
}

/**
 * Can user create/manage decisions and follow-up items
 */
export function canManageDecisions(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR;
}

/**
 * Can user manage all actions (create, reassign, delete)
 */
export function canManageAllActions(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR;
}

/**
 * Can user access workspace reports and analytics
 */
export function canAccessReports(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN || user.role === ROLES.COORDINATOR;
}

/**
 * Can user access workspace admin panel & audit logs
 */
export function canAccessAdmin(user) {
  if (!user) return false;
  return user.role === ROLES.ADMIN;
}

/**
 * Check whether a user can accept assistant-generated draft modifications
 * (Participants cannot accept changes to minutes or approvals)
 */
export function canAcceptAssistantDraft(user, draftType) {
  if (!user) return { allowed: false, reason: 'You must be signed in.' };
  if (draftType === 'minutes' || draftType === 'approval') {
    if (user.role === ROLES.PARTICIPANT && !user.isApprover) {
      return {
        allowed: false,
        reason: 'Only Coordinator or Admin can accept changes to this record.',
      };
    }
  }
  return { allowed: true };
}

