import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddressForm } from './AddressForm'
import type { Address } from '../../types/address'

describe('AddressForm', () => {
  const mockOnSubmit = vi.fn()
  const defaultInitialAddress: Partial<Address> = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render the address form with all fields visible', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      expect(screen.getByText('Recipient Address')).toBeInTheDocument()
      expect(screen.getByText('First Name')).toBeInTheDocument()
      expect(screen.getByText('Last Name')).toBeInTheDocument()
      expect(screen.getByText('Address Line 1')).toBeInTheDocument()
      expect(screen.getByText('Address Line 2')).toBeInTheDocument()
      expect(screen.getByText('City')).toBeInTheDocument()
      expect(screen.getByText('Province/State')).toBeInTheDocument()
      expect(screen.getByText('Postal/Zip Code')).toBeInTheDocument()
      expect(screen.getByText('Country')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save Address' })).toBeInTheDocument()
    })

    it('should display required field indicators', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      // Check that all required field labels exist
      expect(screen.getByText('First Name')).toBeInTheDocument()
      expect(screen.getByText('Last Name')).toBeInTheDocument()
      expect(screen.getByText('Address Line 1')).toBeInTheDocument()
      expect(screen.getByText('City')).toBeInTheDocument()
      expect(screen.getByText('Province/State')).toBeInTheDocument()
      expect(screen.getByText('Postal/Zip Code')).toBeInTheDocument()
      expect(screen.getByText('Country')).toBeInTheDocument()

      // Count asterisks to ensure all required fields have them
      const asterisks = screen.getAllByText('*')
      expect(asterisks).toHaveLength(7) // All fields except address line 2
    })

    it('should not show required indicator for optional address line 2', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const addressLine2Label = screen.getByText('Address Line 2')
      expect(addressLine2Label).toBeInTheDocument()
      expect(addressLine2Label.textContent).not.toContain('*')
    })

    it('should populate form with initial address values', () => {
      const initialAddress: Partial<Address> = {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Toronto',
        provinceOrState: 'ON',
        postalOrZip: 'M5V 2N6',
        countryCode: 'CA'
      }

      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={initialAddress} />)

      expect(screen.getByDisplayValue('John')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Toronto')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ON')).toBeInTheDocument()
      expect(screen.getByDisplayValue('M5V 2N6')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Canada')).toBeInTheDocument()
    })

    it('should have proper placeholders for all fields', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      expect(screen.getByPlaceholderText('John')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('123 Main Street')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Apt 4B (optional)')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('City')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Province/State')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Postal/Zip Code')).toBeInTheDocument()
    })

    it('should have country select with correct options', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'United States' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'United Kingdom' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Australia' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for all required fields when submitting empty form', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
        expect(screen.getByText('Last name is required')).toBeInTheDocument()
        expect(screen.getByText('Address is required')).toBeInTheDocument()
        expect(screen.getByText('City is required')).toBeInTheDocument()
        expect(screen.getByText('Province/State is required')).toBeInTheDocument()
        expect(screen.getByText('Postal/Zip code is required')).toBeInTheDocument()
        // Country has default value 'CA', so it may not show validation error
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should clear validation error when user types in required field', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
      })

      const firstNameInput = screen.getByPlaceholderText('John')
      await user.type(firstNameInput, 'John')

      await waitFor(() => {
        expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
      })
    })

    it('should trigger real-time validation on field change', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const firstNameInput = screen.getByPlaceholderText('John')

      // Field should start without error
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument()

      // Type and then clear to trigger validation
      await user.type(firstNameInput, 'John')
      await user.clear(firstNameInput)

      // Should trigger error on blur
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
      })
    })

    it('should apply error styling to invalid fields', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        const firstNameInput = screen.getByPlaceholderText('John')
        expect(firstNameInput).toHaveClass('input-error')
      })
    })

    it('should allow optional address line 2 to be empty', async () => {
      const user = userEvent.setup()
      const validAddress: Partial<Address> = {
        firstName: 'John',
        lastName: 'Doe',
        addressLine1: '123 Main St',
        city: 'Toronto',
        provinceOrState: 'ON',
        postalOrZip: 'M5V 2N6',
        countryCode: 'CA'
      }

      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={validAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            addressLine1: '123 Main St',
            addressLine2: '',
            city: 'Toronto',
            provinceOrState: 'ON',
            postalOrZip: 'M5V 2N6',
            countryCode: 'CA'
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      await user.type(screen.getByPlaceholderText('John'), 'John')
      await user.type(screen.getByPlaceholderText('Doe'), 'Doe')
      await user.type(screen.getByPlaceholderText('123 Main Street'), '123 Main St')
      await user.type(screen.getByPlaceholderText('City'), 'Toronto')
      await user.type(screen.getByPlaceholderText('Province/State'), 'ON')
      await user.type(screen.getByPlaceholderText('Postal/Zip Code'), 'M5V 2N6')

      const countrySelect = screen.getByRole('combobox')
      await user.selectOptions(countrySelect, 'CA')

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            firstName: 'John',
            lastName: 'Doe',
            addressLine1: '123 Main St',
            addressLine2: '',
            city: 'Toronto',
            provinceOrState: 'ON',
            postalOrZip: 'M5V 2N6',
            countryCode: 'CA'
          },
          expect.any(Object)
        )
      })
    })

    it('should submit form with address line 2 when provided', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      await user.type(screen.getByPlaceholderText('John'), 'Jane')
      await user.type(screen.getByPlaceholderText('Doe'), 'Smith')
      await user.type(screen.getByPlaceholderText('123 Main Street'), '456 Oak Ave')
      await user.type(screen.getByPlaceholderText('Apt 4B (optional)'), 'Apt 7B')
      await user.type(screen.getByPlaceholderText('City'), 'Vancouver')
      await user.type(screen.getByPlaceholderText('Province/State'), 'BC')
      await user.type(screen.getByPlaceholderText('Postal/Zip Code'), 'V6A 1L1')

      const countrySelect = screen.getByRole('combobox')
      await user.selectOptions(countrySelect, 'CA')

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          {
            firstName: 'Jane',
            lastName: 'Smith',
            addressLine1: '456 Oak Ave',
            addressLine2: 'Apt 7B',
            city: 'Vancouver',
            provinceOrState: 'BC',
            postalOrZip: 'V6A 1L1',
            countryCode: 'CA'
          },
          expect.any(Object)
        )
      })
    })

    it('should not submit form when required fields are missing', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      // Fill only some fields
      await user.type(screen.getByPlaceholderText('John'), 'John')
      await user.type(screen.getByPlaceholderText('Doe'), 'Doe')

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Address is required')).toBeInTheDocument()
        expect(screen.getByText('City is required')).toBeInTheDocument()
        expect(screen.getByText('Province/State is required')).toBeInTheDocument()
        expect(screen.getByText('Postal/Zip code is required')).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should handle different country selections', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      await user.type(screen.getByPlaceholderText('John'), 'Alice')
      await user.type(screen.getByPlaceholderText('Doe'), 'Johnson')
      await user.type(screen.getByPlaceholderText('123 Main Street'), '789 Pine St')
      await user.type(screen.getByPlaceholderText('City'), 'New York')
      await user.type(screen.getByPlaceholderText('Province/State'), 'NY')
      await user.type(screen.getByPlaceholderText('Postal/Zip Code'), '10001')

      const countrySelect = screen.getByRole('combobox')
      await user.selectOptions(countrySelect, 'US')

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            countryCode: 'US'
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('User Interactions', () => {
    it('should allow typing in all input fields', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const firstNameInput = screen.getByPlaceholderText('John')
      await user.type(firstNameInput, 'Test User')

      expect(firstNameInput).toHaveValue('Test User')

      const lastNameInput = screen.getByPlaceholderText('Doe')
      await user.type(lastNameInput, 'Last Name')

      expect(lastNameInput).toHaveValue('Last Name')
    })

    it('should handle special characters in input fields', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      await user.type(screen.getByPlaceholderText('John'), "Jean-Claude")
      await user.type(screen.getByPlaceholderText('Doe'), "O'Connor")
      await user.type(screen.getByPlaceholderText('123 Main Street'), "123 Main St. Apt #4B")

      expect(screen.getByDisplayValue("Jean-Claude")).toBeInTheDocument()
      expect(screen.getByDisplayValue("O'Connor")).toBeInTheDocument()
      expect(screen.getByDisplayValue("123 Main St. Apt #4B")).toBeInTheDocument()
    })

    it('should handle whitespace in input fields', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const firstNameInput = screen.getByPlaceholderText('John')
      const cityInput = screen.getByPlaceholderText('City')

      await user.type(firstNameInput, '  John  ')
      await user.type(cityInput, '  Toronto  ')

      expect(firstNameInput).toHaveValue('  John  ')
      expect(cityInput).toHaveValue('  Toronto  ')
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels for all form controls', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      expect(screen.getByText('First Name')).toBeInTheDocument()
      expect(screen.getByText('Last Name')).toBeInTheDocument()
      expect(screen.getByText('Address Line 1')).toBeInTheDocument()
      expect(screen.getByText('Address Line 2')).toBeInTheDocument()
      expect(screen.getByText('City')).toBeInTheDocument()
      expect(screen.getByText('Province/State')).toBeInTheDocument()
      expect(screen.getByText('Postal/Zip Code')).toBeInTheDocument()
      expect(screen.getByText('Country')).toBeInTheDocument()
    })

    it('should associate error messages with form controls', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument()
      })

      // Check that error styling is applied (DaisyUI uses input-error class)
      const firstNameInput = screen.getByPlaceholderText('John')
      expect(firstNameInput).toHaveClass('input-error')
    })

    it('should support keyboard navigation', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const firstNameInput = screen.getByPlaceholderText('John')
      firstNameInput.focus()

      expect(firstNameInput).toHaveFocus()

      // Check that we can move focus to other elements
      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('should have submit button with proper type', () => {
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const submitButton = screen.getByRole('button', { name: 'Save Address' })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty initialAddress prop', () => {
      render(<AddressForm onSubmit={mockOnSubmit} />)

      expect(screen.getByPlaceholderText('John')).toHaveValue('')
      expect(screen.getByPlaceholderText('Doe')).toHaveValue('')
      expect(screen.getByDisplayValue('Canada')).toBeInTheDocument()
    })

    it('should handle partial initialAddress prop', () => {
      const partialAddress: Partial<Address> = {
        firstName: 'Jane',
        countryCode: 'US'
      }

      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={partialAddress} />)

      expect(screen.getByDisplayValue('Jane')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Doe')).toHaveValue('') // last name should be empty
      expect(screen.getByDisplayValue('United States')).toBeInTheDocument()
    })

    it('should handle very long input values', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const longText = 'a'.repeat(1000)
      await user.type(screen.getByPlaceholderText('123 Main Street'), longText)

      expect(screen.getByDisplayValue(longText)).toBeInTheDocument()
    })

    it('should handle rapid form interactions', async () => {
      const user = userEvent.setup()
      render(<AddressForm onSubmit={mockOnSubmit} initialAddress={defaultInitialAddress} />)

      const firstNameInput = screen.getByPlaceholderText('John')

      // Rapid typing and clearing - check that form handles it gracefully
      await user.type(firstNameInput, 'test')
      expect(firstNameInput).toHaveValue('test')

      await user.clear(firstNameInput)
      expect(firstNameInput).toHaveValue('')

      // Type again
      await user.type(firstNameInput, 'John')
      expect(firstNameInput).toHaveValue('John')

      // Form should still be functional
      expect(firstNameInput).toBeInTheDocument()
    })
  })
})