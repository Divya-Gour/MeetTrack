// server/src/models/index.js
const User = require('./User');
const Workspace = require('./Workspace');
const Membership = require('./Membership');
const Invitation = require('./Invitation');
const PasswordReset = require('./PasswordReset');
const Meeting = require('./Meeting');
const AgendaItem = require('./AgendaItem');
const Attendance = require('./Attendance');
const MeetingTemplate = require('./MeetingTemplate');
const Minutes = require('./Minutes');
const MinutesVersion = require('./MinutesVersion');
const Action = require('./Action');
const ActionHistory = require('./ActionHistory');
const Blocker = require('./Blocker');
const Decision = require('./Decision');
const FollowUpItem = require('./FollowUpItem');
const Notification = require('./Notification');
const AuditEvent = require('./AuditEvent');
const AssistantMessage = require('./AssistantMessage');
const RateLimit = require('./RateLimit');

module.exports = {
  User,
  Workspace,
  Membership,
  Invitation,
  PasswordReset,
  Meeting,
  AgendaItem,
  Attendance,
  MeetingTemplate,
  Minutes,
  MinutesVersion,
  Action,
  ActionHistory,
  Blocker,
  Decision,
  FollowUpItem,
  Notification,
  AuditEvent,
  AssistantMessage,
  RateLimit,
};
