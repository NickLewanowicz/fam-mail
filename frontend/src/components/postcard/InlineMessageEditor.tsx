import { useRef, useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  message: string
  onMessageChange: (msg: string) => void
  onClose: () => void
}

const MAX_LENGTH = 500

type MarkdownAction = {
  label: string
  icon: string
  prefix: string
  suffix: string
  block?: boolean
  iconClass?: string
}

const TOOLBAR_ACTIONS: MarkdownAction[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '*', suffix: '*' },
  { label: 'Underline', icon: 'U', prefix: '<u>', suffix: '</u>', iconClass: 'underline' },
  { label: 'Strikethrough', icon: 'S', prefix: '~~', suffix: '~~', iconClass: 'line-through' },
  { label: 'Heading', icon: 'H', prefix: '## ', suffix: '', block: true },
  { label: 'List', icon: '•', prefix: '- ', suffix: '', block: true },
  { label: 'Quote', icon: '"', prefix: '> ', suffix: '', block: true },
]

/** Occasion presets — a starting point, never sent as-is without the user editing. */
const TEMPLATES: { label: string; text: string }[] = [
  { label: 'Birthday', text: 'Happy birthday! Wishing you a wonderful year ahead.\n\n' },
  { label: 'Thank you', text: 'Thank you so much for everything — it meant a lot to me.\n\n' },
  { label: 'Congratulations', text: 'Congratulations! So proud of you and everything you have achieved.\n\n' },
  { label: 'Thinking of you', text: 'Just a little note to say I am thinking of you.\n\n' },
]

