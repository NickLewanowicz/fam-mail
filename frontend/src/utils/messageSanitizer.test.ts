import { describe, it, expect } from 'vitest'
import { renderMessageHtml, COLOR_STYLE_PATTERN } from './messageSanitizer'

describe('messageSanitizer', () => {
  describe('COLOR_STYLE_PATTERN', () => {
    it('accepts 3-8 digit hex colors', () => {
      expect(COLOR_STYLE_PATTERN.test('color:#fff')).toBe(true)
      expect(COLOR_STYLE_PATTERN.test('color: #dc2626')).toBe(true)
      expect(COLOR_STYLE_PATTERN.test('color:#0f172a;')).toBe(true)
      expect(COLOR_STYLE_PATTERN.test('color:#abcdef12')).toBe(true)
    })

    it('accepts named colors', () => {
      expect(COLOR_STYLE_PATTERN.test('color:red')).toBe(true)
      expect(COLOR_STYLE_PATTERN.test('color: SteelBlue ;')).toBe(true)
    })

    it('rejects non-color declarations', () => {
      expect(COLOR_STYLE_PATTERN.test('position:fixed')).toBe(false)
      expect(COLOR_STYLE_PATTERN.test('color:red;background:blue')).toBe(false)
      expect(COLOR_STYLE_PATTERN.test('')).toBe(false)
      expect(COLOR_STYLE_PATTERN.test('color:javascript:alert(1)')).toBe(false)
    })
  })

  describe('renderMessageHtml', () => {
    it('returns empty string for blank messages', () => {
      expect(renderMessageHtml('')).toBe('')
      expect(renderMessageHtml('   ')).toBe('')
    })

    it('renders markdown (**bold** → strong)', () => {
      expect(renderMessageHtml('**bold** words')).toContain('<strong>bold</strong>')
    })

    it('renders GFM strikethrough (~~text~~ → del)', () => {
      expect(renderMessageHtml('~~gone~~')).toContain('<del>gone</del>')
    })

    it('keeps <u> tags', () => {
      expect(renderMessageHtml('hi <u>there</u>')).toContain('<u>there</u>')
    })

    it('keeps <s> tags', () => {
      expect(renderMessageHtml('hi <s>there</s>')).toContain('<s>there</s>')
    })

    it('keeps <sub> and <sup> tags', () => {
      expect(renderMessageHtml('H<sub>2</sub>O and x<sup>2</sup>')).toContain('<sub>2</sub>')
      expect(renderMessageHtml('H<sub>2</sub>O and x<sup>2</sup>')).toContain('<sup>2</sup>')
    })

    it('keeps span with hex color style', () => {
      const html = renderMessageHtml('<span style="color:#dc2626">red</span>')
      expect(html).toContain('<span style="color:#dc2626">red</span>')
    })

    it('keeps span with named color style', () => {
      const html = renderMessageHtml('<span style="color:red">red</span>')
      expect(html).toContain('style="color:red"')
    })

    it('strips span style that is not a color declaration', () => {
      const html = renderMessageHtml('<span style="position:fixed">pwn</span>')
      expect(html).toContain('pwn')
      expect(html).not.toContain('position')
      expect(html).not.toContain('style=')
    })

    it('strips multi-declaration styles', () => {
      const html = renderMessageHtml('<span style="color:red;background:blue">x</span>')
      expect(html).not.toContain('style=')
    })

    it('strips onclick event handlers', () => {
      const html = renderMessageHtml('<u onclick="alert(1)">x</u>')
      expect(html).not.toContain('onclick')
      expect(html).toContain('<u>x</u>')
    })

    it('strips script tags and their content', () => {
      const html = renderMessageHtml('<script>alert(1)</script>safe text')
      expect(html).not.toContain('<script')
      expect(html).not.toContain('alert')
      expect(html).toContain('safe text')
    })
  })
})
