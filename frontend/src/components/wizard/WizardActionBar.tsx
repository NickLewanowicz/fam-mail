interface WizardActionBarProps {
  onBack: () => void
  primaryLabel: string
  onPrimary: () => void
  primaryDisabled?: boolean
  /** True while the step-4 send is in flight — primary shows a spinner */
  sending?: boolean
}

/**
 * Mobile (md:hidden) sticky action bar — June's spec slice 8 (M5). Back
 * ghost on the left, clay primary on the right, safe-area padded. Rendered
 * by CreatePage outside AnimatePresence (fixed elements must not sit inside
 * a transformed parent) and only on steps 1–4; step 0's tap-a-country is
 * its own action. The editor variant renders no M4 tab bar, so this bar
 * owns the bottom edge on /create and /drafts/:id.
 */
export function WizardActionBar({ onBack, primaryLabel, onPrimary, primaryDisabled, sending }: WizardActionBarProps) {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-surface/90 backdrop-blur border-t border-ink-line/60 px-4 h-16 flex items-center justify-between pb-[env(safe-area-inset-bottom,0px)]">
      <button
        type="button"
        data-testid="wizard-back"
        className="press px-4 h-11 text-sm text-warm-text2 hover:text-warm-text rounded-full hover:bg-white/5"
        onClick={onBack}
      >
        ← Back
      </button>
      <button
        type="button"
        data-testid="wizard-primary"
        className="press active:scale-[0.97] px-6 h-11 text-sm font-medium bg-clay text-ink-bg rounded-full hover:bg-clay-hover disabled:opacity-50 flex items-center justify-center gap-2"
        onClick={onPrimary}
        disabled={primaryDisabled}
      >
        {sending ? (
          <>
            <div className="w-4 h-4 border-2 border-ink-line border-t-ink-bg rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          primaryLabel
        )}
      </button>
    </div>
  )
}