/** Preset text colors — part of the inline formatting subset supported end-to-end. */
const TEXT_COLORS = [
  { hex: '#0f172a', name: 'Ink' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#16a34a', name: 'Green' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#7c3aed', name: 'Purple' },
]

export function InlineMessageEditor({ message, onMessageChange, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [colorOpen, setColorOpen] = useState(false)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Escape closes the editor (and the color popover first, if open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (colorOpen) {
        setColorOpen(false)
      } else {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [colorOpen, onClose])

  const applyFormat = useCallback((action: Pick<MarkdownAction, 'prefix' | 'suffix' | 'block'>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    let start = textarea.selectionStart
    let end = textarea.selectionEnd
    let selected = message.slice(start, end)

    if (action.block) {
      const lineStart = message.lastIndexOf('\n', start - 1) + 1
      const blockText = message.slice(0, lineStart) + action.prefix + message.slice(lineStart)
      const blockCursor = start + action.prefix.length
      if (blockText.length <= MAX_LENGTH) {
        onMessageChange(blockText)
        requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(blockCursor, blockCursor)
        })
      }
      return
    }

    // Coloring a word that is already wrapped in markdown emphasis must
    // color the whole emphasized run — otherwise the span lands inside the
    // delimiters (`**<span>word</span>**`), where marked no longer parses
    // the emphasis and literal asterisks print on the card.
    const isColorAction = action.prefix.startsWith('<span')
    if (isColorAction && selected) {
      const hug = (open: string, close: string) => {
        if (message.slice(start - open.length, start) === open && message.slice(end, end + close.length) === close) {
          start -= open.length
          end += close.length
          selected = message.slice(start, end)
          return true
        }
        return false
      }
      while (hug('**', '**') || hug('~~', '~~') || hug('*', '*') || hug('_', '_')) {
        // keep expanding while emphasis delimiters hug the selection
      }
    }

    const newText = message.slice(0, start) + action.prefix + selected + action.suffix + message.slice(end)
    if (newText.length > MAX_LENGTH) return
    onMessageChange(newText)
    const wrapStart = start + action.prefix.length
    const wrapEnd = wrapStart + selected.length
    requestAnimationFrame(() => {
      textarea.focus()
      // Re-select the wrapped content so a follow-up action (Bold then
      // Color) restyles the same words instead of inserting an empty pair.
      textarea.setSelectionRange(wrapStart, wrapEnd)
    })
  }, [message, onMessageChange])

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const pos = textarea.selectionStart ?? message.length
    const next = message.slice(0, pos) + text + message.slice(pos)
    if (next.length > MAX_LENGTH) return
    onMessageChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = pos + text.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }, [message, onMessageChange])

  const applyTextColor = useCallback((hex: string) => {
    applyFormat({ prefix: `<span style="color:${hex}">`, suffix: '</span>' })
    setColorOpen(false)
  }, [applyFormat])

  const charRatio = message.length / MAX_LENGTH

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-white flex flex-col rounded-xl overflow-hidden z-10"
    >
      <div className="relative flex items-center gap-1 px-2 py-1.5 border-b border-zinc-100 shrink-0">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`press w-9 h-9 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center ${action.iconClass ?? ''}`}
            title={action.label}
            aria-label={action.label}
            // Keep focus (and any text selection) in the textarea — clicking a
            // toolbar button must not clear what the user highlighted.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat(action)}
          >
            {action.icon}
          </button>
        ))}
        <div>
          <button
            type="button"
            className="press w-9 h-9 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 flex items-center justify-center"
            title="Text color"
            aria-label="Text color"
            aria-haspopup="true"
            aria-expanded={colorOpen}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColorOpen(open => !open)}
          >
            <span className="border-b-2 border-red-500 leading-none">A</span>
          </button>
          {colorOpen && (
            <div
              role="menu"
              aria-label="Text color palette"
              className="absolute top-full left-2 mt-1 z-30 flex items-center gap-1.5 px-2 py-1.5 bg-white border border-zinc-200 rounded-lg shadow-lg"
            >
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  role="menuitem"
                  aria-label={`${color.name} (${color.hex})`}
                  title={color.name}
                  className="press w-6 h-6 rounded-full border border-zinc-200 hover:ring-2 hover:ring-offset-1 hover:ring-zinc-300"
                  style={{ backgroundColor: color.hex }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyTextColor(color.hex)}
                />
              ))}
            </div>
          )}
        </div>
        <select
          className="ml-1 h-8 rounded-md border border-zinc-200 bg-white px-1.5 text-xs text-zinc-600 outline-none hover:border-zinc-300 focus:border-zinc-400"
          title="Insert an occasion template at the cursor"
          aria-label="Insert occasion template"
          value=""
          onChange={(e) => {
            const template = TEMPLATES.find((t) => t.label === e.target.value)
            if (!template) return
            insertAtCursor(template.text)
            e.target.value = ''
          }}
        >
          <option value="" disabled>Templates…</option>
          {TEMPLATES.map((t) => (
            <option key={t.label} value={t.label}>{t.label}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          type="button"
          className="press px-3 py-1.5 rounded-lg font-medium bg-zinc-900 text-white text-xs hover:bg-zinc-800"
          onClick={onClose}
        >
          Done
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-3 text-[13px] leading-relaxed font-serif text-stone-800 bg-transparent border-0 outline-none resize-none placeholder:text-zinc-400"
        placeholder="Dear friend,&#10;&#10;Thinking of you..."
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        maxLength={MAX_LENGTH}
      />
      <div className="px-3 py-1.5 border-t border-zinc-100 shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charRatio > 0.9 ? 'bg-red-500' : charRatio > 0.7 ? 'bg-amber-500' : 'bg-zinc-400'
              }`}
              style={{ width: `${charRatio * 100}%` }}
            />
          </div>
          <span className={`text-[11px] ${charRatio > 0.9 ? 'text-red-700' : charRatio > 0.8 ? 'text-amber-700' : 'text-zinc-500'}`} aria-live="off">
            {message.length}/{MAX_LENGTH} · {message.trim() ? message.trim().split(/\s+/).length : 0} words
          </span>
        </div>
        <span className="text-[10px] text-zinc-400">Markdown</span>
      </div>
    </motion.div>
  )
}
