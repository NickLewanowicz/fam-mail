import { describe, it, expect } from 'vitest'
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  containers,
  breakpoints,
  animations,
  components,
  designTokens,
  getCSSVar,
  getColorWithOpacity,
} from './designTokens'

describe('designTokens', () => {
  describe('colors', () => {
    it('has primary color palette', () => {
      expect(colors.primary[500]).toBe('#3b82f6')
      expect(colors.primary[100]).toBe('#dbeafe')
      expect(colors.primary[900]).toBe('#1e3a8a')
    })

    it('has secondary color palette', () => {
      expect(colors.secondary[500]).toBe('#64748b')
      expect(colors.secondary[100]).toBe('#f1f5f9')
    })

    it('has semantic colors', () => {
      expect(colors.semantic.success).toBe('#10b981')
      expect(colors.semantic.warning).toBe('#f59e0b')
      expect(colors.semantic.error).toBe('#ef4444')
      expect(colors.semantic.info).toBe('#06b6d4')
    })

    it('has neutral colors', () => {
      expect(colors.neutral.white).toBe('#ffffff')
      expect(colors.neutral.black).toBe('#000000')
    })
  })

  describe('typography', () => {
    it('has font family definitions', () => {
      expect(typography.fontFamily.sans).toContain('system-ui')
      expect(typography.fontFamily.serif).toContain('Georgia')
      expect(typography.fontFamily.mono).toContain('monospace')
    })

    it('has font size scale', () => {
      expect(typography.fontSize.xs).toBe('0.75rem')
      expect(typography.fontSize.base).toBe('1rem')
      expect(typography.fontSize['2xl']).toBe('1.5rem')
    })

    it('has font weight scale', () => {
      expect(typography.fontWeight.light).toBe(300)
      expect(typography.fontWeight.normal).toBe(400)
      expect(typography.fontWeight.bold).toBe(700)
    })

    it('has line height scale', () => {
      expect(typography.lineHeight.tight).toBe(1.25)
      expect(typography.lineHeight.normal).toBe(1.5)
      expect(typography.lineHeight.loose).toBe(2)
    })
  })

  describe('spacing', () => {
    it('follows 4px base unit', () => {
      expect(spacing[1]).toBe('0.25rem')   // 4px
      expect(spacing[4]).toBe('1rem')      // 16px
      expect(spacing[8]).toBe('2rem')      // 32px
    })

    it('has 0 spacing', () => {
      expect(spacing[0]).toBe('0')
    })
  })

  describe('borderRadius', () => {
    it('has base radius', () => {
      expect(borderRadius.base).toBe('0.25rem')
    })

    it('has full radius', () => {
      expect(borderRadius.full).toBe('9999px')
    })
  })

  describe('zIndex', () => {
    it('has ascending z-index values', () => {
      expect(zIndex.dropdown).toBeLessThan(zIndex.sticky)
      expect(zIndex.sticky).toBeLessThan(zIndex.modal)
      expect(zIndex.modal).toBeLessThan(zIndex.tooltip)
      expect(zIndex.tooltip).toBeLessThan(zIndex.toast)
    })
  })

  describe('getCSSVar', () => {
    it('returns CSS variable format', () => {
      expect(getCSSVar('primary-500')).toBe('var(--primary-500)')
      expect(getCSSVar('spacing-4')).toBe('var(--spacing-4)')
    })
  })

  describe('getColorWithOpacity', () => {
    it('converts hex to rgba', () => {
      expect(getColorWithOpacity('#3b82f6', 1)).toBe('rgba(59, 130, 246, 1)')
      expect(getColorWithOpacity('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)')
    })

    it('handles full opacity', () => {
      const result = getColorWithOpacity('#ffffff', 1)
      expect(result).toBe('rgba(255, 255, 255, 1)')
    })

    it('handles zero opacity', () => {
      const result = getColorWithOpacity('#ef4444', 0)
      expect(result).toBe('rgba(239, 68, 68, 0)')
    })
  })

  describe('designTokens export', () => {
    it('exports all token categories', () => {
      expect(designTokens.colors).toBe(colors)
      expect(designTokens.typography).toBe(typography)
      expect(designTokens.spacing).toBe(spacing)
      expect(designTokens.borderRadius).toBe(borderRadius)
      expect(designTokens.shadows).toBe(shadows)
      expect(designTokens.transitions).toBe(transitions)
      expect(designTokens.zIndex).toBe(zIndex)
      expect(designTokens.containers).toBe(containers)
      expect(designTokens.breakpoints).toBe(breakpoints)
      expect(designTokens.animations).toBe(animations)
      expect(designTokens.components).toBe(components)
    })
  })

  describe('components tokens', () => {
    it('has button tokens', () => {
      expect(components.button.borderRadius).toBe('0.375rem')
      expect(components.button.fontWeight).toBe('500')
    })

    it('has card tokens', () => {
      expect(components.card.borderRadius).toBe('0.5rem')
    })

    it('has modal tokens', () => {
      expect(components.modal.borderRadius).toBe('1rem')
    })

    it('has form input tokens', () => {
      expect(components.form.input.borderRadius).toBe('0.375rem')
    })
  })

  describe('animations', () => {
    it('has fadeIn animation', () => {
      expect(animations.fadeIn).toContain('fadeIn')
      expect(animations.fadeIn).toContain('200ms')
    })

    it('has slide animations', () => {
      expect(animations.slideUp).toContain('slideUp')
      expect(animations.slideDown).toContain('slideDown')
    })
  })
})
