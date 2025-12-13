import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { AddressForm } from './AddressForm'
import type { Address } from '../../types/address'

const meta = {
  title: 'Components/Address/AddressForm',
  component: AddressForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: { action: 'submitted' },
  },
} satisfies Meta<typeof AddressForm>

export default meta
type Story = StoryObj<typeof meta>

const mockAddress: Partial<Address> = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main Street',
  addressLine2: 'Apt 4B',
  city: 'New York',
  provinceOrState: 'NY',
  postalOrZip: '10001',
  countryCode: 'US',
}

export const Empty: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
  },
}

export const WithInitialAddress: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: mockAddress,
  },
}

export const PartialAddress: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: {
      firstName: 'Jane',
      lastName: '',
      addressLine1: '456 Oak Avenue',
      city: '',
      provinceOrState: '',
      postalOrZip: '',
      countryCode: 'CA',
    },
  },
}

export const CanadianAddress: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: {
      firstName: 'Sarah',
      lastName: 'Smith',
      addressLine1: '789 Maple Road',
      addressLine2: 'Unit 12',
      city: 'Toronto',
      provinceOrState: 'ON',
      postalOrZip: 'M5V 2T6',
      countryCode: 'CA',
    },
  },
}

export const UKAddress: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: {
      firstName: 'James',
      lastName: 'Brown',
      addressLine1: '221B Baker Street',
      city: 'London',
      provinceOrState: 'England',
      postalOrZip: 'NW1 6XE',
      countryCode: 'GB',
    },
  },
}

export const Interactive: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: {
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test Street',
      city: 'Test City',
      provinceOrState: 'TS',
      postalOrZip: 'T1T 1T1',
      countryCode: 'CA',
    },
  },
  play: async ({ canvasElement }) => {
    // This story is for manual testing of form interactions
    // Users can test validation, form filling, and submission
  },
}

export const ValidationErrors: Story = {
  args: {
    onSubmit: (address) => console.log('Submitted:', address),
    initialAddress: {
      firstName: '',
      lastName: '',
      addressLine1: '',
      city: '',
      provinceOrState: '',
      postalOrZip: '',
      countryCode: 'CA',
    },
  },
  render: (args) => {
    const [showErrors, setShowErrors] = React.useState(false)

    const handleSubmit = (address: Address) => {
      // Simulate validation error
      setShowErrors(true)
    }

    return (
      <div style={{ width: '600px' }}>
        <button
          onClick={() => setShowErrors(!showErrors)}
          className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
        >
          Toggle Validation Errors
        </button>
        <AddressForm
          {...args}
          onSubmit={handleSubmit}
          initialAddress={showErrors ? {} : undefined}
        />
      </div>
    )
  },
}