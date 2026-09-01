/**
 * Tests for the shared postcard HTML builders and sanitizers.
 *
 * These guard the print path: whatever leaves here is rendered onto a
 * physical card by PostGrid, so dimensions must match the real card sizes
 * and only safe formatting may survive sanitization.
 */

import { describe, it, expect } from 'bun:test'
import {
  SIZE_DIMENSIONS,
  isCardSize,
  sanitizeStyleAttribute,
  sanitizeMarkdownMessage,
  sanitizeMessageFragment,
  sanitizePostcardHtml,
  buildMessageBackHTML,
  buildImageFrontHTML,
  imageToDataUri,
} from './htmlSanitizer'

describe('SIZE_DIMENSIONS', () => {
  it('matches PostGrid pixel sizes at 300 DPI', () => {
    expect(SIZE_DIMENSIONS['6x4']).toEqual({ width: 1800, height: 1200 })
    expect(SIZE_DIMENSIONS['9x6']).toEqual({ width: 2700, height: 1800 })
    expect(SIZE_DIMENSIONS['11x6']).toEqual({ width: 3300, height: 1800 })
  })
})

describe('isCardSize', () => {
  it('accepts the three PostGrid sizes', () => {
    expect(isCardSize('6x4')).toBe(true)
    expect(isCardSize('9x6')).toBe(true)
    expect(isCardSize('11x6')).toBe(true)
  })

  it('rejects invalid sizes', () => {
    expect(isCardSize('4x6')).toBe(false)
    expect(isCardSize('')).toBe(false)
    expect(isCardSize('A4')).toBe(false)
  })
})

describe('sanitizeStyleAttribute', () => {
  it('keeps safe color and typography declarations', () => {
    const cleaned = sanitizeStyleAttribute('color: #dc2626; font-size: 24px')
    expect(cleaned).toContain('color');
    expect(cleaned).toContain('#dc2626')
    expect(cleaned).toContain('font-size: 24px')
  })

  it('strips url() references', () => {
    expect(sanitizeStyleAttribute('background: url(https://evil.example/x.png)')).toBe('')
    expect(sanitizeStyleAttribute('color: red; background-image: url(evil)')).not.toContain('url')
  })

  it('strips disallowed properties like position', () => {
    expect(sanitizeStyleAttribute('position: fixed')).toBe('')
    expect(sanitizeStyleAttribute('z-index: 9999')).toBe('')
  })

  it('strips javascript and expression tricks', () => {
    expect(sanitizeStyleAttribute('color: expression(alert(1))')).toBe('')
    expect(sanitizeStyleAttribute('width: 100px; behavior: url(script.htc)')).not.toContain('behavior')
  })

  it('keeps mixed declarations and drops only the unsafe ones', () => {
    const cleaned = sanitizeStyleAttribute('color: blue; position: absolute; text-align: center')
    expect(cleaned).toContain('color')
    expect(cleaned).toContain('text-align: center')
    expect(cleaned).not.toContain('position')
  })
})

