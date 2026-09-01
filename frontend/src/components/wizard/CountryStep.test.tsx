import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    expect(screen.getByText('Where is this going?')).toBeInTheDocument()
    expect(screen.getByText('Choose the destination country')).toBeInTheDocument()
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

  it('highlights selected country with border-zinc-900 in className', () => {
    const { container } = render(
      <CountryStep
        countryCode="CA"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const buttons = container.querySelectorAll('button')
    const caButton = buttons[1]
    expect(caButton?.className).toContain('border-zinc-900')
  })

  it('non-selected countries use border-zinc-200, not the selected border', () => {
    const { container } = render(
      <CountryStep
        countryCode="US"
        onCountryChange={mockOnCountryChange}
        onNext={mockOnNext}
      />
    )
    const buttons = container.querySelectorAll('button')
    const caButton = buttons[1]
    const caClasses = caButton?.className.split(/\s+/) ?? []
    expect(caClasses).toContain('border-zinc-200')
    expect(caClasses).not.toContain('border-zinc-900')
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
    expect(screen.getByText('USPS delivery')).toBeInTheDocument()
    expect(screen.getByText('Canada Post')).toBeInTheDocument()
    expect(screen.getByText('Royal Mail')).toBeInTheDocument()
  })
})
