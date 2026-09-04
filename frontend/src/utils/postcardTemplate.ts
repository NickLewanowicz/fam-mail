export type CountryCode = 'US' | 'CA' | 'GB'

export interface PostcardDimensions {
  width: number
  height: number
  /** Trim bleed — artwork must extend this far beyond trim edge */
  bleedMargin: number
  /** Content safe margin — keep text/logos inside this from trim edge */
  safeMargin: number
}

/**
 * 6×4" postcard at 300 DPI.
 * Document size is 6.25×4.25" (with 0.125" bleed on each side).
 * Trim size is 6×4" = 1800×1200 px.
 */
export const POSTCARD_6X4_DIMENSIONS: PostcardDimensions = {
  width: 1800,   // 6" trim
  height: 1200,  // 4" trim
  bleedMargin: 37.5,  // 0.125" bleed beyond trim at 300 DPI
  safeMargin: 37.5,   // 0.125" safe inset from trim at 300 DPI
}

/** Supported print sizes (width × height in inches). */
export type PostcardSize = '6x4' | '9x6' | '11x6'

/**
 * 9×6" postcard at 300 DPI.
 * Trim size is 9×6" = 2700×1800 px.
 */
export const POSTCARD_9X6_DIMENSIONS: PostcardDimensions = {
  width: 2700,   // 9" trim
  height: 1800,  // 6" trim
  bleedMargin: 37.5,
  safeMargin: 37.5,
}

/**
 * 11×6" postcard at 300 DPI.
 * Trim size is 11×6" = 3300×1800 px.
 */
export const POSTCARD_11X6_DIMENSIONS: PostcardDimensions = {
  width: 3300,   // 11" trim
  height: 1800,  // 6" trim
  bleedMargin: 37.5,
  safeMargin: 37.5,
}

const POSTCARD_SIZE_DIMENSIONS: Record<PostcardSize, PostcardDimensions> = {
  '6x4': POSTCARD_6X4_DIMENSIONS,
  '9x6': POSTCARD_9X6_DIMENSIONS,
  '11x6': POSTCARD_11X6_DIMENSIONS,
}

