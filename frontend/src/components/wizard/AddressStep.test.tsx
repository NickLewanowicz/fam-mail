import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddressStep } from './AddressStep'
import type { Address } from '../../types/address'

describe('AddressStep', () => {
  const onAddressChange = vi.fn()
  const onNext = vi.fn()
  const onBack = vi.fn()

  beforeEach(() => {
    onAddressChange.mockClear()
    onNext.mockClear()
    onBack.mockClear()
  })

  it('renders Recipient Address title', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByRole('heading', { name: /Recipient Address/i })).toBeInTheDocument()
  })

  it('shows all required form fields', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Last Name')).toBeInTheDocument()
    expect(screen.getByText('Address Line 1')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('State/Province')).toBeInTheDocument()
    expect(screen.getByText('ZIP/Postal Code')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Jane')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('123 Main Street')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Toronto')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ON')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('M5V 2T6')).toBeInTheDocument()
  })

  it('shows country selector defaulting to US', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    const country = screen.getByRole('combobox')
    expect(country).toHaveValue('US')
  })

  it('pre-fills form when address prop is provided', () => {
    const address: Address = {
      firstName: 'Alex',
      lastName: 'Smith',
      addressLine1: '99 Oak',
      addressLine2: 'Unit 2',
      city: 'Vancouver',
      provinceOrState: 'BC',
      postalOrZip: 'V6B1A1',
      countryCode: 'CA',
    }
    render(
      <AddressStep address={address} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Smith')).toBeInTheDocument()
    expect(screen.getByDisplayValue('99 Oak')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Unit 2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Vancouver')).toBeInTheDocument()
    expect(screen.getByDisplayValue('BC')).toBeInTheDocument()
    expect(screen.getByDisplayValue('V6B1A1')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('CA')
  })

  it('shows Required errors on empty required fields when clicking Next', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Next: Review/i }))
    const required = screen.getAllByText('Required')
    expect(required.length).toBeGreaterThanOrEqual(6)
    expect(onAddressChange).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('calls onAddressChange and onNext when form is valid', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '1 Main' } })
    fireEvent.change(screen.getByPlaceholderText('Toronto'), { target: { value: 'Toronto' } })
    fireEvent.change(screen.getByPlaceholderText('ON'), { target: { value: 'ON' } })
    fireEvent.change(screen.getByPlaceholderText('M5V 2T6'), { target: { value: 'M5V2T6' } })
    fireEvent.click(screen.getByRole('button', { name: /Next: Review/i }))
    expect(onAddressChange).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        addressLine1: '1 Main',
        city: 'Toronto',
        provinceOrState: 'ON',
        postalOrZip: 'M5V2T6',
        countryCode: 'US',
      }),
    )
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('Back button calls onBack', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('Address Line 2 is optional (no error when empty)', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Jane' } })
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByPlaceholderText('123 Main Street'), { target: { value: '1 Main' } })
    fireEvent.change(screen.getByPlaceholderText('Toronto'), { target: { value: 'Toronto' } })
    fireEvent.change(screen.getByPlaceholderText('ON'), { target: { value: 'ON' } })
    fireEvent.change(screen.getByPlaceholderText('M5V 2T6'), { target: { value: 'M5V2T6' } })
    fireEvent.click(screen.getByRole('button', { name: /Next: Review/i }))
    expect(onNext).toHaveBeenCalled()
  })

  it('country can be changed to CA, GB, AU', () => {
    render(
      <AddressStep address={null} onAddressChange={onAddressChange} onNext={onNext} onBack={onBack} />,
    )
    const country = screen.getByRole('combobox')
    fireEvent.change(country, { target: { value: 'CA' } })
    expect(country).toHaveValue('CA')
    fireEvent.change(country, { target: { value: 'GB' } })
    expect(country).toHaveValue('GB')
    fireEvent.change(country, { target: { value: 'AU' } })
    expect(country).toHaveValue('AU')
  })
})
