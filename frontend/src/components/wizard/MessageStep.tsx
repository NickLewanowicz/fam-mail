import { useRef, useCallback, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

interface Props {
  message: string
  onMessageChange: (msg: string) => void
  onNext: () => void
  onBack: () => void
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

export function MessageStep({ message, onMessageChange, onNext, onBack }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const previewHtml = useMemo(() => {
    if (!message.trim()) return ''
    const raw = marked.parse(message, { async: false }) as string
    return DOMPurify.sanitize(raw)
  }, [message])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Write Your Message</h2>
        <p className="text-base-content/60 text-sm mt-1">This will appear on the back of the postcard. Use the toolbar for formatting.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-1.5 bg-base-200 rounded-t-lg border border-b-0 border-base-300">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="btn btn-ghost btn-xs font-mono tooltip tooltip-bottom"
            data-tip={action.label}
            onClick={() => applyFormat(action)}
          >
            {action.icon}
          </button>
        ))}
      </div>

      <div className="form-control -mt-4">
        <textarea
          ref={textareaRef}
          className="textarea textarea-bordered rounded-t-none h-32 text-base leading-relaxed font-mono"
          placeholder="Dear friend,&#10;&#10;Thinking of you..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          maxLength={MAX_LENGTH}
        />
        <label className="label">
          <span className={`label-text-alt ${message.length > 400 ? 'text-warning' : 'text-base-content/50'}`}>
            {message.length}/{MAX_LENGTH}
          </span>
          <span className="label-text-alt text-base-content/40">Markdown supported</span>
        </label>
      </div>

      {/* Live preview */}
      {previewHtml && (
        <div className="collapse collapse-open bg-base-200 rounded-lg">
          <div className="collapse-title text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 min-h-0">
            Preview
          </div>
          <div className="collapse-content">
            <div
              className="prose prose-sm max-w-none text-base-content"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext}>
          Next: Add Address
        </button>
      </div>
    </div>
  )
}
