// src/assistant/AssistantPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  AlertTriangle,
  WifiOff,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PAGE_PROMPT_CHIPS } from '../data/assistantKnowledge';
import { sendAssistantMessage, getAssistantMode } from '../services/assistant';
import { useAuth } from '../auth/AuthContext';
import DraftCard from './DraftCard';

export default function AssistantPanel({ isOpen, onClose }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [inputWordCountError, setInputWordCountError] = useState(false);

  const assistantMode = getAssistantMode();

  // Determine current page key for prompt chips
  const path = location.pathname.replace('/', '') || 'dashboard';
  let pageKey = path;
  if (path === '' || path === '/') pageKey = 'landing';
  else if (path.startsWith('meetings/')) pageKey = 'meeting-details';
  else if (path.startsWith('minutes/')) pageKey = 'minutes';
  else if (!PAGE_PROMPT_CHIPS[path]) pageKey = 'dashboard';

  const chips = PAGE_PROMPT_CHIPS[pageKey] || PAGE_PROMPT_CHIPS['dashboard'];

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut listener (Escape closes panel)
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      // Focus textarea on open
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.focus();
      }, 100);

      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle textarea input auto-grow & word count limit check
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const words = val.trim().split(/\s+/).filter(Boolean).length;
    setInputWordCountError(words > 5000);

    // Auto-grow
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping || !isOnline || inputWordCountError) return;

    setErrorState(null);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg = { id: `msg-${Date.now()}`, sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await sendAssistantMessage({
        message: text,
        conversationHistory: messages,
        currentRoute: location.pathname,
        pageName: pageKey,
        userRole: currentUser?.role || 'Coordinator',
        user: currentUser,
      });

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        draft: (response.drafts && response.drafts[0]) || response.draft || null,
        mode: response.mode,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setErrorState({
        failedMessage: text,
        errorText: err.message || 'An error occurred while communicating with the assistant.',
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setErrorState(null);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby="assistant-title"
      aria-modal="true"
      className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[380px] max-h-[82vh] sm:max-h-[620px] h-[580px] bg-surface border border-border rounded-modal shadow-2xl flex flex-col justify-between overflow-hidden animate-modal-enter"
    >
      {/* ---------------- PANEL HEADER ---------------- */}
      <div className="p-4 border-b border-border bg-surface-muted/50 flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-btn bg-accent text-accent-text flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h2 id="assistant-title" className="font-heading font-bold text-sm text-text-primary">
              MeetTrack assistant
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[10px] font-mono font-medium text-text-secondary uppercase">
                {pageKey} context
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-btn text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors text-xs flex items-center gap-1"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-btn text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
            aria-label="Close assistant panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ---------------- OFFLINE & DEMO MODE BANNERS ---------------- */}
      {!isOnline && (
        <div className="bg-error-bg border-b border-error-border p-2 px-3 text-xs text-error flex items-center gap-2 font-medium">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You are offline. Assistant composer is disabled until connectivity restores.</span>
        </div>
      )}

      {assistantMode === 'local' && (
        <div className="bg-surface-muted border-b border-border px-3 py-1.5 text-[11px] text-text-secondary flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 text-accent-text shrink-0 mt-0.5" />
          <span>
            Demo mode: answers come from sample Engineering Fest data.
          </span>
        </div>
      )}

      {/* ---------------- MESSAGE BODY & CONVERSATION ---------------- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Intro greeting */}
        <div className="p-3 rounded-card bg-surface-muted/60 border border-border text-text-secondary leading-relaxed">
          <p className="font-medium text-text-primary mb-1">
            How can I help you in {pageKey}?
          </p>
          <p>
            I can explain governance rules, audit agendas, locate decisions, or draft action items with suggested DRIs.
          </p>
        </div>

        {/* Suggested Prompt Chips */}
        {messages.length === 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-semibold">
              Suggested prompts
            </span>
            <div className="flex flex-col gap-1.5">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="text-left p-2 rounded-btn bg-surface hover:bg-surface-muted border border-border hover:border-accent text-text-primary font-medium text-xs transition-colors flex items-center justify-between group shadow-xs"
                >
                  <span>"{chip}"</span>
                  <span className="text-text-secondary group-hover:text-accent font-bold transition-colors">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3 rounded-card leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-text-primary text-bg font-medium shadow-xs'
                  : 'bg-surface-muted text-text-primary border border-border shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {/* Draft Proposal Card if generated */}
              {msg.draft && (
                <DraftCard
                  draft={msg.draft}
                  onDismiss={() => {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === msg.id ? { ...m, draft: null } : m
                      )
                    );
                  }}
                />
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator (3 dots opacity only per spec) */}
        {isTyping && (
          <div className="flex items-center gap-1.5 p-3 rounded-card bg-surface-muted w-16 border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary animate-pulse-subtle" />
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary animate-pulse-subtle delay-150" />
            <span className="w-1.5 h-1.5 rounded-full bg-text-primary animate-pulse-subtle delay-300" />
          </div>
        )}

        {/* Error card with Retry (preserving user input) */}
        {errorState && (
          <div className="p-3 rounded-card bg-error-bg border border-error-border text-error space-y-2 animate-fade-in">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Failed to generate reply</span>
            </div>
            <p className="text-[11px] leading-relaxed">{errorState.errorText}</p>
            <button
              onClick={() => handleSendMessage(errorState.failedMessage)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-error text-white font-medium text-[11px] shadow-xs btn-press"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try again</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ---------------- COMPOSER ---------------- */}
      <div className="p-3 border-t border-border bg-surface-muted/30">
        <div className="relative flex flex-col">
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={!isOnline}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isOnline ? 'Ask anything about MeetTrack or this record...' : 'Assistant is offline...'
            }
            aria-label="Ask anything"
            className="w-full resize-none pr-10 p-2.5 text-xs bg-surface border border-border rounded-input text-text-primary placeholder:text-text-secondary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none transition-colors max-h-28"
          />

          <button
            disabled={!input.trim() || isTyping || !isOnline || inputWordCountError}
            onClick={() => handleSendMessage()}
            className="absolute right-2 bottom-2 w-7 h-7 rounded-btn bg-accent text-accent-text flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none hover:bg-accent-hover transition-colors shadow-xs"
            aria-label="Send message to assistant"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Word limit validation warning */}
        {inputWordCountError && (
          <p className="text-[11px] text-error font-medium mt-1">
            Input exceeds 5,000 words. Please shorten your prompt.
          </p>
        )}

        {/* Privacy Note */}
        <p className="text-[10px] text-text-secondary mt-1.5 text-center leading-tight">
          Drafts are not saved until you confirm them. Don't share passwords or payment details.
        </p>
      </div>
    </div>
  );
}

