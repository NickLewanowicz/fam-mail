import { describe, it, expect } from 'vitest'
import {
  POSTCARD_6X4_DIMENSIONS,
  COUNTRY_SPECS,
  calculateSafeZones,
  generateFrontHTML,
  generateBackHTML,
  generatePreviewHTML,
  getCountrySpec,
  type CountryCode,
} from './postcardTemplate'

const DPI = 300

describe('postcardTemplate', () => {
  describe('POSTCARD_6X4_DIMENSIONS', () => {
    it('has correct trim dimensions (6×4" at 300 DPI)', () => {
      expect(POSTCARD_6X4_DIMENSIONS.width).toBe(1800)
      expect(POSTCARD_6X4_DIMENSIONS.height).toBe(1200)
    })

    it('has 0.125" safe margin (37.5px at 300 DPI)', () => {
      expect(POSTCARD_6X4_DIMENSIONS.safeMargin).toBe(37.5)
    })

    it('has 0.125" bleed margin', () => {
      expect(POSTCARD_6X4_DIMENSIONS.bleedMargin).toBe(37.5)
    })
  })

  describe('COUNTRY_SPECS', () => {
    it('defines specs for US, CA, and GB', () => {
      expect(COUNTRY_SPECS).toHaveProperty('US')
      expect(COUNTRY_SPECS).toHaveProperty('CA')
      expect(COUNTRY_SPECS).toHaveProperty('GB')
    })

    it('US has 50% address width ratio', () => {
      expect(COUNTRY_SPECS.US.addressWidthRatio).toBe(0.5)
    })

    it('US has 5/8" (0.625") barcode zone = 187.5px', () => {
      expect(COUNTRY_SPECS.US.barcodeZoneHeight).toBe(0.625 * DPI)
    })

    it('US has 0.125" address quiet zone', () => {
      expect(COUNTRY_SPECS.US.addressQuietZone).toBe(0.125 * DPI)
    })

    it('CA has no barcode zone', () => {
      expect(COUNTRY_SPECS.CA.barcodeZoneHeight).toBe(0)
    })

    it('CA has 5mm quiet zone around address (~59px)', () => {
      const expected = (5 / 25.4) * DPI
      expect(COUNTRY_SPECS.CA.addressQuietZone).toBeCloseTo(expected, 0)
    })

    it('GB has no barcode zone', () => {
      expect(COUNTRY_SPECS.GB.barcodeZoneHeight).toBe(0)
    })

    it('GB has extra safe margin for Royal Mail', () => {
      expect(COUNTRY_SPECS.GB.extraSafeMargin).toBeGreaterThan(0)
    })

    it('GB address area is half the width', () => {
      expect(COUNTRY_SPECS.GB.addressWidthRatio).toBe(0.5)
    })
  })

  describe('getCountrySpec', () => {
    it('returns US spec for "US"', () => {
      expect(getCountrySpec('US')).toBe(COUNTRY_SPECS.US)
    })

    it('returns CA spec for "CA"', () => {
      expect(getCountrySpec('CA')).toBe(COUNTRY_SPECS.CA)
    })

    it('returns GB spec for "GB"', () => {
      expect(getCountrySpec('GB')).toBe(COUNTRY_SPECS.GB)
    })

    it('is case-insensitive', () => {
      expect(getCountrySpec('us')).toBe(COUNTRY_SPECS.US)
      expect(getCountrySpec('gb')).toBe(COUNTRY_SPECS.GB)
    })

    it('defaults to US for unknown country codes', () => {
      expect(getCountrySpec('ZZ')).toBe(COUNTRY_SPECS.US)
    })
  })

  describe('calculateSafeZones', () => {
    it('calculates safe zone correctly (default US)', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)
      expect(zones.safe.x).toBe(37.5)
      expect(zones.safe.y).toBe(37.5)
      expect(zones.safe.width).toBe(1800 - 75)
    })

    it('calculates bleed zone correctly', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)
      expect(zones.bleed.x).toBe(37.5)
      expect(zones.bleed.y).toBe(37.5)
      expect(zones.bleed.width).toBe(1800 - 75)
      expect(zones.bleed.height).toBe(1200 - 75)
    })

    it('does not include address block by default', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS)
      expect(zones.addressBlock).toBeUndefined()
    })

    it('includes address block when requested', () => {
      const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
      expect(zones.addressBlock).toBeDefined()
      expect(zones.messageArea).toBeDefined()
    })

    describe('US-specific zones', () => {
      it('has USPS barcode zone when address block included', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        expect(zones.barcodeZone).toBeDefined()
        expect(zones.barcodeZone!.height).toBe(187.5)
        expect(zones.barcodeZone!.y).toBe(1200 - 187.5)
        expect(zones.barcodeZone!.width).toBe(1800)
      })

      it('shrinks safe height to avoid barcode zone', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        const usSpec = COUNTRY_SPECS.US
        const expectedHeight = 1200 - 37.5 - usSpec.barcodeZoneHeight
        expect(zones.safe.height).toBe(expectedHeight)
      })

      it('message area does not overlap barcode zone', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        const msgBottom = zones.messageArea!.y + zones.messageArea!.height
        expect(msgBottom).toBeLessThanOrEqual(zones.barcodeZone!.y)
      })

      it('address block does not overlap barcode zone', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        const addrBottom = zones.addressBlock!.y + zones.addressBlock!.height
        expect(addrBottom).toBeLessThanOrEqual(zones.barcodeZone!.y)
      })

      it('address block occupies right half', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        expect(zones.addressBlock!.x).toBeGreaterThanOrEqual(1800 * 0.5)
      })

      it('message area occupies left half', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        const msgRight = zones.messageArea!.x + zones.messageArea!.width
        expect(msgRight).toBeLessThanOrEqual(1800 * 0.5)
      })
    })

    describe('CA-specific zones', () => {
      it('has no barcode zone', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'CA')
        expect(zones.barcodeZone).toBeUndefined()
      })

      it('safe zone uses full height (no barcode cutout)', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'CA')
        const safeMargin = 37.5
        expect(zones.safe.height).toBe(1200 - safeMargin * 2)
      })

      it('message area uses full height', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'CA')
        const safeMargin = 37.5
        expect(zones.messageArea!.height).toBe(1200 - safeMargin * 2)
      })

      it('address block has Canada Post quiet zone (5mm)', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'CA')
        const caQuiet = COUNTRY_SPECS.CA.addressQuietZone
        expect(zones.addressBlock!.x).toBeGreaterThanOrEqual(900 + caQuiet)
      })
    })

    describe('GB-specific zones', () => {
      it('has no barcode zone', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'GB')
        expect(zones.barcodeZone).toBeUndefined()
      })

      it('has larger effective safe margin (base + Royal Mail extra)', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, false, 'GB')
        const effectiveMargin = 37.5 + COUNTRY_SPECS.GB.extraSafeMargin
        expect(zones.safe.x).toBe(effectiveMargin)
        expect(zones.safe.y).toBe(effectiveMargin)
      })

      it('address block is right half (PostGrid UK spec)', () => {
        const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'GB')
        expect(zones.addressBlock!.x).toBeGreaterThanOrEqual(1800 * 0.5)
      })

      it('safe zone is narrower than US due to extra Royal Mail margin', () => {
        const usZones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, false, 'US')
        const gbZones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, false, 'GB')
        expect(gbZones.safe.width).toBeLessThan(usZones.safe.width)
        // GB safe zone is also shorter (vertically) because of extra margin
        expect(gbZones.safe.x).toBeGreaterThan(usZones.safe.x)
      })
    })

    describe('cross-country comparisons', () => {
      const countries: CountryCode[] = ['US', 'CA', 'GB']

      for (const cc of countries) {
        it(`${cc}: message area does not overlap address area`, () => {
          const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, cc)
          if (zones.messageArea && zones.addressBlock) {
            const msgRight = zones.messageArea.x + zones.messageArea.width
            expect(msgRight).toBeLessThanOrEqual(zones.addressBlock.x)
          }
        })

        it(`${cc}: safe zone fits within bleed zone`, () => {
          const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, cc)
          expect(zones.safe.x).toBeGreaterThanOrEqual(zones.bleed.x)
          expect(zones.safe.y).toBeGreaterThanOrEqual(zones.bleed.y)
        })

        it(`${cc}: address block is within postcard bounds`, () => {
          const zones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, cc)
          if (zones.addressBlock) {
            const right = zones.addressBlock.x + zones.addressBlock.width
            const bottom = zones.addressBlock.y + zones.addressBlock.height
            expect(right).toBeLessThanOrEqual(1800)
            expect(bottom).toBeLessThanOrEqual(1200)
          }
        })
      }

      it('US message area is shorter than CA due to barcode zone', () => {
        const usZones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'US')
        const caZones = calculateSafeZones(POSTCARD_6X4_DIMENSIONS, true, 'CA')
        expect(usZones.messageArea!.height).toBeLessThan(caZones.messageArea!.height)
      })
    })

    it('works with custom dimensions', () => {
      const customDims = { width: 1000, height: 600, safeMargin: 20, bleedMargin: 10 }
      const zones = calculateSafeZones(customDims)
      expect(zones.safe.x).toBe(20)
      expect(zones.safe.width).toBe(1000 - 40)
      expect(zones.bleed.x).toBe(10)
    })
  })

  describe('generateFrontHTML', () => {
    it('generates valid HTML', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
      expect(html).toContain('</html>')
    })

    it('includes image in HTML', () => {
      const imageData = 'data:image/jpeg;base64,abc123'
      const html = generateFrontHTML(imageData)
      expect(html).toContain(imageData)
      expect(html).toContain('alt="Postcard front"')
    })

    it('uses postcard dimensions', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('width: 1800px')
      expect(html).toContain('height: 1200px')
    })

    it('uses object-fit cover for image', () => {
      const html = generateFrontHTML('data:image/jpeg;base64,test')
      expect(html).toContain('object-fit: cover')
    })
  })

  describe('generateBackHTML', () => {
    it('generates valid HTML', () => {
      const html = generateBackHTML()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html>')
    })

    it('includes placeholder message when no message provided', () => {
      const html = generateBackHTML()
      expect(html).toContain('Your message will appear here')
    })

    it('includes provided message HTML', () => {
      const html = generateBackHTML('<p>Hello World</p>')
      expect(html).toContain('<p>Hello World</p>')
    })

    it('has message area', () => {
      const html = generateBackHTML()
      expect(html).toContain('message-area')
    })

    it('has address area', () => {
      const html = generateBackHTML()
      expect(html).toContain('address-area')
    })

    it('has divider', () => {
      const html = generateBackHTML()
      expect(html).toContain('divider')
    })

    it('uses postcard dimensions', () => {
      const html = generateBackHTML()
      expect(html).toContain('1800px')
      expect(html).toContain('1200px')
    })

    it('accepts country code parameter', () => {
      const usHtml = generateBackHTML('<p>Hi</p>', 'US')
      const gbHtml = generateBackHTML('<p>Hi</p>', 'GB')
      expect(usHtml).toContain('message-area')
      expect(gbHtml).toContain('message-area')
    })
  })

  describe('generatePreviewHTML', () => {
    it('generates front preview with safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'front', true)
      expect(html).toContain('rgba(34, 197, 94, 0.8)')
    })

    it('generates front preview without safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'front', false)
      expect(html).not.toContain('rgba(34, 197, 94, 0.8)')
    })

    it('generates back preview with safe zones and address block', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true)
      expect(html).toContain('rgba(239, 68, 68, 0.6)')
      expect(html).toContain('rgba(34, 197, 94, 0.8)')
    })

    it('US back preview shows USPS barcode zone', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true, undefined, 'US')
      expect(html).toContain('USPS Barcode Zone')
    })

    it('CA back preview has no barcode zone', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true, undefined, 'CA')
      expect(html).not.toContain('USPS Barcode Zone')
    })

    it('GB back preview has no barcode zone', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true, undefined, 'GB')
      expect(html).not.toContain('USPS Barcode Zone')
    })

    it('generates back preview with message', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', true, '<p>Test message</p>')
      expect(html).toContain('<p>Test message</p>')
    })

    it('generates back preview without safe zones', () => {
      const html = generatePreviewHTML('data:image/jpeg;base64,test', 'back', false)
      expect(html).not.toContain('rgba(34, 197, 94, 0.8)')
    })
  })
})
