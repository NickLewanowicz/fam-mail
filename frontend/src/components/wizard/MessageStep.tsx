interface Props {
  message: string
  onMessageChange: (msg: string) => void
  onNext: () => void
  onBack: () => void
}

const MAX_LENGTH = 500

export function MessageStep({ message, onMessageChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Write Your Message</h2>
        <p className="text-base-content/60 text-sm mt-1">This will appear on the back of the postcard. Markdown formatting is supported.</p>
      </div>

      <div className="form-control">
        <textarea
          className="textarea textarea-bordered h-40 text-base leading-relaxed"
          placeholder="Dear friend,&#10;&#10;Thinking of you..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          maxLength={MAX_LENGTH}
        />
        <label className="label">
          <span className="label-text-alt text-base-content/50">{message.length}/{MAX_LENGTH}</span>
          <span className="label-text-alt text-base-content/40">Supports **bold**, *italic*, and line breaks</span>
        </label>
      </div>

      <div className="flex justify-between pt-2">
        <button className="btn btn-ghost" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext}>
          Next: Add Address
        </button>
      </div>
    </div>
  )
}
