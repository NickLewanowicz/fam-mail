import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />)
    expect(screen.getByText('📮 Fam Mail')).toBeInTheDocument()
  })

  it('displays the tagline', () => {
    render(<Header />)
    expect(screen.getByText('Send postcards to the people you love')).toBeInTheDocument()
  })

  it('does not show test mode badge by default', () => {
    render(<Header />)
    expect(screen.queryByText('🧪 Test Mode')).not.toBeInTheDocument()
  })

  it('shows test mode badge when testMode is true', () => {
    render(<Header testMode={true} />)
    expect(screen.getByText('🧪 Test Mode')).toBeInTheDocument()
  })

  it('does not show test mode badge when testMode is false', () => {
    render(<Header testMode={false} />)
    expect(screen.queryByText('🧪 Test Mode')).not.toBeInTheDocument()
  })

  it('renders heading as h1', () => {
    render(<Header />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('📮 Fam Mail')
  })

  it('applies gradient background classes', () => {
    render(<Header />)
    const container = screen.getByText('📮 Fam Mail').closest('.bg-gradient-to-r')
    expect(container).toBeInTheDocument()
  })
})
