import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary that catches runtime errors in child components
 * and displays a user-friendly fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Only log in development — production should use an error tracking service
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Caught error:', error)
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
            <div className="card-body text-center">
              <div className="text-5xl mb-4">📮</div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Something went wrong</h2>
              <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                That's on us, not you. Try again — if it keeps happening, reload
                the page or include the error below in a bug report.
              </p>
              {this.state.error && (
                <div className="bg-base-200 rounded-lg p-3 mt-4 text-left">
                  <p className="text-sm font-mono text-error break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="card-actions justify-center mt-6 gap-2">
                <button
                  className="h-10 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
                  onClick={this.handleReset}
                >
                  Try again
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
