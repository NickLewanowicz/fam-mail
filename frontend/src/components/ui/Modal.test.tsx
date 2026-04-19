import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'

describe('Modal (Legacy)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render nothing when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
    })

    it('should render children when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('should render into a portal (appended to body)', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Portal content</div>
        </Modal>
      )

      // Modal portal renders at document.body level
      const modal = document.querySelector('.fixed.inset-0.z-50')
      expect(modal).toBeInTheDocument()
      expect(screen.getByText('Portal content')).toBeInTheDocument()
    })

    it('should render backdrop overlay', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      const backdrop = document.querySelector('.bg-black.bg-opacity-50')
      expect(backdrop).toBeInTheDocument()
    })

    it('should render modal content container', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      const contentContainer = document.querySelector('.bg-white.shadow-xl.rounded-lg')
      expect(contentContainer).toBeInTheDocument()
    })
  })

  describe('Size Variants', () => {
    it('should apply max-w-md size class for sm', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          <div>Small modal</div>
        </Modal>
      )

      const modal = document.querySelector('.max-w-md')
      expect(modal).toBeInTheDocument()
    })

    it('should apply max-w-lg size class for md (default)', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="md">
          <div>Medium modal</div>
        </Modal>
      )

      const modal = document.querySelector('.max-w-lg')
      expect(modal).toBeInTheDocument()
    })

    it('should apply max-w-2xl size class for lg', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <div>Large modal</div>
        </Modal>
      )

      const modal = document.querySelector('.max-w-2xl')
      expect(modal).toBeInTheDocument()
    })

    it('should apply max-w-4xl size class for xl', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          <div>XL modal</div>
        </Modal>
      )

      const modal = document.querySelector('.max-w-4xl')
      expect(modal).toBeInTheDocument()
    })

    it('should default to md size when size not provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Default size</div>
        </Modal>
      )

      const modal = document.querySelector('.max-w-lg')
      expect(modal).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      )

      const backdrop = document.querySelector('.bg-black.bg-opacity-50') as HTMLElement
      fireEvent.click(backdrop)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when modal content is clicked', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      )

      const content = document.querySelector('.bg-white.shadow-xl.rounded-lg') as HTMLElement
      fireEvent.click(content)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose on Escape when modal is closed', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={false} onClose={onClose}>
          <div>Content</div>
        </Modal>
      )

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Lock', () => {
    it('should set body overflow to hidden when modal opens', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body overflow when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('')
    })

    it('should restore body overflow on unmount', () => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Cleanup', () => {
    it('should remove keydown listener on unmount', () => {
      const onClose = vi.fn()
      const { unmount } = render(
        <Modal isOpen={true} onClose={onClose}>
          <div>Content</div>
        </Modal>
      )

      unmount()

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(onClose).not.toHaveBeenCalled()
    })
  })
})

describe('ModalHeader', () => {
  it('should render the title', () => {
    render(<ModalHeader title="Test Title" />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should render title as h2 with correct styling', () => {
    render(<ModalHeader title="Test Title" />)

    const heading = screen.getByText('Test Title')
    expect(heading.tagName).toBe('H2')
    expect(heading.className).toContain('text-lg')
    expect(heading.className).toContain('font-semibold')
  })

  it('should not render close button when onClose is not provided', () => {
    render(<ModalHeader title="Test Title" />)

    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
  })

  it('should render close button when onClose is provided', () => {
    render(<ModalHeader title="Test Title" onClose={vi.fn()} />)

    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ModalHeader title="Test Title" onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should render extra children', () => {
    render(
      <ModalHeader title="Test Title">
        <span data-testid="extra-child">Extra</span>
      </ModalHeader>
    )

    expect(screen.getByTestId('extra-child')).toBeInTheDocument()
  })

  it('should render children before close button', () => {
    render(
      <ModalHeader title="Test Title" onClose={vi.fn()}>
        <span data-testid="extra-child">Extra</span>
      </ModalHeader>
    )

    const extraChild = screen.getByTestId('extra-child')
    const closeBtn = screen.getByLabelText('Close')
    // Both should be in the same flex container
    const container = extraChild.closest('.flex')
    expect(container).toContainElement(closeBtn)
  })
})

describe('ModalBody', () => {
  it('should render children', () => {
    render(<ModalBody>Body content</ModalBody>)

    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('should apply default padding classes', () => {
    render(<ModalBody>Content</ModalBody>)

    const body = screen.getByText('Content').closest('div')
    expect(body?.className).toContain('px-6')
    expect(body?.className).toContain('py-4')
  })

  it('should apply custom className', () => {
    render(<ModalBody className="custom-class">Content</ModalBody>)

    const body = screen.getByText('Content').closest('div')
    expect(body?.className).toContain('custom-class')
  })
})

describe('ModalFooter', () => {
  it('should render children', () => {
    render(<ModalFooter>Footer content</ModalFooter>)

    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should apply flex layout with justify-end', () => {
    render(<ModalFooter>Content</ModalFooter>)

    const footer = screen.getByText('Content').closest('div')
    expect(footer?.className).toContain('flex')
    expect(footer?.className).toContain('justify-end')
  })

  it('should apply border-t styling', () => {
    render(<ModalFooter>Content</ModalFooter>)

    const footer = screen.getByText('Content').closest('div')
    expect(footer?.className).toContain('border-t')
  })

  it('should apply custom className', () => {
    render(<ModalFooter className="custom-class">Content</ModalFooter>)

    const footer = screen.getByText('Content').closest('div')
    expect(footer?.className).toContain('custom-class')
  })
})
