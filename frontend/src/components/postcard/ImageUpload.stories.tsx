import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ImageUpload } from './ImageUpload'

const meta = {
  title: 'Components/Postcard/ImageUpload',
  component: ImageUpload,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onImageSelect: { action: 'image selected' },
    onToggle: { action: 'toggle' },
  },
} satisfies Meta<typeof ImageUpload>

export default meta
type Story = StoryObj<typeof meta>

const mockImage = {
  file: new File(['test'], 'test-image.jpg', { type: 'image/jpeg' }),
  preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==',
}

export const Default: Story = {
  args: {
    onImageSelect: (file, preview) => console.log('Selected:', file, preview),
    selectedImage: null,
  },
}

export const Open: Story = {
  args: {
    onImageSelect: (file, preview) => console.log('Selected:', file, preview),
    selectedImage: null,
    isOpen: true,
  },
}

export const WithImage: Story = {
  args: {
    onImageSelect: (file, preview) => console.log('Selected:', file, preview),
    selectedImage: mockImage,
    isOpen: true,
  },
}

export const Interactive: Story = {
  render: (args) => {
    const [selectedImage, setSelectedImage] = React.useState(args.selectedImage)
    const [isOpen, setIsOpen] = React.useState(args.isOpen || false)

    return (
      <div style={{ width: '600px' }}>
        <div className="mb-4 space-x-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isOpen ? 'Close' : 'Open'} Upload
          </button>
          {selectedImage && (
            <button
              onClick={() => setSelectedImage(null)}
              className="px-4 py-2 bg-red-500 text-white rounded"
            >
              Clear Image
            </button>
          )}
        </div>
        <ImageUpload
          {...args}
          selectedImage={selectedImage}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onImageSelect={(file, preview) => {
            args.onImageSelect(file, preview)
            if (file.size > 0) {
              setSelectedImage({ file, preview })
            } else {
              setSelectedImage(null)
            }
          }}
        />
      </div>
    )
  },
}

export const WithError: Story = {
  render: (args) => {
    const [error, setError] = React.useState(false)

    return (
      <div style={{ width: '600px' }}>
        <button
          onClick={() => setError(!error)}
          className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
        >
          Toggle Error State
        </button>
        <ImageUpload
          {...args}
          onImageSelect={(file, preview) => {
            if (error && file.type === 'application/pdf') {
              // Simulate error
              console.error('Invalid file type')
            } else {
              args.onImageSelect(file, preview)
            }
          }}
        />
      </div>
    )
  },
}

export const DragAndDrop: Story = {
  args: {
    onImageSelect: (file, preview) => console.log('Selected:', file, preview),
    selectedImage: null,
    isOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Test the drag and drop functionality by dragging an image file onto the upload area.',
      },
    },
  },
}

export const MobileView: Story = {
  args: {
    onImageSelect: (file, preview) => console.log('Selected:', file, preview),
    selectedImage: null,
    isOpen: true,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
}