describe('sanitizeMarkdownMessage', () => {
  it('lets the formatting whitelist pass through', () => {
    expect(sanitizeMarkdownMessage('hi <u>there</u>')).toBe('hi <u>there</u>')
    expect(sanitizeMarkdownMessage('hi <s>gone</s>')).toBe('hi <s>gone</s>')
    expect(sanitizeMarkdownMessage('H<sub>2</sub>O')).toBe('H<sub>2</sub>O')
    expect(sanitizeMarkdownMessage('x<sup>2</sup>')).toBe('x<sup>2</sup>')
  })

  it('lets color-only spans pass through (style normalized)', () => {
    expect(sanitizeMarkdownMessage('<span style="color:#dc2626">hi</span>'))
      .toBe('<span style="color:#dc2626;">hi</span>')
    expect(sanitizeMarkdownMessage('<span style="color: red">hi</span>'))
      .toBe('<span style="color: red;">hi</span>')
  })

  it('accepts already-formatted data URIs and detects mime for raw base64', () => {
    expect(imageToDataUri('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA')
    expect(imageToDataUri('/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ')
    expect(imageToDataUri('iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(imageToDataUri('UklGRh4A')).toBe('data:image/webp;base64,UklGRh4A')
  })

  it('drops spans with non-color styles', () => {
    const result = sanitizeMarkdownMessage('<span style="position:fixed">hi</span>')
    expect(result).not.toContain('span')
    expect(result).toBe('hi')
  })

  it('strips dangerous HTML entirely', () => {
    expect(sanitizeMarkdownMessage('<script>alert(1)</script>')).not.toContain('script')
    expect(sanitizeMarkdownMessage('<div class="x">text</div>')).not.toContain('div')
    expect(sanitizeMarkdownMessage('<img src=x onerror=alert(1)>')).not.toContain('img')
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeMarkdownMessage(undefined as unknown as string)).toBe('')
    expect(sanitizeMarkdownMessage(null as unknown as string)).toBe('')
  })

  it('preserves markdown syntax and plain text', () => {
    expect(sanitizeMarkdownMessage('**bold** and *italic*')).toBe('**bold** and *italic*')
    expect(sanitizeMarkdownMessage('plain text')).toBe('plain text')
  })
})

describe('sanitizeMessageFragment', () => {
  it('keeps formatting tags and color styles in rendered fragments', () => {
    const html = sanitizeMessageFragment('<p><u>under</u> and <span style="color:#2563eb">blue</span></p>')
    expect(html).toContain('<u>')
    expect(html).toContain('<span style=')
    expect(html).toContain('#2563eb')
  })

  it('strips scripts and event handlers', () => {
    const html = sanitizeMessageFragment('<p onclick="alert(1)">hi</p><script>x</script>')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('script')
  })
})

describe('sanitizePostcardHtml', () => {
  it('keeps document structure and style tags', () => {
    const doc = '<html><head><style>p { color: #333 }</style></head><body><p>hi</p></body></html>'
    const cleaned = sanitizePostcardHtml(doc)
    expect(cleaned).toContain('<html>')
    expect(cleaned).toContain('<style>')
    expect(cleaned).toContain('<p>hi</p>')
  })

  it('keeps safe inline styles but strips unsafe ones', () => {
    const cleaned = sanitizePostcardHtml('<p style="color:#dc2626">hi</p>')
    expect(cleaned).toContain('color')
    expect(sanitizePostcardHtml('<p style="position:fixed">hi</p>')).not.toContain('style')
  })

  it('strips scripts, iframes, and event handlers', () => {
    const cleaned = sanitizePostcardHtml('<body><script>alert(1)</script><iframe src="x"></iframe><p onclick="x()">hi</p></body>')
    expect(cleaned).not.toContain('script')
    expect(cleaned).not.toContain('iframe')
    expect(cleaned).not.toContain('onclick')
  })
})

describe('buildMessageBackHTML', () => {
  it('uses the 6x4 canvas for 6x4 cards', () => {
    const html = buildMessageBackHTML('Hello!', '6x4')
    expect(html).toContain('width: 1800px')
    expect(html).toContain('height: 1200px')
    expect(html).toContain('Hello!')
  })

  it('uses the 9x6 canvas for 9x6 cards', () => {
    const html = buildMessageBackHTML('Hello!', '9x6')
    expect(html).toContain('width: 2700px')
    expect(html).toContain('height: 1800px')
  })

  it('uses the 11x6 canvas for 11x6 cards', () => {
    const html = buildMessageBackHTML('Hello!', '11x6')
    expect(html).toContain('width: 3300px')
    expect(html).toContain('height: 1800px')
  })

  it('renders markdown to HTML in the message area', () => {
    const html = buildMessageBackHTML('**bold** text', '6x4')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('class="message"')
  })

  it('preserves whitelisted inline formatting with color', () => {
    const html = buildMessageBackHTML('<u>under</u> <span style="color:#dc2626">red</span>', '6x4')
    expect(html).toContain('<u>under</u>')
    expect(html).toContain('<span style=')
    expect(html).toContain('dc2626')
  })

  it('strips script tags from the message, keeping visible text only', () => {
    const html = buildMessageBackHTML('<script>alert(1)</script>hello', '6x4')
    expect(html).not.toContain('<script')
    expect(html).toContain('hello')
  })
})

describe('buildImageFrontHTML', () => {
  const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

  it('wraps the image full-bleed on the correct canvas', () => {
    const html = buildImageFrontHTML(dataUri, '6x4')
    expect(html).toContain(`src="${dataUri}"`)
    expect(html).toContain('width: 1800px')
    expect(html).toContain('height: 1200px')
    expect(html).toContain('object-fit: cover')
  })

  it('scales the canvas for larger sizes', () => {
    expect(buildImageFrontHTML(dataUri, '11x6')).toContain('width: 3300px')
    expect(buildImageFrontHTML(dataUri, '9x6')).toContain('width: 2700px')
  })
})
