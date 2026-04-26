"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

// Duck-typed AppError check. We can't import @repo/platform directly because it pulls
// node:async_hooks (LoggerContext ALS) into the client bundle. The contract — error.name
// === "AppError" with a string `code` — is stable across the platform package.
function isAppErrorShape(error: Error): error is Error & { code: string } {
  return error.name === "AppError" && typeof (error as { code?: unknown }).code === "string";
}

/**
 * Class-based React error boundary for the web client. Catches render-phase errors below
 * it. Event-handler and async errors are NOT caught — those need explicit try/catch or a
 * global window.error handler.
 *
 * Use a single root boundary in the layout/providers as the safety net, and add narrower
 * boundaries around risky surfaces (third-party widgets, routes loading remote content)
 * when their failures should not blank the whole page.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (this.props.onError) {
      this.props.onError(error, info);
      return;
    }
    if (isAppErrorShape(error)) {
      console.error(`[ErrorBoundary] ${error.code}:`, error.message, info);
      return;
    }
    console.error("[ErrorBoundary]", error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
        <h1 className="font-semibold text-2xl">Something went wrong.</h1>
        <p className="text-slate-600 text-sm">
          {isAppErrorShape(error) ? `${error.code}: ${error.message}` : error.message}
        </p>
        <button
          className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700"
          onClick={this.reset}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }
}
