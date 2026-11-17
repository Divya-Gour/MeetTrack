import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MeetTrack ErrorBoundary Catch]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-6 shadow-card text-center">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-heading mb-2">Something went wrong</h2>
            <p className="text-sm text-text-secondary mb-4">
              An unexpected error occurred while rendering this page.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-surface-muted p-3 rounded-lg overflow-x-auto text-error font-mono mb-6 max-h-32">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
