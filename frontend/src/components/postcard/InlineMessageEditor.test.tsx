import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InlineMessageEditor } from './InlineMessageEditor'
import { renderMessageHtml } from '../../utils/messageSanitizer'

describe('InlineMessageEditor', () => {
  const onMessageChange = vi.fn()
  const onClose = vi.fn()

  const renderEditor = (message = '') =>
    render(<InlineMessageEditor message={message} onMessageChange={onMessageChange} onClose={onClose} />)

  const setTextSelection = (start: number, end: number) => {
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(start, end)
  }

  beforeEach(() => {
    onMessageChange.mockClear()
    onClose.mockClear()
  })

  it('renders all toolbar buttons with accessible labels', () => {
    renderEditor()
    for (const label of ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Heading', 'List', 'Quote', 'Text color']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('has textarea with maxLength 500 and shows char count', () => {
    renderEditor('Hello')
    expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '500')
    expect(screen.getByText('5/500')).toBeInTheDocument()
  })

  it('wraps selected text with <u> on Underline click', () => {
    renderEditor('hello world')
    setTextSelection(0, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Underline' }))
    expect(onMessageChange).toHaveBeenCalledWith('<u>hello</u> world')
  })

  it('wraps selected text with ~~ on Strikethrough click', () => {
    renderEditor('hello world')
    setTextSelection(6, 11)
    fireEvent.click(screen.getByRole('button', { name: 'Strikethrough' }))
    expect(onMessageChange).toHaveBeenCalledWith('hello ~~world~~')
  })

  it('appends wrappers at the cursor when nothing is selected', () => {
    renderEditor('hello')
    setTextSelection(5, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Underline' }))
    expect(onMessageChange).toHaveBeenCalledWith('hello<u></u>')
  })

  it('keeps existing formatting actions working (Bold)', () => {
    renderEditor('hello world')
    setTextSelection(0, 5)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(onMessageChange).toHaveBeenCalledWith('**hello** world')
  })

  describe('text color popover', () => {
    it('opens the palette on click and closes when toggled again', () => {
      renderEditor()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
      expect(screen.getByRole('menu')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('shows the preset color swatches', () => {
      renderEditor()
      fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
      for (const name of ['Ink', 'Red', 'Orange', 'Green', 'Blue', 'Purple']) {
        expect(screen.getByRole('menuitem', { name: new RegExp(`^${name} \\(#`)})).toBeInTheDocument()
      }
    })

    it('wraps selected text in a colored span and closes the palette', () => {
      renderEditor('hello world')
      setTextSelection(6, 11)
      fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Red (#dc2626)' }))
      expect(onMessageChange).toHaveBeenCalledWith('hello <span style="color:#dc2626">world</span>')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('appends the colored span at the cursor when nothing is selected', () => {
      renderEditor('hello')
      setTextSelection(5, 5)
      fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
      fireEvent.click(screen.getByRole('menuitem', { name: 'Blue (#2563eb)' }))
      expect(onMessageChange).toHaveBeenCalledWith('hello<span style="color:#2563eb"></span>')
    })
  })

  describe('500-char limit', () => {
    it('rejects formatting that would exceed the limit', () => {
      renderEditor('a'.repeat(499))
      setTextSelection(0, 499)
      fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
      expect(onMessageChange).not.toHaveBeenCalled()
    })

    it('allows formatting that lands exactly on the limit', () => {
      renderEditor('a'.repeat(496))
      setTextSelection(0, 496)
      fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
      expect(onMessageChange).toHaveBeenCalledWith(`**${'a'.repeat(496)}**`)
    })
  })

  it('Done button calls onClose', () => {
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('typing updates the message via onMessageChange', () => {
    renderEditor()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } })
    expect(onMessageChange).toHaveBeenCalledWith('Hello')
  })
})

describe('formatting chain (regression: bold then color)', () => {
  const renderEditor = (initial = 'Happy birthday Grace and family!') => {
    const onChange = vi.fn()
    const utils = render(<InlineMessageEditor message={initial} onMessageChange={onChange} onClose={() => {}} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    return { onChange, textarea, ...utils }
  }

  it('re-selects the wrapped word so color wraps it too, not an empty span', async () => {
    const { onChange, textarea, rerender } = renderEditor('Happy birthday Grace and family!')
    // user selects "Grace" (chars 15..20)
    textarea.setSelectionRange(15, 20)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    // onMessageChange fired with **Grace** wrapped in; parent feeds value back
    const afterBold = '**Happy birthday **Grace** and family!**'.length // sanity only
    void afterBold
    const bolded = onChange.mock.calls[0][0] as string
    expect(bolded).toBe('Happy birthday **Grace** and family!')
    rerender(<InlineMessageEditor message={bolded} onMessageChange={onChange} onClose={() => {}} />)
    // selection is restored over the inner word by the component (raf); emulate it
    // exactly: '**' inserted at 15 puts the inner word at 17..22
    textarea.setSelectionRange(17, 22)
    fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Blue/ }))
    const colored = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string
    // the span must wrap the whole emphasized run, asterisks inside the span
    expect(colored).toBe('Happy birthday <span style="color:#2563eb">**Grace**</span> and family!')
    // and marked must render both strong and span from it
    const html = renderMessageHtml(colored)
    expect(html).toContain('<strong>')
    expect(html).toContain('color:#2563eb')
  })

  it('color with no selection inserts a pair around the cursor, not inside text', () => {
    const { onChange, textarea } = renderEditor('Hello world')
    fireEvent.click(screen.getByRole('button', { name: 'Text color' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /Red/ }))
    const value = onChange.mock.calls[0][0] as string
    expect(value).toContain('<span style="color:#dc2626"></span>')
    void textarea
  })
})

describe('occasion templates', () => {
  it('inserts the template text at the cursor position', async () => {
    const onChange = vi.fn()
    render(<InlineMessageEditor message="Dear you, " onMessageChange={onChange} onClose={() => {}} />)
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.setSelectionRange(10, 10)
    fireEvent.change(screen.getByLabelText('Insert occasion template'), { target: { value: 'Birthday' } })
    const value = onChange.mock.calls[0][0] as string
    expect(value).toBe('Dear you, Happy birthday! Wishing you a wonderful year ahead.\n\n')
  })
})
