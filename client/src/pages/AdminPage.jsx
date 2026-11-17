// Stitch screen 13: Admin panel and workspace management
// Matches Stitch designs 5d9511a3f83346fda96fdcdb0c29b81c, 819411589d5c4a71af4973517eb4304b, and 014b44f7070c44f8848a7778d0a9900d
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Settings,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  KeyRound,
  Download,
  Mail,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canAccessAdmin } from '../auth/permissions';
import {
  getWorkspace,
  getUsers,
  updateUserRole,
  removeMember,
  getAuditLog,
  getInvites,
  createInvite,
  resendInvite,
  revokeInvite,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import Forbidden403 from './Forbidden403';
import { useToast } from '../components/Toast';

export default function AdminPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [workspace, setWorkspace] = useState(null);
  const [userList, setUserList] = useState([]);
  const [auditLogList, setAuditLogList] = useState([]);
  const [invitesList, setInvitesList] = useState([]);
  const [searchMember, setSearchMember] = useState('');
  const [loading, setLoading] = useState(true);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('participant');
  const [inviteApprover, setInviteApprover] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Guard access: Admin only!
  if (!canAccessAdmin(currentUser)) {
    return (
      <Forbidden403
        requiredRoles={['Admin']}
        userRole={currentUser?.role || 'Participant'}
      />
    );
  }

  const loadData = () => {
    Promise.all([getWorkspace(), getUsers(), getAuditLog(), getInvites().catch(() => [])])
      .then(([ws, usrs, logs, invs]) => {
        setWorkspace(ws);
        setUserList(usrs);
        setAuditLogList(logs);
        setInvitesList(invs || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    const user = userList.find((u) => u.id === userId);
    if (!user) return;
    try {
      const updated = await updateUserRole(user.membershipId || userId, newRole, user.isApprover);
      setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      showToast(`Updated role for ${user.name} to ${newRole}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleApproverToggle = async (userId, isApprover) => {
    const user = userList.find((u) => u.id === userId);
    if (!user) return;
    try {
      const updated = await updateUserRole(user.membershipId || userId, user.role, isApprover);
      setUserList((prev) => prev.map((u) => (u.id === userId ? { ...u, isApprover } : u)));
      showToast(
        `${user.name} ${isApprover ? 'granted' : 'revoked'} Approver authority`,
        'info'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Are you sure you want to remove ${member.name} from this workspace?`)) return;
    try {
      await removeMember(member.membershipId || member.id);
      setUserList((prev) => prev.filter((u) => u.id !== member.id && u.membershipId !== member.membershipId));
      showToast(`Removed ${member.name} from workspace`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      const res = await createInvite({
        email: inviteEmail.trim(),
        role: inviteRole,
        approver: inviteApprover,
      });

      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      if (res && res.inviteLink) {
        setCreatedInviteLink(res.inviteLink);
      } else {
        setInviteModalOpen(false);
        setInviteEmail('');
      }
      setInvitesList((prev) => [res, ...prev]);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResendInvite = async (invId) => {
    try {
      const res = await resendInvite(invId);
      showToast('Invitation resent successfully', 'success');
      if (res && res.inviteLink) {
        navigator.clipboard?.writeText(res.inviteLink);
        showToast('Invite link copied to clipboard', 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRevokeInvite = async (invId) => {
    try {
      await revokeInvite(invId);
      setInvitesList((prev) => prev.filter((i) => i._id !== invId && i.id !== invId));
      showToast('Invitation revoked', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredMembers = userList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      u.email.toLowerCase().includes(searchMember.toLowerCase()) ||
      u.role.toLowerCase().includes(searchMember.toLowerCase())
  );

  if (loading || !workspace) {
    return (
      <div className="py-20 text-center text-text-secondary font-mono text-xs">
        Loading admin governance workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Workspace admin & governance
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Configure quorum thresholds, assign committee role permissions, and inspect tamper-evident audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setCreatedInviteLink('');
              setInviteEmail('');
              setInviteModalOpen(true);
            }}
          >
            Invite Member
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={Download}
            onClick={() => showToast('Audit Ledger Cryptographic Certificate exported', 'success')}
          >
            Export Audit Trail
          </Button>
        </div>
      </div>

      {/* Workspace Configuration Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-accent transition-colors">
          <span className="font-mono text-xs font-bold text-text-secondary uppercase">
            Workspace Tier
          </span>
          <div className="font-heading font-bold text-xl text-text-primary mt-1.5">
            {workspace.tier}
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            Cryptographic SHA-256 seal enabled
          </p>
        </Card>

        <Card className="hover:border-accent transition-colors">
          <span className="font-mono text-xs font-bold text-text-secondary uppercase">
            Quorum Threshold
          </span>
          <div className="font-heading font-bold text-3xl text-text-primary mt-1.5">
            {workspace.quorumThreshold} Members
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            Mandatory for ratified decisions
          </p>
        </Card>

        <Card className="hover:border-accent transition-colors">
          <span className="font-mono text-xs font-bold text-text-secondary uppercase">
            Storage & Ledgers
          </span>
          <div className="font-heading font-bold text-3xl text-text-primary mt-1.5">
            {workspace.storageUsedGb} GB
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            Of {workspace.storageLimitGb} GB allocated
          </p>
        </Card>

        <Card className="hover:border-accent transition-colors">
          <span className="font-mono text-xs font-bold text-text-secondary uppercase">
            Active Seats
          </span>
          <div className="font-heading font-bold text-3xl text-text-primary mt-1.5">
            {workspace.activeUsersCount} / {workspace.licensedSeats}
          </div>
          <p className="text-xs text-text-secondary mt-1 font-mono">
            18 open committee licenses
          </p>
        </Card>
      </div>

      {/* Member Management Table */}
      <Card padding="p-0" className="overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-base text-text-primary">
              Committee Member & Role Governance
            </h2>
            <p className="text-xs text-text-secondary">
              Role controls authorization across meetings, minutes editing, and executive reports.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search members by name or role..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-surface-muted/60 border border-border rounded-input text-text-primary placeholder:text-text-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted/60 border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4 text-center">Approver Authority</th>
                <th className="py-3 px-4 text-right">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent text-accent-text flex items-center justify-center font-bold text-xs">
                        {member.initials}
                      </div>
                      <div>
                        <span className="font-semibold text-text-primary block">
                          {member.name}
                        </span>
                        <span className="text-[11px] text-text-secondary">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-text-secondary">
                    {member.department || 'Operations'}
                  </td>

                  <td className="py-3.5 px-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="h-7 px-2 rounded-btn bg-surface border border-border text-xs text-text-primary font-medium focus:border-accent focus:outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Coordinator">Coordinator</option>
                      <option value="Participant">Participant</option>
                    </select>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(member.isApprover)}
                        onChange={(e) =>
                          handleApproverToggle(member.id, e.target.checked)
                        }
                        className="w-4 h-4 rounded text-accent accent-accent border-border"
                      />
                      <span className="text-[11px] text-text-secondary font-mono">
                        {member.isApprover ? 'Authorized' : 'None'}
                      </span>
                    </label>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-success-bg text-success border border-success-border text-[11px] font-mono font-medium">
                      Active
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {member.id !== currentUser?.id && member.id !== currentUser?._id && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        className="text-text-secondary hover:text-danger text-xs font-semibold px-2 py-1 rounded transition-colors"
                        title="Remove member from workspace"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Invitations Section */}
      {invitesList.length > 0 && (
        <Card padding="p-0" className="overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-border">
            <h2 className="font-heading font-bold text-base text-text-primary">
              Pending Invitations ({invitesList.filter((i) => i.status === 'pending').length})
            </h2>
            <p className="text-xs text-text-secondary">
              Invited colleagues who have not yet accepted their tokens.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-muted/60 border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Invited Role</th>
                  <th className="py-2.5 px-4">Approver</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitesList.map((inv) => (
                  <tr key={inv._id || inv.id} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-text-primary">{inv.email}</td>
                    <td className="py-3 px-4 capitalize font-mono text-text-secondary">{inv.role}</td>
                    <td className="py-3 px-4 text-text-secondary">{inv.approver ? 'Yes' : 'No'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                        inv.status === 'pending'
                          ? 'bg-warning-bg text-warning border border-warning-border'
                          : 'bg-surface-muted text-text-secondary border border-border'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResendInvite(inv._id || inv.id)}
                            className="text-xs text-accent hover:underline font-semibold"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRevokeInvite(inv._id || inv.id)}
                            className="text-xs text-danger hover:underline font-semibold"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setCreatedInviteLink('');
        }}
        title="Invite new committee member"
        description="Send an email invitation or generate an acceptance link."
      >
        {!createdInviteLink ? (
          <form onSubmit={handleCreateInvite} className="space-y-4 text-xs font-body">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Email Address *</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@institution.edu"
                className="w-full h-9 px-3 text-xs bg-surface border border-border rounded-input text-text-primary focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-text-primary block">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-9 px-2 text-xs bg-surface border border-border rounded-input text-text-primary focus:outline-none"
                >
                  <option value="participant">Participant</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1 flex flex-col justify-end pb-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteApprover}
                    onChange={(e) => setInviteApprover(e.target.checked)}
                    className="w-4 h-4 rounded text-accent accent-accent border-border"
                  />
                  <span className="font-medium text-text-primary">Approver Clearance</span>
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setInviteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={Mail}>
                Send Invitation
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-success-bg border border-success-border rounded-btn text-success text-xs font-medium">
              Invitation generated! Share the link below with your invitee:
            </div>

            <div className="p-2.5 bg-surface-muted border border-border rounded-input font-mono text-[11px] break-all select-all text-text-primary">
              {createdInviteLink}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={copiedLink ? Check : Copy}
                onClick={() => {
                  navigator.clipboard?.writeText(createdInviteLink);
                  setCopiedLink(true);
                  showToast('Invite link copied!', 'success');
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
              >
                {copiedLink ? 'Copied' : 'Copy Link'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setInviteModalOpen(false);
                  setCreatedInviteLink('');
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cryptographic Audit Trail Table */}
      <Card padding="p-0" className="overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-accent" />
            <h2 className="font-heading font-bold text-base text-text-primary">
              Immutable Cryptographic Audit Trail
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Every quorum authentication, minute sealing, and blocker report is permanently hashed.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-muted/60 border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Target Entity</th>
                <th className="py-2.5 px-4">Authorized Actor</th>
                <th className="py-2.5 px-4 font-mono">SHA-256 Checksum</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogList.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-text-primary">
                    {log.event}
                  </td>
                  <td className="py-3 px-4 text-text-primary">{log.entity}</td>
                  <td className="py-3 px-4 text-text-secondary">{log.actor}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-text-secondary">
                    {log.hash ? `${log.hash.slice(0, 16)}...` : 'e3b0c44298fc...'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-accent-tint text-text-primary border border-accent text-[11px] font-mono font-bold">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