/** Real trim dimensions for a postcard size (px at 300 DPI). */
export function getPostcardDimensions(size: PostcardSize): PostcardDimensions {
  return POSTCARD_SIZE_DIMENSIONS[size] ?? POSTCARD_6X4_DIMENSIONS
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface SafeZones {
  /** Area safe for text/logos — inset from trim by safeMargin */
  safe: Rect
  /** Bleed area — trim edge inset */
  bleed: Rect
  /** Address/postage zone — must stay clear of artwork */
  addressBlock?: Rect
  /** USPS barcode clear zone (US only) — bottom 5/8" */
  barcodeZone?: Rect
  /** Message area within safe zone (left portion) */
  messageArea?: Rect
}

/**
 * Country-specific back-side layout specs for 6×4" postcards.
 *
 * Sources:
 * - US: USPS DMM §202 — right half for address/postage, bottom 5/8" barcode zone
 * - CA: Canada Post Machineable Mail — address zone 35mm from top, 10mm from edges,
 *       quiet zone 5mm around address
 * - UK/EU: PostGrid guideline — address zone is full right half of postcard
 */
export interface CountryPostalSpec {
  /** Fraction of width reserved for address side (right portion) */
  addressWidthRatio: number
  /** Bottom barcode clear zone height in px at 300 DPI (US only) */
  barcodeZoneHeight: number
  /** Return address zone top-left corner inset from trim (px at 300 DPI) */
  returnAddressInset: { x: number; y: number }
  /** Minimum quiet zone around address text (px at 300 DPI) */
  addressQuietZone: number
  /** Extra safe margin for this country (px at 300 DPI), added to base safeMargin */
  extraSafeMargin: number
}

const DPI = 300

function inchToPx(inches: number): number {
  return inches * DPI
}

function mmToPx(mm: number): number {
  return (mm / 25.4) * DPI
}

/**
 * USPS specs (DMM §202):
 * - Right half reserved for address/postage
 * - Bottom 5/8" (0.625") barcode clear zone
 * - Address panel: ≥1.5"h × 4"w in lower right
 * - Return address: upper left
 * - 0.125" buffer around address panel
 */
const US_SPEC: CountryPostalSpec = {
  addressWidthRatio: 0.5,
  barcodeZoneHeight: inchToPx(0.625),   // 187.5 px — USPS IMB clear zone
  returnAddressInset: { x: inchToPx(0.25), y: inchToPx(0.25) },
  addressQuietZone: inchToPx(0.125),     // 37.5 px
  extraSafeMargin: 0,
}

/**
 * Canada Post specs (Machineable Mail):
 * - Address zone: 35mm from top, 10mm from left/right/bottom
 * - Quiet zone: ≥5mm around address
 * - Return address: upper left, ≥15mm above destination address
 * - Postage: top right, 35×74mm area
 */
const CA_SPEC: CountryPostalSpec = {
  addressWidthRatio: 0.5,
  barcodeZoneHeight: 0,                  // No barcode clear zone for CA
  returnAddressInset: { x: mmToPx(10), y: mmToPx(10) },
  addressQuietZone: mmToPx(5),           // ~59 px
  extraSafeMargin: 0,
}

/**
 * UK/EU specs (PostGrid + Royal Mail):
 * - Address zone width = HALF the postcard width (per PostGrid guideline)
 * - No IMB barcode zone (Royal Mail uses different system)
 * - More generous quiet zones
 */
const UK_SPEC: CountryPostalSpec = {
  addressWidthRatio: 0.5,
  barcodeZoneHeight: 0,
  returnAddressInset: { x: mmToPx(10), y: mmToPx(10) },
  addressQuietZone: mmToPx(5),
  extraSafeMargin: mmToPx(2),            // ~24 px extra for Royal Mail
}

export const COUNTRY_SPECS: Record<CountryCode, CountryPostalSpec> = {
  US: US_SPEC,
  CA: CA_SPEC,
  GB: UK_SPEC,
}

export function getCountrySpec(countryCode: string): CountryPostalSpec {
  const normalized = countryCode.toUpperCase() as CountryCode
  return COUNTRY_SPECS[normalized] ?? US_SPEC
}

export function calculateSafeZones(
  dimensions: PostcardDimensions,
  includeAddressBlock = false,
  countryCode: CountryCode = 'US'
): SafeZones {
  const spec = getCountrySpec(countryCode)
  const effectiveSafeMargin = dimensions.safeMargin + spec.extraSafeMargin

  const zones: SafeZones = {
    safe: {
      x: effectiveSafeMargin,
      y: effectiveSafeMargin,
      width: dimensions.width - (effectiveSafeMargin * 2),
      height: dimensions.height - (effectiveSafeMargin * 2),
    },
    bleed: {
      x: dimensions.bleedMargin,
      y: dimensions.bleedMargin,
      width: dimensions.width - (dimensions.bleedMargin * 2),
      height: dimensions.height - (dimensions.bleedMargin * 2),
    },
  }

  if (includeAddressBlock) {
    const addressLeft = dimensions.width * (1 - spec.addressWidthRatio)
    zones.addressBlock = {
      x: addressLeft + spec.addressQuietZone,
      y: effectiveSafeMargin + spec.addressQuietZone,
      width: dimensions.width - addressLeft - effectiveSafeMargin - spec.addressQuietZone,
      height: dimensions.height - (effectiveSafeMargin * 2) - (spec.addressQuietZone * 2),
    }

    zones.messageArea = {
      x: effectiveSafeMargin,
      y: effectiveSafeMargin,
      width: addressLeft - effectiveSafeMargin - spec.addressQuietZone,
      height: dimensions.height - (effectiveSafeMargin * 2),
    }
  }

  if (countryCode === 'US' && spec.barcodeZoneHeight > 0) {
    zones.barcodeZone = {
      x: 0,
      y: dimensions.height - spec.barcodeZoneHeight,
      width: dimensions.width,
      height: spec.barcodeZoneHeight,
    }

    // Shrink safe zone to avoid barcode area
    zones.safe.height = dimensions.height - effectiveSafeMargin - spec.barcodeZoneHeight
    if (zones.addressBlock) {
      zones.addressBlock.height = dimensions.height - effectiveSafeMargin - spec.barcodeZoneHeight - (spec.addressQuietZone * 2)
    }
    if (zones.messageArea) {
      zones.messageArea.height = dimensions.height - effectiveSafeMargin - spec.barcodeZoneHeight
    }
  }

  return zones
}

export function generateFrontHTML(imageBase64: string): string {
  const dims = POSTCARD_6X4_DIMENSIONS

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: ${dims.width}px;
      height: ${dims.height}px;
      overflow: hidden;
      position: relative;
    }
    .full-bleed {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .full-bleed img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  </style>
</head>
<body>
  <div class="full-bleed">
    <img src="${imageBase64}" alt="Postcard front" />
  </div>
</body>
</html>`
}

