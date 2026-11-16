// src/components/Toast.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((messageOrObj, type = 'success', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    let message = '';
    let title = '';
    let toastType = type;

    if (typeof messageOrObj === 'object' && messageOrObj !== null) {
      title = messageOrObj.title || '';
      message = messageOrObj.description || messageOrObj.message || '';
      toastType = messageOrObj.variant || messageOrObj.type || type;
      if (messageOrObj.duration) duration = messageOrObj.duration;
    } else {
      message = String(messageOrObj);
    }

    setToasts((prev) => [...prev, { id, title, message, type: toastType }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const addToast = showToast;

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast rendering portal */}
      <div
        className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          let Icon = CheckCircle2;
          let borderClasses = 'border-success-border bg-surface text-text-primary';
          let iconColor = 'text-success';

          if (toast.type === 'error') {
            Icon = AlertCircle;
            borderClasses = 'border-error-border bg-surface text-text-primary';
            iconColor = 'text-error';
          } else if (toast.type === 'info') {
            Icon = Info;
            borderClasses = 'border-info-border bg-surface text-text-primary';
            iconColor = 'text-info';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-card border ${borderClasses} shadow-lg animate-modal-enter transition-all`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor} mt-0.5`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="text-xs font-bold text-text-primary leading-tight">{toast.title}</div>}
                <div className="text-xs text-text-secondary leading-snug">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-btn hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
