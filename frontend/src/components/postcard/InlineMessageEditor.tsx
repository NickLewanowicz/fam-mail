import { useRef, useCallback, useEffect } from 'react'

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
}

const TOOLBAR_ACTIONS: MarkdownAction[] = [
  { label: 'Bold', icon: 'B', prefix: '**', suffix: '**' },
  { label: 'Italic', icon: 'I', prefix: '*', suffix: '*' },
  { label: 'Heading', icon: 'H', prefix: '## ', suffix: '', block: true },
  { label: 'List', icon: '•', prefix: '- ', suffix: '', block: true },
  { label: 'Numbered List', icon: '1.', prefix: '1. ', suffix: '', block: true },
  { label: 'Quote', icon: '"', prefix: '> ', suffix: '', block: true },
  { label: 'Horizontal Rule', icon: '—', prefix: '\n---\n', suffix: '' },
]

export function InlineMessageEditor({ message, onMessageChange, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const applyFormat = useCallback((action: MarkdownAction) => {
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

  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col rounded-lg overflow-hidden z-10">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 px-1 py-0.5 bg-gray-100 border-b border-gray-200 shrink-0">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="btn btn-ghost btn-xs font-mono !min-h-0 h-6 px-1"
            data-tip={action.label}
            onClick={() => applyFormat(action)}
          >
            {action.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          className="btn btn-ghost btn-xs !min-h-0 h-6 px-1 text-gray-500"
          onClick={onClose}
        >
          Done
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-2 text-xs leading-snug font-mono text-gray-800 bg-transparent border-0 outline-none resize-none"
        placeholder="Dear friend,&#10;&#10;Thinking of you..."
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        maxLength={MAX_LENGTH}
      />
      <div className="px-2 py-0.5 bg-gray-100 border-t border-gray-200 shrink-0 flex justify-between items-center">
        <span className={`text-[10px] ${message.length > 400 ? 'text-warning' : 'text-gray-400'}`}>
          {message.length}/{MAX_LENGTH}
        </span>
        <span className="text-[10px] text-gray-400">Markdown supported</span>
      </div>
    </div>
  )
}
