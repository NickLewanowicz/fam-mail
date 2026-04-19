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
        <div className="min-h-screen flex items-center justify-center bg-base-200" data-theme="light">
          <div className="card bg-base-100 shadow-xl max-w-md w-full mx-4">
            <div className="card-body text-center">
              <div className="text-6xl mb-4">😵</div>
              <h2 className="card-title justify-center text-2xl">Something went wrong</h2>
              <p className="text-base-content/70 mt-2">
                An unexpected error occurred. Please try refreshing the page.
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
                  className="btn btn-primary"
                  onClick={this.handleReset}
                >
                  Try Again
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
