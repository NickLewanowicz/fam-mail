import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusCard } from './StatusCard'

describe('StatusCard', () => {
  describe('Loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      render(<StatusCard isLoading={true} />)
      expect(screen.getByText('Connecting to backend...')).toBeInTheDocument()
    })

    it('shows loading spinner even when connected', () => {
      render(<StatusCard isLoading={true} connected={true} />)
      expect(screen.getByText('Connecting to backend...')).toBeInTheDocument()
    })

    it('shows loading spinner even when there is an error', () => {
      render(<StatusCard isLoading={true} error="Some error" />)
      expect(screen.getByText('Connecting to backend...')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('shows error when not connected and not loading', () => {
      render(<StatusCard isLoading={false} connected={false} error="Connection refused" />)
      expect(screen.getByText(/Backend connection failed/)).toBeInTheDocument()
      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    })

    it('shows error message in the alert', () => {
      render(<StatusCard isLoading={false} connected={false} error="Network timeout" />)
      expect(screen.getByText(/Network timeout/)).toBeInTheDocument()
    })

    it('shows empty error when error prop is not provided', () => {
      render(<StatusCard isLoading={false} connected={false} />)
      expect(screen.getByText(/Backend connection failed:/)).toBeInTheDocument()
    })
  })

  describe('Connected state', () => {
    it('shows success message when connected', () => {
      render(<StatusCard isLoading={false} connected={true} message="Backend is healthy" />)
      expect(screen.getByText(/Connected/)).toBeInTheDocument()
      expect(screen.getByText(/Backend is healthy/)).toBeInTheDocument()
    })

    it('shows connected status with message', () => {
      render(<StatusCard isLoading={false} connected={true} message="All systems go" />)
      expect(screen.getByText('Connected • All systems go')).toBeInTheDocument()
    })

    it('shows connected without message when message is undefined', () => {
      render(<StatusCard isLoading={false} connected={true} />)
      expect(screen.getByText(/Connected •/)).toBeInTheDocument()
    })
  })

  describe('Default props', () => {
    it('defaults to error state when no props provided', () => {
      render(<StatusCard isLoading={false} />)
      // connected defaults to undefined which is falsy, so shows error state
      expect(screen.getByText(/Backend connection failed/)).toBeInTheDocument()
    })
  })
})
