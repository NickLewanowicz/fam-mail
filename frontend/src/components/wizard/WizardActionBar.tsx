import { motion } from 'framer-motion'
import type { PostgridApiMode } from '../../utils/postgridApi'
import { T } from '../../utils/motion'

interface WizardActionBarProps {
  /** Current wizard step (1–4) — the truth row renders on all of them; the
   *  truth sentence itself only on step 4 (Review). */
  step: number
  /** ISSUE-0117: PostGrid mode, lifted to CreatePage (single fetch) */
  mode?: PostgridApiMode | null
  /** The send-truth sentence (truthCopy) — rendered on step 4 only */
  truth?: string
  onBack: () => void
  primaryLabel: string
  onPrimary: () => void
  primaryDisabled?: boolean
  /** True while the step-4 send is in flight — primary shows a spinner */
  sending?: boolean
}

/** Chip palette (editor theme, AA on ink-surface) + sr-only expansions */
const CHIP_CLS: Record<string, string> = {
  test: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  live: 'bg-red-500/15 text-red-300 border-red-500/30',
  mock: 'bg-white/10 text-warm-text2 border-white/20',
}

const SR_ONLY: Record<string, string> = {
  test: ' (test mode — nothing will be mailed)',
  live: ' (live mode — mails a real card)',
  mock: ' (mock mode — nothing will be mailed)',
}

/**
 * Mobile (md:hidden) sticky action bar — June's spec slice 8 (M5) + the
 * ISSUE-0117 truth row: a 28px truth strip (mode chip on steps 1–3, truth
 * sentence + chip on step 4) above the untouched 64px Back/primary row.
 * Rendered by CreatePage outside AnimatePresence (fixed elements must not
 * sit inside a transformed parent) and only on steps 1–4; step 0's
 * tap-a-country is its own action. The editor variant renders no M4 tab
 * bar, so this bar owns the bottom edge on /create and /drafts/:id.
 */
export function WizardActionBar({ step, mode, truth, onBack, primaryLabel, onPrimary, primaryDisabled, sending }: WizardActionBarProps) {
  const chipKey = mode ?? 'mock'
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink-surface/90 backdrop-blur border-t border-ink-line/60">
      {/* truth row — h-7, 320px-safe: full-width row, nothing competes for
          width. Fades in opacity-only; no height animation (permanent row). */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={T.standard}
        className="flex items-center gap-2 px-4 h-7 border-b border-ink-line/40"
      >
        <span
          role="status"
          className={`shrink-0 inline-flex items-center h-5 px-1.5 rounded border text-[10px] font-semibold tracking-wide ${CHIP_CLS[chipKey]}`}
        >
          {mode?.toUpperCase() ?? '—'}
          <span className="sr-only">{' mode' + SR_ONLY[chipKey]}</span>
        </span>
        {step === 4 && (
          <p id="send-truth-bar" className="min-w-0 text-xs leading-tight truncate-none text-amber-300">
            {truth}
          </p>
        )}
      </motion.div>
      {/* existing action row — geometry, press, testids preserved */}
      <div className="px-4 h-16 flex items-center justify-between pb-[env(safe-area-inset-bottom,0px)]">
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
          aria-describedby="send-truth-bar"
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
    </div>
  )
}
