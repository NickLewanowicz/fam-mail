/**
 * Motion tokens (June's spec, docs/design/motion-and-polish-spec.md slice 1).
 * Everything animates transform/opacity only. Durations: micro 120ms,
 * standard 200ms, large 300ms, flip 400ms; exits are faster than enters.
 *
 * Used by framer-motion call sites via spread: `transition={T.standard}`.
 * CSS-side equivalents live in tailwind.config.js (duration-micro,
 * ease-enter, animate-overlay-in, ...) for non-framer surfaces.
 */

export const EASE = {
  enter: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
  standard: [0.4, 0, 0.2, 1],
} as const

export const T = {
  /** press scale, tab pill, hover color */
  micro: { duration: 0.12, ease: EASE.enter },
  /** route enter, step slide, stagger items */
  standard: { duration: 0.2, ease: EASE.enter },
  /** sheet, dialog, hero */
  large: { duration: 0.3, ease: EASE.enter },
  /** all exits — faster than enter */
  exit: { duration: 0.12, ease: EASE.exit },
  /** PostcardPreview rotateY */
  flip: { duration: 0.4, ease: EASE.standard },
  /** sheet framer path, ~300ms settle */
  spring: { type: 'spring', stiffness: 380, damping: 40 },
} as const

/** Parent variant for staggered reveals (dashboard entry, D5). */
export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.05 } },
}

/** Child variant paired with staggerParent: fade + 12px rise. */
export const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: T.standard },
}
