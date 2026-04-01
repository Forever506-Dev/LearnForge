import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Custom fallback UI — if omitted a built-in error card is rendered. */
  fallback?: ReactNode;
  /**
   * When any value in this array changes between renders the boundary
   * automatically resets, e.g. pass `[location.pathname]` to recover on
   * route changes.
   */
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console so devs can see the full stack in DevTools
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-reset when any resetKey changes (e.g. the route changed)
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys !== this.props.resetKeys &&
      this.props.resetKeys.some((k, i) => k !== prevProps.resetKeys?.[i])
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Consumer-supplied fallback takes priority
    if (this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    // Built-in styled error card
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-red-400">
        <AlertTriangle size={40} />
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-sm text-gray-400 max-w-md text-center break-words px-4">
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }
}
