import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      let readable = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as {
          error?: string;
          operationType?: string;
          path?: string;
        };
        if (parsed.error) {
          readable = `${parsed.error}${parsed.path ? ` (${parsed.operationType} on ${parsed.path})` : ''}`;
        }
      } catch {
        // Not a JSON FirestoreErrorInfo string
      }

      return (
        <div className="min-h-screen ambient-canvas text-zinc-900 flex items-center justify-center px-6">
          <div className="max-w-lg w-full glass-panel-strong rounded-3xl p-8">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
              System Notice
            </p>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">
              Unable to complete request
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed mb-6 break-words">
              {readable}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
