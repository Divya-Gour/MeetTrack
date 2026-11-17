// Stitch screen 07: Minutes editor
// Matches Stitch designs 1ef11006031240848328ff03f575f7f9, f013ff844474476cacc3842a86977448, and b4a7dcf71fb64acab41e975a9554fd25
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  History,
  Send,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  GitCompare,
  Lock,
  ArrowLeft,
  Save,
  Check,
  Download,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { canEditMinutes, canPublishMinutes } from '../auth/permissions';
import {
  getMinutesById,
  updateMinutes,
  submitMinutesForApproval,
  getMinutesVersions,
  getMinutesVersionBody,
  restoreMinutesVersion,
  getMinutesPdfUrl,
} from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Pill from '../components/Pill';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function MinutesEditorPage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [minutes, setMinutes] = useState(null);
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview' | 'compare'
  const [loading, setLoading] = useState(true);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [conflictSimulated, setConflictSimulated] = useState(false);

  const extractMarkdown = (data) => {
    if (!data) return '';
    if (typeof data.content === 'string') return data.content;
    if (data.contentMarkdown) return data.contentMarkdown;
    if (data.content && typeof data.content === 'object') {
      const parts = [
        data.content.attendanceSummary && `## Attendance Summary\n${data.content.attendanceSummary}`,
        data.content.discussionPoints && `## Discussion Points\n${data.content.discussionPoints}`,
        data.content.decisions && `## Decisions\n${data.content.decisions}`,
        data.content.outcomes && `## Outcomes and Next Steps\n${data.content.outcomes}`,
      ].filter(Boolean);
      return parts.join('\n\n');
    }
    return '';
  };

  useEffect(() => {
    const targetId = id || 'min-1';
    getMinutesById(targetId)
      .then((data) => {
        setMinutes(data);
        setContent(extractMarkdown(data));
      })
      .catch(() => {
        getMinutesById('min-1').then((data) => {
          setMinutes(data);
          setContent(extractMarkdown(data));
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const [versionsList, setVersionsList] = useState([]);

  const openVersionsDrawer = async () => {
    setVersionDrawerOpen(true);
    try {
      const vers = await getMinutesVersions(minutes.id || minutes._id);
      if (vers && vers.length) setVersionsList(vers);
    } catch (err) {
      // Use existing mock versions if endpoint not populated
      if (minutes.versions) setVersionsList(minutes.versions);
    }
  };

  const handleRestoreVersion = async (verNum) => {
    try {
      await restoreMinutesVersion(minutes.id || minutes._id, verNum);
      const reloaded = await getMinutesById(minutes.id || minutes._id);
      setMinutes(reloaded);
      setContent(extractMarkdown(reloaded));
      setVersionDrawerOpen(false);
      showToast(`Restored version ${verNum} as new draft head`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExportPdf = () => {
    const url = getMinutesPdfUrl(minutes.id || minutes._id);
    window.open(url, '_blank');
    showToast('Exporting official minutes PDF...', 'info');
  };

  const canEdit = canEditMinutes(currentUser, minutes);

  const handleSave = async () => {
    if (!canEdit) {
      showToast('You do not have permission to edit this minutes record', 'error');
      return;
    }
    try {
      const updated = await updateMinutes(
        minutes.id || minutes._id,
        content,
        currentUser,
        minutes.currentVersion || 1
      );
      setMinutes(updated);
      showToast('Draft version saved and recorded to memory', 'success');
    } catch (err) {
      if (err.status === 409 || err.code === 'VERSION_CONFLICT') {
        setConflictSimulated(true);
        showToast('Version conflict! A newer version was saved by another user.', 'error');
      } else {
        showToast(err.message, 'error');
      }
    }
  };

  const handleSubmitApproval = async () => {
    try {
      const submitted = await submitMinutesForApproval(minutes.id || minutes._id, currentUser);
      setMinutes(submitted);
      showToast('Minutes submitted to committee approvers for sign-off!', 'success');
      navigate('/approvals');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // AI Assistant in-editor helpers
  const handleAIAssistSummary = () => {
    const aiSummarySnippet = `\n\n### 4. Executive AI Summary\n> The quorum ratified Decision #DEC-042 allocating $340,000 to secondary region disaster recovery failover. Sarah Chen (SecOps DRI) was assigned to file the cryptographic SOC2 compliance addendum by 5:00 PM today.\n`;
    setContent((prev) => prev + aiSummarySnippet);
    showToast('Appended AI-generated executive summary!', 'success');
  };

  const handleAIAssistActions = () => {
    const aiActionSnippet = `\n\n### 5. AI Suggested Action Items\n- [ ] **ACT-1045**: Submit cloud quota increase ticket (DRI: Alex Rivera, Due: Nov 18)\n- [ ] **ACT-1046**: Publish locked minutes to investor ledger (DRI: Divya S., Due: Nov 17)\n`;
    setContent((prev) => prev + aiActionSnippet);
    showToast('Appended AI-suggested action items with DRIs!', 'success');
  };

  if (loading || !minutes) {
    return (
      <div className="py-20 text-center text-text-secondary font-mono text-xs">
        Loading minutes editor workspace...
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in font-body">
      {/* ---------------- TOP ACTION & STATUS BAR ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-card p-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to={`/meetings/${minutes.meetingId}`}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-muted border border-border">
              {minutes.meetingCode}
            </span>
            <h1 className="font-heading font-bold text-lg text-text-primary">
              {minutes.meetingTitle}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-muted text-[11px] font-mono font-bold text-text-primary">
              {minutes.currentVersion}
            </span>
            <Pill status={minutes.status} size="sm" />
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary font-mono">
            <span>Last modified by {minutes.lastModifiedBy}</span>
            <span>•</span>
            <span className="text-text-primary font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              Autosaved • Cryptographic Hash: SHA-256
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={History}
            onClick={openVersionsDrawer}
          >
            Versions ({versionsList.length || minutes.versions?.length || 1})
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleExportPdf}
          >
            Export PDF
          </Button>

          {canEdit && (
            <Button variant="secondary" size="sm" icon={Save} onClick={handleSave}>
              Save Draft
            </Button>
          )}

          {canEdit && minutes.status !== 'Approved' && (
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={handleSubmitApproval}
            >
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Conflict simulation warning banner if triggered */}
      {conflictSimulated && (
        <div className="p-3 rounded-card bg-warning-bg border border-warning-border text-warning text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Concurrent Modification Conflict:</strong> Another editor (Elena Rostova) updated section 2 while you were editing.
            </span>
          </div>
          <button
            onClick={() => {
              setViewMode('compare');
              setConflictSimulated(false);
            }}
            className="px-3 py-1 rounded-btn bg-text-primary text-bg font-semibold text-xs"
          >
            Review & Resolve Diff
          </button>
        </div>
      )}

      {/* Editor / Preview / Compare Tabs & AI Quick Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center bg-surface border border-border p-1 rounded-btn shadow-xs">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1 text-xs rounded-btn font-semibold transition-colors ${
              viewMode === 'editor'
                ? 'bg-text-primary text-bg font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Markdown Editor
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 text-xs rounded-btn font-semibold transition-colors ${
              viewMode === 'preview'
                ? 'bg-text-primary text-bg font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Rendered Executive Preview
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1 text-xs rounded-btn font-semibold transition-colors ${
              viewMode === 'compare'
                ? 'bg-text-primary text-bg font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Compare (v1.4 vs v1.0)
          </button>
        </div>

        {/* AI Quick Suggestions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAIAssistSummary}
            className="px-2.5 py-1 rounded-btn bg-accent-tint hover:bg-accent/30 text-text-primary border border-accent/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent stroke-[2.2]" />
            <span>AI Draft Summary</span>
          </button>
          <button
            onClick={handleAIAssistActions}
            className="px-2.5 py-1 rounded-btn bg-accent-tint hover:bg-accent/30 text-text-primary border border-accent/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent stroke-[2.2]" />
            <span>AI Suggest Actions</span>
          </button>
          <button
            type="button"
            onClick={() => setConflictSimulated(true)}
            className="text-[10px] font-mono text-text-secondary hover:underline px-1"
            title="Simulate concurrent conflict"
          >
            (Simulate conflict)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'editor' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-3 bg-surface-muted/60 border-b border-border text-xs text-text-secondary font-mono flex items-center justify-between">
            <span>Structured Markdown • UTF-8</span>
            <span>{content.split(/\s+/).filter(Boolean).length} words</span>
          </div>
          <textarea
            value={content}
            disabled={!canEdit}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[520px] p-5 font-mono text-xs leading-relaxed bg-surface text-text-primary resize-none focus:outline-none selection:bg-accent selection:text-text-primary"
            placeholder="Type meeting minutes using standard Markdown..."
          />
        </Card>
      )}

      {viewMode === 'preview' && (
        <Card padding="p-6 sm:p-10" className="max-w-4xl mx-auto shadow-sm">
          <div className="prose dark:prose-invert max-w-none text-text-primary text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-body">
            {content}
          </div>
        </Card>
      )}

      {viewMode === 'compare' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="p-4" className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-mono text-xs font-bold text-text-secondary">
                Version 1.0 (Baseline Quorum Draft)
              </span>
              <span className="text-[10px] font-mono">Divya S. • 10:45 AM</span>
            </div>
            <pre className="font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed h-[420px] overflow-y-auto">
              {minutes.contentMarkdown}
            </pre>
          </Card>

          <Card padding="p-4" className="space-y-2 border-accent">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-mono text-xs font-bold text-text-primary">
                Current Working Copy ({minutes.currentVersion})
              </span>
              <span className="px-2 py-0.5 rounded bg-accent text-accent-text text-[10px] font-mono font-bold">
                Active Diff
              </span>
            </div>
            <pre className="font-mono text-xs text-text-primary whitespace-pre-wrap leading-relaxed h-[420px] overflow-y-auto">
              {content}
            </pre>
          </Card>
        </div>
      )}

      {/* Version History Drawer / Modal */}
      <Modal
        isOpen={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        title="Immutable Version Log"
        description="All revisions are indexed with cryptographic checksums. Restore creates a new draft version."
      >
        <div className="space-y-3 text-xs">
          {(versionsList.length ? versionsList : (minutes.versions || [{ version: minutes.currentVersion || 1, note: 'Current draft', modifiedBy: minutes.lastModifiedBy || 'Author', timestamp: 'Recent' }])).map((ver, idx) => (
            <div
              key={ver.id || ver._id || idx}
              className="p-3 rounded-btn bg-surface-muted/60 border border-border flex items-center justify-between gap-3"
            >
              <div>
                <span className="font-mono font-bold text-text-primary block">
                  Version {ver.version} • {ver.changeNote || ver.note || 'Revision'}
                </span>
                <span className="text-[11px] text-text-secondary">
                  By {ver.editedBy?.name || ver.modifiedBy || 'Author'} at {ver.createdAt ? new Date(ver.createdAt).toLocaleTimeString() : (ver.timestamp || 'Recorded')}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    if (ver.body) {
                      setContent(ver.body);
                    } else {
                      try {
                        const vData = await getMinutesVersionBody(minutes.id || minutes._id, ver.version);
                        if (vData && vData.body) setContent(vData.body);
                      } catch (_) {}
                    }
                    showToast(`Switched view to version ${ver.version}`, 'info');
                    setVersionDrawerOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-btn bg-surface border border-border text-xs font-medium hover:bg-surface-hover"
                >
                  View
                </button>
                {canEdit && (
                  <button
                    onClick={() => handleRestoreVersion(ver.version)}
                    className="px-2.5 py-1 rounded-btn bg-accent text-accent-text text-xs font-semibold hover:bg-accent-hover"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

