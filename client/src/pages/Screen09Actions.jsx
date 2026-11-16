// Stitch screen 09: Action items and My Actions
// Matches Stitch designs 65d2639dd94e4ea2a5f5fa10673998ea (Coordinator) and da9536b61d984bc39b9257e9ff478cb8 (Participant)
import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  Flame,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canManageAllActions } from '../auth/permissions';
import {
  getActions,
  createAction,
  updateActionStatus,
  reassignAction,
  reportActionBlocker,
  resolveActionBlocker,
  isActionOverdue,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

export default function Screen09Actions() {
  const { currentUser, allUsers } = useAuth();
  const { showToast } = useToast();
  const isCoordinator = canManageAllActions(currentUser);

  const [actions, setActions] = useState([]);
  const [activeTab, setActiveTab] = useState(isCoordinator ? 'all' : 'my'); // 'all' | 'my'
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer & Modal states
  const [selectedAction, setSelectedAction] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');
  const [blockerInputVisible, setBlockerInputVisible] = useState(false);

  // New action form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newOwnerId, setNewOwnerId] = useState(currentUser?.id || 'user-coord');
  const [newPriority, setNewPriority] = useState('High');
  const [newDueDate, setNewDueDate] = useState('2026-11-20');

  const fetchActionsList = async () => {
    try {
      const data = await getActions();
      setActions(data);
    } catch (err) {
      showToast('Error syncing actions ledger', 'error');
    }
  };

  useEffect(() => {
    fetchActionsList();
  }, []);

  const filteredActions = actions.filter((act) => {
    if (activeTab === 'my' && act.ownerId !== currentUser?.id) return false;
    if (priorityFilter !== 'All' && act.priority !== priorityFilter) return false;
    if (statusFilter !== 'All' && act.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        act.title.toLowerCase().includes(q) ||
        act.code.toLowerCase().includes(q) ||
        act.ownerName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenDetail = (act) => {
    setSelectedAction(act);
    setDrawerOpen(true);
    setBlockerInputVisible(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedAction) return;
    try {
      const updated = await updateActionStatus(selectedAction.id, newStatus);
      setSelectedAction(updated);
      setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReassign = async (newOwnerId) => {
    if (!selectedAction) return;
    const targetUser = allUsers.find((u) => u.id === newOwnerId);
    if (!targetUser) return;

    try {
      const updated = await reassignAction(selectedAction.id, targetUser);
      setSelectedAction(updated);
      setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast(`Action reassigned to ${targetUser.name}`, 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReportBlocker = async (e) => {
    e.preventDefault();
    if (!blockerReasonInput.trim() || !selectedAction) return;

    try {
      const updated = await reportActionBlocker(
        selectedAction.id,
        blockerReasonInput,
        currentUser
      );
      setSelectedAction(updated);
      setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setBlockerReasonInput('');
      setBlockerInputVisible(false);
      showToast('Blocker logged. Coordinator notified.', 'error');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResolveBlocker = async (blockerId) => {
    if (!selectedAction) return;
    try {
      const updated = await resolveActionBlocker(selectedAction.id, blockerId);
      setSelectedAction(updated);
      setActions((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      showToast('Blocker marked resolved! Status restored to In Progress.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const assignedUser = allUsers.find((u) => u.id === newOwnerId) || currentUser;

    try {
      const created = await createAction({
        title: newTitle,
        description: newDesc,
        ownerId: assignedUser.id,
        ownerName: assignedUser.name,
        ownerInitials: assignedUser.initials,
        ownerDepartment: assignedUser.department,
        priority: newPriority,
        dueDate: newDueDate,
        meetingTitle: 'Ad-hoc Committee Action',
      });

      setActions([created, ...actions]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      showToast(`Action ${created.code} assigned to ${assignedUser.name}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-body">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Action items & accountability
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
              Single DRI Mandate
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Track ownership, report operational blockers, and escalate overdue commitments.
          </p>
        </div>

        {isCoordinator && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Create Action
          </Button>
        )}
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-card p-3 shadow-xs">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-text-primary text-bg font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            All Workspace Actions ({actions.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 rounded-btn text-xs font-semibold transition-colors ${
              activeTab === 'my'
                ? 'bg-text-primary text-bg font-bold shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            My Assigned Actions ({actions.filter((a) => a.ownerId === currentUser?.id).length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-input bg-surface-muted/60 border border-border text-xs text-text-primary focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-input bg-surface-muted/60 border border-border text-xs text-text-primary focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Needs Sign-off">Needs Sign-off</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter actions..."
              className="h-8 pl-8 pr-2.5 rounded-input bg-surface-muted/60 border border-border text-xs text-text-primary placeholder:text-text-secondary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Actions Table */}
      {filteredActions.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No action items match criteria"
          description="Try relaxing your priority or status filters, or create a new action item."
          actionLabel={isCoordinator ? 'Create New Action' : undefined}
          onAction={isCoordinator ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <Card padding="p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-muted/60 border-b border-border text-text-secondary font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Action Code & Title</th>
                  <th className="py-3 px-4">DRI Owner</th>
                  <th className="py-3 px-4 text-center">Priority</th>
                  <th className="py-3 px-4 text-right">Due Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredActions.map((act) => {
                  const overdue = isActionOverdue(act.dueDate, act.status);
                  return (
                    <tr
                      key={act.id}
                      onClick={() => handleOpenDetail(act)}
                      className={`hover:bg-surface-muted/50 cursor-pointer transition-colors ${
                        overdue ? 'bg-error-bg/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-medium text-text-primary">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[11px] font-bold text-text-secondary shrink-0">
                            {act.code}
                          </span>
                          <span className={overdue ? 'font-bold text-error' : ''}>
                            {act.title}
                          </span>
                          {act.status === 'Blocked' && (
                            <span className="px-1.5 py-0.2 rounded bg-error-bg text-error font-mono text-[10px] font-bold">
                              BLOCKED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-muted text-text-primary flex items-center justify-center font-bold text-[10px]">
                            {act.ownerInitials}
                          </div>
                          <div>
                            <span className="text-text-primary font-medium block">
                              {act.ownerName}
                            </span>
                            <span className="text-[10px] text-text-secondary font-mono">
                              {act.ownerDepartment}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Pill status={act.priority} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-text-secondary">
                        <span className={overdue ? 'font-bold text-error' : ''}>
                          {act.dueDate}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Pill status={overdue ? 'Overdue' : act.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(act);
                          }}
                          className="px-2.5 py-1 rounded-btn hover:bg-surface-muted text-text-secondary hover:text-text-primary text-xs font-medium"
                        >
                          View Drawer →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ---------------- ACTION DETAIL DRAWER ---------------- */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedAction ? selectedAction.code : 'Action Details'}
        subtitle="Mandatory Single DRI Accountability Record"
      >
        {selectedAction && (
          <div className="space-y-6 text-xs">
            {/* Title & Priority */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Pill status={selectedAction.priority} />
                <Pill
                  status={
                    isActionOverdue(selectedAction.dueDate, selectedAction.status)
                      ? 'Overdue'
                      : selectedAction.status
                  }
                />
              </div>
              <h3 className="font-heading font-bold text-lg text-text-primary leading-tight">
                {selectedAction.title}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {selectedAction.description || 'No extended briefing details recorded.'}
              </p>
            </div>

            {/* DRI Ownership & Reassign */}
            <div className="p-3.5 rounded-card bg-surface-muted/50 border border-border space-y-2">
              <span className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider block">
                Designated DRI Owner
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-text flex items-center justify-center font-bold text-xs">
                    {selectedAction.ownerInitials}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary text-sm">
                      {selectedAction.ownerName}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      {selectedAction.ownerDepartment}
                    </div>
                  </div>
                </div>

                {isCoordinator && (
                  <select
                    value={selectedAction.ownerId}
                    onChange={(e) => handleReassign(e.target.value)}
                    className="h-8 px-2 rounded-btn bg-surface border border-border text-xs text-text-primary focus:outline-none"
                  >
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        Reassign: {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Status Switcher */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider block">
                Update Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {['In Progress', 'Under Review', 'Needs Sign-off', 'Completed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`py-2 px-3 rounded-btn border text-center font-semibold transition-all ${
                      selectedAction.status === st
                        ? 'bg-text-primary text-bg font-bold border-text-primary'
                        : 'bg-surface hover:bg-surface-muted text-text-secondary border-border'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Blockers Section */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-heading font-bold text-sm text-text-primary">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span>Blockers & Escalations</span>
                </div>
                {!blockerInputVisible && (
                  <button
                    onClick={() => setBlockerInputVisible(true)}
                    className="text-error font-semibold hover:underline text-xs"
                  >
                    + Report Blocker
                  </button>
                )}
              </div>

              {/* Report Blocker Form */}
              {blockerInputVisible && (
                <form onSubmit={handleReportBlocker} className="p-3 bg-error-bg/40 border border-error-border rounded-card space-y-2 animate-fade-in">
                  <label className="text-[11px] font-bold text-error block">
                    Describe Blocker Reason
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={blockerReasonInput}
                    onChange={(e) => setBlockerReasonInput(e.target.value)}
                    placeholder="e.g. Awaiting cloud resource quota elevation approval..."
                    className="w-full p-2 text-xs rounded-input bg-surface border border-error-border text-text-primary focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockerInputVisible(false)}
                      className="px-2 py-1 text-xs text-text-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-error text-white font-semibold rounded-btn text-xs"
                    >
                      Log Blocker
                    </button>
                  </div>
                </form>
              )}

              {/* Active Blockers List */}
              {selectedAction.blockers?.length === 0 ? (
                <p className="text-xs text-text-secondary italic">
                  No active blockers. Execution on track.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedAction.blockers?.map((blk) => (
                    <div
                      key={blk.id}
                      className={`p-3 rounded-card border text-xs space-y-1.5 ${
                        blk.resolved
                          ? 'bg-surface-muted/40 border-border text-text-secondary line-through'
                          : 'bg-error-bg/30 border-error-border text-text-primary'
                      }`}
                    >
                      <p className="leading-relaxed">"{blk.reason}"</p>
                      <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono">
                        <span>Reported by {blk.reportedBy}</span>
                        {!blk.resolved && (
                          <button
                            onClick={() => handleResolveBlocker(blk.id)}
                            className="px-2 py-0.5 rounded bg-success-bg text-success border border-success-border font-bold hover:bg-success/20 transition-colors"
                          >
                            Mark Resolved ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ---------------- CREATE ACTION MODAL ---------------- */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Action Item"
        description="Every action requires a single designated DRI per quorum protocol."
      >
        <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Action Commitment Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Audit network egress projections for board quarterly packet"
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Description & Deliverables</label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Provide concrete success metrics for this commitment..."
              className="w-full p-2.5 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Mandatory Single DRI</label>
              <select
                value={newOwnerId}
                onChange={(e) => setNewOwnerId(e.target.value)}
                className="w-full h-9 px-2 rounded-input bg-surface border border-border text-xs focus:outline-none"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full h-9 px-2 rounded-input bg-surface border border-border text-xs focus:outline-none"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Due Date</label>
            <input
              type="date"
              required
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Assign Action
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

