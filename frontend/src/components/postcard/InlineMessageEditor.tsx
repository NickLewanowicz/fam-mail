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

  const applyFormat = useCallback((action: Pick<MarkdownAction, 'prefix' | 'suffix' | 'block'>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = message.slice(start, end)

    let newText: string
    let cursorPos: number

    if (action.block) {
      const lineStart = message.lastIndexOf('\n', start - 1) + 1
      newText = message.slice(0, lineStart) + action.prefix + message.slice(lineStart)
      cursorPos = start + action.prefix.length
    } else if (selected) {
      newText = message.slice(0, start) + action.prefix + selected + action.suffix + message.slice(end)
      cursorPos = end + action.prefix.length + action.suffix.length
    } else {
      newText = message.slice(0, start) + action.prefix + action.suffix + message.slice(end)
      cursorPos = start + action.prefix.length
    }

    if (newText.length <= MAX_LENGTH) {
      onMessageChange(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(cursorPos, cursorPos)
      })
    }
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
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-zinc-100 shrink-0">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`w-6 h-6 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center ${action.iconClass ?? ''}`}
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
        <div className="relative">
          <button
            type="button"
            className="w-6 h-6 rounded-md text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center justify-center"
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
              className="absolute top-full left-0 mt-1 z-20 flex items-center gap-1 p-1.5 bg-white border border-zinc-200 rounded-lg shadow-md"
            >
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  role="menuitem"
                  aria-label={`${color.name} (${color.hex})`}
                  title={color.name}
                  className="w-4 h-4 rounded-full border border-zinc-300 hover:ring-2 hover:ring-zinc-300 transition-shadow"
                  style={{ backgroundColor: color.hex }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyTextColor(color.hex)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          className="px-2.5 py-1 rounded-lg font-medium bg-zinc-900 text-white text-[10px] hover:bg-zinc-800 transition-colors"
          onClick={onClose}
        >
          Done
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-3 text-[11px] leading-relaxed font-mono text-zinc-700 bg-transparent border-0 outline-none resize-none placeholder:text-zinc-400"
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
          <span className={`text-[10px] ${charRatio > 0.8 ? 'text-amber-600' : 'text-zinc-400'}`}>
            {message.length}/{MAX_LENGTH}
          </span>
        </div>
        <span className="text-[10px] text-zinc-400">Markdown</span>
      </div>
    </motion.div>
  )
}
