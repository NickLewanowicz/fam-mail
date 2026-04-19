import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageStep } from './MessageStep'

describe('MessageStep', () => {
  const onMessageChange = vi.fn()
  const onNext = vi.fn()
  const onBack = vi.fn()

  beforeEach(() => {
    onMessageChange.mockClear()
    onNext.mockClear()
    onBack.mockClear()
  })

  it('renders title "Write Your Message"', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByRole('heading', { name: /Write Your Message/i })).toBeInTheDocument()
  })

  it('shows textarea with current message value', () => {
    render(
      <MessageStep message="Hi there" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByRole('textbox')).toHaveValue('Hi there')
  })

  it('textarea has maxLength of 500', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500')
  })

  it('shows character count 0/500 initially', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('shows character count matching message length', () => {
    render(
      <MessageStep message="Hello" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByText('5/500')).toBeInTheDocument()
  })

  it('typing updates the message via onMessageChange', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } })
    expect(onMessageChange).toHaveBeenCalledWith('Hello')
  })

  it('shows Back and Next: Add Address buttons', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByRole('button', { name: /^Back$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Next: Add Address/i })).toBeInTheDocument()
  })

  it('clicking Back calls onBack', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^Back$/ }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('clicking Next calls onNext', () => {
    render(
      <MessageStep message="x" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Next: Add Address/i }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows markdown hint text', () => {
    render(
      <MessageStep message="" onMessageChange={onMessageChange} onNext={onNext} onBack={onBack} />,
    )
    expect(screen.getByText(/Supports \*\*bold\*\*, \*italic\*, and line breaks/i)).toBeInTheDocument()
  })
})
