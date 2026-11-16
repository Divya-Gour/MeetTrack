// Stitch screen 08: Minutes approval and publishing
// Matches Stitch designs 2611b338040243bd8900d47d1ce3b435, c30f4722b9f84daa84fb4da47dbc1007, dad732e0663742b4ac1b04a885c4b8c2, b784aaf1491c46eaacc60dced2d15cb9
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Lock,
  Send,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  Download,
  Check,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canApproveMinutes, canPublishMinutes } from '../auth/permissions';
import {
  getMinutesById,
  approveMinutes,
  returnMinutes,
  publishMinutes,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import Forbidden403 from './Forbidden403';

export default function Screen08Approvals() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const isApprover = canApproveMinutes(currentUser);
  const canPublish = canPublishMinutes(currentUser);

  const [minutes, setMinutes] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMinutes = async () => {
    try {
      const data = await getMinutesById('min-101');
      setMinutes(data);
    } catch (err) {
      showToast('Error loading approval queue item', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMinutes();
  }, []);

  // Check 403 permission access per Stitch fallback state
  if (!isApprover) {
    return (
      <Forbidden403
        requiredRoles={['Approver', 'Admin']}
        userRole={currentUser?.role || 'Participant'}
      />
    );
  }

  if (loading || !minutes) {
    return (
      <div className="py-20 text-center text-text-secondary font-mono text-xs">
        Loading approval queue...
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      const updated = await approveMinutes(minutes.id, currentUser, approvalNote);
      setMinutes(updated);
      showToast('You approved and digitally authenticated this record!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) return;

    try {
      const updated = await returnMinutes(minutes.id, returnReason, currentUser);
      setMinutes(updated);
      setReturnModalOpen(false);
      setReturnReason('');
      showToast('Minutes returned to coordinator with revision notes.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePublish = async () => {
    try {
      const updated = await publishMinutes(minutes.id, currentUser);
      setMinutes(updated);
      setPublishModalOpen(false);
      showToast('Minutes cryptographically sealed and published to organization!', 'success');
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
              Minutes approval & publishing
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-accent text-accent-text text-xs font-mono font-bold">
              Approver Scope
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Review quorum minutes drafts, sign attestations, and seal records to the tamper-evident archive.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {minutes.status === 'Submitted' && (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => setReturnModalOpen(true)}
              >
                Return with Notes
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={CheckCircle2}
                onClick={handleApprove}
              >
                Approve & Sign
              </Button>
            </>
          )}

          {minutes.status === 'Approved' && canPublish && (
            <Button
              variant="primary"
              size="md"
              icon={Lock}
              onClick={() => setPublishModalOpen(true)}
            >
              Seal & Publish Record
            </Button>
          )}

          {minutes.status === 'Published' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-success-bg border border-success-border text-success text-xs font-bold font-mono">
              <Lock className="w-4 h-4" />
              <span>Published & Immutable (SHA-256)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Review Card */}
      <Card padding="p-6" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-muted border border-border">
                {minutes.meetingCode}
              </span>
              <h2 className="font-heading font-bold text-xl text-text-primary">
                {minutes.meetingTitle}
              </h2>
              <Pill status={minutes.status} />
              <span className="text-xs font-mono text-text-secondary">
                Version: {minutes.currentVersion}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Submitted by <strong>{minutes.lastModifiedBy}</strong> • Quorum Quorum verified (6 of 6 present)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/minutes/${minutes.id}`}
              className="text-xs font-semibold text-text-primary hover:underline"
            >
              Open in full editor →
            </Link>
          </div>
        </div>

        {/* Status Callout if Returned */}
        {minutes.status === 'Returned' && (
          <div className="p-4 rounded-card bg-warning-bg border border-warning-border text-xs text-warning space-y-1.5">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Minutes Returned for Coordinator Revisions</span>
            </div>
            <p className="leading-relaxed text-text-primary font-medium">
              Reason: "{minutes.returnReason || 'Figures in section 2 require adjustment.'}"
            </p>
          </div>
        )}

        {/* Approver Checkpoints helper box */}
        <div className="p-4 rounded-card bg-surface-muted/50 border border-border space-y-2 text-xs">
          <span className="font-mono font-bold text-[11px] text-text-secondary uppercase tracking-wider block">
            Approver Checkpoints
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Unanimous 8-0 vote on Decision #DEC-042 recorded.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>$120,000 contingency reserve verified in financial report.</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>Sarah Chen designated as single DRI for SOC2 filing.</span>
            </div>
          </div>
        </div>

        {/* Markdown Document Preview */}
        <div className="p-6 bg-surface rounded-card border border-border shadow-xs text-xs sm:text-sm font-body whitespace-pre-wrap leading-relaxed text-text-primary max-h-[460px] overflow-y-auto">
          {minutes.contentMarkdown}
        </div>

        {/* Approval Signatures Log */}
        <div className="pt-4 border-t border-border space-y-3">
          <h3 className="font-heading font-bold text-sm text-text-primary">
            Signatory Attestation Ledger
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {minutes.approvals?.map((app, idx) => (
              <div
                key={idx}
                className="p-3 rounded-card bg-surface-muted/40 border border-border flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-text-primary block">{app.name}</span>
                  <span className="text-[11px] text-text-secondary">{app.role}</span>
                </div>
                <Pill status={app.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Return Dialog Modal */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title="Return Minutes for Revision"
        description="Specify points the recording coordinator must update before approval."
      >
        <form onSubmit={handleReturn} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-text-primary block">
              Revision Notes & Specific Changes Required
            </label>
            <textarea
              required
              rows={4}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Please verify cloud reserve calculation in Section 2.1 before final quorum seal..."
              className="w-full p-2.5 rounded-input bg-surface border border-border text-xs focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Return to Coordinator
            </Button>
          </div>
        </form>
      </Modal>

      {/* Publish Dialog Modal */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Cryptographically Seal & Publish Minutes"
        description="Publishing seals this record permanently with an immutable SHA-256 checksum."
      >
        <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
          <p>
            Once sealed, this document will be indexed in the public committee ledger. Subsequent edits will require drafting a formal addendum.
          </p>
          <div className="p-3 rounded-btn bg-surface-muted font-mono text-[11px] break-all text-text-primary">
            Target SHA-256 Hash: a799c33190dfbe92b7740112998a65c40134bcfe8190c74f5194917a421b8f04
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Lock} onClick={handlePublish}>
              Confirm & Publish Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

