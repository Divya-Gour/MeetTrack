// src/assistant/AssistantButton.jsx
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AssistantPanel from './AssistantPanel';

export default function AssistantButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button per spec */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
        {/* Desktop Button: Lime Pill with sparkle icon & text "AI assistant" */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Open AI assistant"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-accent-text hover:bg-accent-hover font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] border border-accent-text/10"
        >
          <Sparkles className="w-4 h-4 stroke-[2.2] animate-pulse" />
          <span>AI assistant</span>
        </button>

        {/* Mobile Button: 52px round icon button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Open AI assistant"
          className="sm:hidden w-[52px] h-[52px] rounded-full bg-accent text-accent-text flex items-center justify-center shadow-lg active:scale-95 border border-accent-text/10"
        >
          <Sparkles className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Floating Assistant Panel */}
      <AssistantPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

