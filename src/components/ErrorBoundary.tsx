import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — captures render-time exceptions so the app
 * never shows a blank screen on a silent failure.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  private handleReload = () => {
    try {
      // Clear potentially stale chunk-reload flag
      window.sessionStorage.removeItem("sparky-chunk-reload");
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="bg-background text-foreground flex flex-col items-center justify-center px-6 text-center"
          style={{ minHeight: "100svh" }}
        >
          <div className="max-w-sm space-y-4">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/15 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h1 className="text-lg font-display font-bold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Tivemos um problema ao carregar essa tela. Tente recarregar — seus dados estão seguros.
            </p>
            {this.state.error?.message && (
              <p className="text-[10px] font-mono text-muted-foreground/70 bg-muted/40 rounded-lg p-2 break-words">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              Recarregar app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
