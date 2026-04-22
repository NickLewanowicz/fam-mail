import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CountryStep } from './CountryStep'

describe('CountryStep', () => {
  const mockOnNext = vi.fn()
  const mockOnCountryChange = vi.fn()

  beforeEach(() => {
    mockOnNext.mockClear()
    mockOnCountryChange.mockClear()
  })

  it('renders heading and subheading', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    expect(screen.getByText('Where are you sending this?')).toBeInTheDocument()
    expect(screen.getByText('Choose the destination country for your postcard')).toBeInTheDocument()
  })

  it('renders 3 country options', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('Canada')).toBeInTheDocument()
    expect(screen.getByText('United Kingdom')).toBeInTheDocument()
  })

  it('renders country flags', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    expect(screen.getByText('🇺🇸')).toBeInTheDocument()
    expect(screen.getByText('🇨🇦')).toBeInTheDocument()
    expect(screen.getByText('🇬🇧')).toBeInTheDocument()
  })

  it('highlights selected country with border-primary class', () => {
    const { container } = render(
      <CountryStep
        countryCode="CA"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const cards = container.querySelectorAll('.card')
    // Second card should be Canada (CA)
    const caCard = cards[1]
    expect(caCard).toHaveClass('border-primary')
  })

  it('non-selected countries have border-base-300', () => {
    const { container } = render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const cards = container.querySelectorAll('.card')
    // Second card (CA) should not have border-primary
    expect(cards[1]).not.toHaveClass('border-primary')
    expect(cards[1]).toHaveClass('border-base-300')
  })

  it('calls onCountryChange and onNext when US is clicked', () => {
    render(
      <CountryStep
        countryCode="GB"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const usButton = screen.getByText('United States').closest('button')
    expect(usButton).toBeInTheDocument()
    fireEvent.click(usButton!)
    expect(mockOnCountryChange).toHaveBeenCalledWith('US')
    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('calls onCountryChange and onNext when CA is clicked', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const caButton = screen.getByText('Canada').closest('button')
    expect(caButton).toBeInTheDocument()
    fireEvent.click(caButton!)
    expect(mockOnCountryChange).toHaveBeenCalledWith('CA')
    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('calls onCountryChange and onNext when GB is clicked', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const gbButton = screen.getByText('United Kingdom').closest('button')
    expect(gbButton).toBeInTheDocument()
    fireEvent.click(gbButton!)
    expect(mockOnCountryChange).toHaveBeenCalledWith('GB')
    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('shows country descriptions', () => {
    render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    expect(screen.getByText('USA postal service')).toBeInTheDocument()
    expect(screen.getByText('Canada Post')).toBeInTheDocument()
    expect(screen.getByText('Royal Mail')).toBeInTheDocument()
  })
})
