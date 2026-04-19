import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import '@testing-library/jest-dom/vitest'
import { ErrorBoundary } from './ErrorBoundary'

// Suppress console.error output in tests (ErrorBoundary logs errors)
const originalConsoleError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalConsoleError
})

// Component that throws an error when requested
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error from ThrowingComponent')
  }
  return <div data-testid="child-content">All good</div>
}

describe('ErrorBoundary', () => {
  describe('Normal rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('All good')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('should show fallback UI when a child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display the error message in the fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Test error from ThrowingComponent')).toBeInTheDocument()
    })

    it('should show Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('should show Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    })

    it('should log the error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('Recovery', () => {
    it('should reset error state when Try Again is clicked', async () => {
      const user = userEvent.setup()

      // Use a stateful wrapper so the child can stop throwing after reset
      let shouldThrow = true
      function ConditionalThrower() {
        if (shouldThrow) {
          throw new Error('Recoverable error')
        }
        return <div data-testid="recovered">Recovered!</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      )

      // Should show fallback
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Fix the error source
      shouldThrow = false

      // Click Try Again — this resets state, causing a re-render with the same children
      await user.click(screen.getByRole('button', { name: /try again/i }))

      // Need to rerender to pick up the shouldThrow change
      rerender(
        <ErrorBoundary>
          <ConditionalThrower />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('recovered')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should reload the page when Reload Page is clicked', async () => {
      const user = userEvent.setup()
      const reloadSpy = vi.fn()
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        reload: reloadSpy,
      } as unknown as Location)

      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      await user.click(screen.getByRole('button', { name: /reload page/i }))
      expect(reloadSpy).toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })

  describe('Custom fallback', () => {
    it('should render custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom error UI</div>}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom error UI')).toBeInTheDocument()
      // Default fallback should NOT be shown
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })

  describe('Multiple children', () => {
    it('should catch errors from any child in the tree', () => {
      function SiblingComponent() {
        return <div data-testid="sibling">Sibling</div>
      }

      render(
        <ErrorBoundary>
          <SiblingComponent />
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )

      // Both children should be replaced by fallback
      expect(screen.queryByTestId('sibling')).not.toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should catch errors from deeply nested children', () => {
      function DeepChild() {
        throw new Error('Deep error')
      }
      function MiddleComponent() {
        return (
          <div>
            <DeepChild />
          </div>
        )
      }

      render(
        <ErrorBoundary>
          <MiddleComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Deep error')).toBeInTheDocument()
    })
  })
})
