import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { PostcardBuilder } from './PostcardBuilder'
import type { Address } from '../../types/address'

const meta = {
  title: 'Components/Postcard/PostcardBuilder',
  component: PostcardBuilder,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onAddressChange: { action: 'address changed' },
    onImageChange: { action: 'image changed' },
    onMessageChange: { action: 'message changed' },
  },
} satisfies Meta<typeof PostcardBuilder>

export default meta
type Story = StoryObj<typeof meta>

const mockAddress: Address = {
  firstName: 'John',
  lastName: 'Doe',
  addressLine1: '123 Main St',
  addressLine2: 'Apt 4B',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'USA',
}

const mockImage = {
  file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
  preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==',
}

export const Empty: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: null,
    recipientAddress: null,
    message: '',
  },
}

export const PartialAddress: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: null,
    recipientAddress: {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    message: '',
  },
}

export const CompleteAddress: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: null,
    recipientAddress: mockAddress,
    message: '',
  },
}

export const WithMessage: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: null,
    recipientAddress: mockAddress,
    message: 'Hello from **New York**!\n\nHaving an amazing time here. The weather is beautiful and the city is incredible.\n\nWish you were here! 🏙️',
  },
}

export const WithImage: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: mockImage,
    recipientAddress: mockAddress,
    message: '',
  },
}

export const Complete: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: mockImage,
    recipientAddress: mockAddress,
    message: 'Hello from **New York**!\n\nHaving an amazing time here. The weather is beautiful and the city is incredible.\n\nWish you were here! 🏙️',
  },
}

export const ComplexMessage: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: mockImage,
    recipientAddress: mockAddress,
    message: `# Greetings from the Big Apple!

## What I've Seen
- **Times Square**: Bright lights and billboards
- Central Park: Beautiful autumn colors
- Statue of Liberty: Iconic and inspiring

### Favorite Moments
1. Watching the sunset from Brooklyn Bridge
2. Eating pizza at Joe's Famous Pizza
3. Walking through the High Line park

> "New York is the greatest city in the world" - Every New Yorker

Can't wait to tell you all about it when I get back! 🗽`,
  },
}

export const SafeZonesOff: Story = {
  args: {
    onAddressChange: () => {},
    onImageChange: () => {},
    onMessageChange: () => {},
    selectedImage: mockImage,
    recipientAddress: mockAddress,
    message: 'Sample message with **markdown** support',
  },
  render: (args) => {
    const [showSafeZones, setShowSafeZones] = React.useState(false)

    return (
      <div>
        <button
          onClick={() => setShowSafeZones(!showSafeZones)}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Safe Zones: {showSafeZones ? 'ON' : 'OFF'}
        </button>
        <PostcardBuilder {...args} />
      </div>
    )
  },
}