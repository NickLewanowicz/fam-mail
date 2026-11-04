/**
 * D1 (decision board 2026-11-04): photos below the 300-DPI print minimum are
 * WARNED about ("may print soft"), never rejected — the publish path accepts
 * them and this is advisory UI only.
 *
 * Required pixels are the card's print size (trim + printer bleed) scaled by
 * PRINT_DPI, per the postcard-validation skill (6×4 → 1875×1275). Keep the
 * inches here as the single source; never hardcode pixel literals.
 *
 * Orientation rule: a photo rotated 90° relative to the card still prints
 * correctly (the printer rotates it), so `ok` accepts either orientation —
 * the image must meet the required w×h as-is OR with required w/h swapped.
 * `required` always reports the card's own (landscape) print shape so the
 * warning copy can name one stable target.
 */

export type PrintCardSize = '6x4' | '9x6' | '11x6'

export const PRINT_DPI = 300

/** Print dimensions in inches (trim size + bleed), per the validation skill. */
const PRINT_INCHES: Record<PrintCardSize, { width: number; height: number }> = {
  '6x4': { width: 6.25, height: 4.25 },
  '9x6': { width: 9.4, height: 6.25 },
  '11x6': { width: 11.25, height: 6.25 },
}

export interface DimensionAdvice {
  ok: boolean
  required: { width: number; height: number }
}

export function dimensionAdvice(
  size: PrintCardSize,
  px: { width: number; height: number }
): DimensionAdvice {
  const inches = PRINT_INCHES[size]
  const required = {
    width: Math.round(inches.width * PRINT_DPI),
    height: Math.round(inches.height * PRINT_DPI),
  }
  const fitsAsIs = px.width >= required.width && px.height >= required.height
  // Orientation tolerance: portrait photo on a landscape card (or vice versa)
  const fitsRotated = px.width >= required.height && px.height >= required.width
  return { ok: fitsAsIs || fitsRotated, required }
}

/**
 * Decode an image's pixel dimensions from its data URL / object URL.
 * Resolves only after the browser has decoded enough to measure (the wizard
 * already holds the bytes as a data URL, so this is local work — no fetch).
 */
export function measureImage(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Image could not be decoded'))
    img.src = src
  })
}
