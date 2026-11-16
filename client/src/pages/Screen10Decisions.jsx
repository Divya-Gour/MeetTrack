// Stitch screen 10: Decision register and follow-up agenda
// Matches Stitch designs 152f13aef0f44491ac73f121b3fed5bb, 6a4b93043dab458fbd79e61e2715ed68, and b00e2a7a0bac404ea087dee7e42642f6
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Scale,
  Search,
  Plus,
  CheckCircle2,
  Check,
  X,
  Edit3,
  ArrowRight,
  Filter,
  FileCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canManageDecisions } from '../auth/permissions';
import {
  getDecisions,
  createDecision,
  updateFollowUpItemStatus,
  createAction,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

export default function Screen10Decisions() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isCoordinator = canManageDecisions(currentUser);

  const [decisions, setDecisions] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New decision form
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Architecture & Capital');
  const [newVote, setNewVote] = useState('UNANIMOUS (8-0)');
  const [newDesc, setNewDesc] = useState('');
  const [newRationale, setNewRationale] = useState('');

  const fetchDecisions = async (query = '') => {
    try {
      const data = await getDecisions(query);
      setDecisions(data);
    } catch (err) {
      showToast('Error syncing decisions', 'error');
    }
  };

  useEffect(() => {
    fetchDecisions(searchQuery);
  }, [searchQuery]);

  const categories = ['All', 'Architecture & Capital', 'Governance & Policy', 'Compliance & Security'];

  const filteredDecisions = decisions.filter((d) => {
    if (selectedCategory !== 'All' && d.category !== selectedCategory) return false;
    return true;
  });

  const handleOpenDetail = (dec) => {
    setSelectedDecision(dec);
    setDrawerOpen(true);
  };

  const handleUpdateFollowUp = async (fupId, newStatus) => {
    if (!selectedDecision) return;
    try {
      const updated = await updateFollowUpItemStatus(selectedDecision.id, fupId, newStatus);
      setSelectedDecision(updated);
      setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));

      if (newStatus === 'Accepted') {
        const item = selectedDecision.followUpItems.find((i) => i.id === fupId);
        if (item) {
          await createAction({
            title: item.text,
            ownerName: item.suggestedOwner || currentUser.name,
            priority: 'High',
            dueDate: '2026-11-25',
            description: `Follow-up action resulting from Decision ${selectedDecision.code}`,
          });
        }
        showToast('Follow-up accepted and spawned as active action item!', 'success');
      } else if (newStatus === 'Dismissed') {
        showToast('Follow-up item dismissed.', 'info');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateDecision = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await createDecision({
        title: newTitle,
        category: newCategory,
        voteResult: newVote,
        description: newDesc,
        rationale: newRationale,
        meetingTitle: 'Executive Committee Session',
      });

      setDecisions([created, ...decisions]);
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewRationale('');
      showToast(`Decision ${created.code} ratified and added to ledger!`, 'success');
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
              Decision register & follow-up agenda
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
              Cryptographic Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Search formal committee decisions, review vote tallies, and manage downstream follow-up agendas.
          </p>
        </div>

        {isCoordinator && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
          >
            Record Decision
          </Button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border rounded-card p-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-btn text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-text-primary text-bg font-bold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions by keyword or code..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface-muted/60 border border-border rounded-input text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Decision Cards List */}
      {filteredDecisions.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No decisions found"
          description="No formal decisions match your search keywords or category filters."
          actionLabel={isCoordinator ? 'Record New Decision' : undefined}
          onAction={isCoordinator ? () => setCreateModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDecisions.map((dec) => (
            <Card
              key={dec.id}
              onClick={() => handleOpenDetail(dec)}
              className="hover:border-accent cursor-pointer transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-muted border border-border">
                    {dec.code}
                  </span>
                  <span className="font-mono text-[10px] uppercase font-bold text-text-secondary">
                    {dec.category}
                  </span>
                  <span className="text-text-secondary">•</span>
                  <span className="text-xs text-text-secondary font-mono">{dec.date}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-accent text-accent-text text-xs font-mono font-bold">
                    {dec.voteResult}
                  </span>
                  <Pill status={dec.status} size="sm" />
                </div>
              </div>

              <div>
                <h3 className="font-heading font-bold text-base text-text-primary mb-1">
                  {dec.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {dec.description}
                </p>
              </div>

              {/* Follow-up Items preview */}
              {dec.followUpItems?.length > 0 && (
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-text-secondary">
                  <span>
                    <strong>{dec.followUpItems.length}</strong> follow-up commitment
                    {dec.followUpItems.length === 1 ? '' : 's'} linked
                  </span>
                  <span className="text-text-primary font-semibold flex items-center gap-1">
                    <span>Inspect follow-ups</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ---------------- DECISION DETAIL & FOLLOW-UP DRAWER ---------------- */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedDecision ? selectedDecision.code : 'Decision Details'}
        subtitle="Formal Committee Ratification & Follow-up Agenda"
        width="max-w-lg"
      >
        {selectedDecision && (
          <div className="space-y-6 text-xs">
            {/* Header info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-accent text-accent-text text-xs font-mono font-bold">
                  {selectedDecision.voteResult}
                </span>
                <Pill status={selectedDecision.status} />
              </div>
              <h3 className="font-heading font-bold text-lg text-text-primary leading-tight">
                {selectedDecision.title}
              </h3>
              <div className="text-xs text-text-secondary font-mono">
                Decided by {selectedDecision.decidedBy} • {selectedDecision.date}
              </div>
            </div>

            {/* Description & Rationale */}
            <div className="p-3.5 rounded-card bg-surface-muted/50 border border-border space-y-2.5">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider block mb-1">
                  Formal Resolution
                </span>
                <p className="text-xs text-text-primary leading-relaxed">
                  {selectedDecision.description}
                </p>
              </div>
              {selectedDecision.rationale && (
                <div className="pt-2 border-t border-border/60">
                  <span className="font-mono text-[10px] uppercase font-bold text-text-secondary tracking-wider block mb-1">
                    Operational Rationale
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed italic">
                    "{selectedDecision.rationale}"
                  </p>
                </div>
              )}
            </div>

            {/* Follow-up Items Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-sm text-text-primary">
                  Linked Follow-up Agenda Items
                </h4>
                <span className="font-mono text-xs text-text-secondary">
                  {selectedDecision.followUpItems?.length || 0} items
                </span>
              </div>

              {selectedDecision.followUpItems?.length === 0 ? (
                <p className="text-xs text-text-secondary italic">
                  No downstream action items created for this decision.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {selectedDecision.followUpItems?.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-card bg-surface border border-border space-y-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-text-primary leading-relaxed">
                          {item.text}
                        </span>
                        <Pill status={item.status} size="sm" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-border/50">
                        <span>
                          Suggested DRI: <strong>{item.suggestedOwner}</strong>
                        </span>

                        {/* Accept / Edit / Dismiss controls per prompt checklist */}
                        {item.status === 'Pending' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateFollowUp(item.id, 'Dismissed')}
                              className="px-2 py-0.5 rounded-btn hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleUpdateFollowUp(item.id, 'Accepted')}
                              className="px-2.5 py-0.5 rounded-btn bg-accent text-accent-text hover:bg-accent-hover font-semibold transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <Check className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                          </div>
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

      {/* ---------------- RECORD DECISION MODAL ---------------- */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Record Formal Quorum Decision"
        description="Formal votes are committed with committee consensus tracking."
      >
        <form onSubmit={handleCreateDecision} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Decision Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Allocation of Q4 secondary failover budget"
              className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full h-9 px-2 rounded-input bg-surface border border-border text-xs focus:outline-none"
              >
                <option value="Architecture & Capital">Architecture & Capital</option>
                <option value="Governance & Policy">Governance & Policy</option>
                <option value="Compliance & Security">Compliance & Security</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-text-primary block">Vote Result</label>
              <input
                type="text"
                required
                value={newVote}
                onChange={(e) => setNewVote(e.target.value)}
                className="w-full h-9 px-3 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Formal Resolution Text</label>
            <textarea
              required
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Exact resolution wording adopted by the quorum..."
              className="w-full p-2.5 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">Rationale & Justification</label>
            <textarea
              rows={2}
              value={newRationale}
              onChange={(e) => setNewRationale(e.target.value)}
              placeholder="Business reasons and compliance drivers..."
              className="w-full p-2.5 rounded-input bg-surface border border-border focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Ratify Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

