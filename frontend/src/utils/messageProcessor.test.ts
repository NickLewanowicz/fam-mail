import { describe, it, expect } from 'vitest'
import { processMessageMarkdown, validateMessageLength, previewMessageOnPostcard } from './messageProcessor'

describe('messageProcessor', () => {
  describe('processMessageMarkdown', () => {
    it('returns empty string for empty input', () => {
      expect(processMessageMarkdown('')).toBe('')
    })

    it('wraps plain text in paragraph tags', () => {
      const result = processMessageMarkdown('Hello World')
      expect(result).toContain('Hello World')
      expect(result).toContain('<p>')
    })

    it('converts bold markdown', () => {
      const result = processMessageMarkdown('Hello **World**')
      expect(result).toContain('<strong>World</strong>')
    })

    it('converts italic markdown', () => {
      const result = processMessageMarkdown('Hello *World*')
      expect(result).toContain('<em>World</em>')
    })

    it('converts underline markdown', () => {
      const result = processMessageMarkdown('Hello ~World~')
      expect(result).toContain('<u>World</u>')
    })

    it('converts h3 headers', () => {
      const result = processMessageMarkdown('### Header Three')
      expect(result).toContain('<h3>Header Three</h3>')
    })

    it('converts h2 headers', () => {
      const result = processMessageMarkdown('## Header Two')
      expect(result).toContain('<h2>Header Two</h2>')
    })

    it('converts h1 headers', () => {
      const result = processMessageMarkdown('# Header One')
      expect(result).toContain('<h1>Header One</h1>')
    })

    it('converts links', () => {
      const result = processMessageMarkdown('[Click here](https://example.com)')
      expect(result).toContain('<a href="https://example.com"')
      expect(result).toContain('Click here</a>')
    })

    it('adds target blank and rel to links', () => {
      const result = processMessageMarkdown('[Link](https://example.com)')
      expect(result).toContain('target="_blank"')
      expect(result).toContain('rel="noopener noreferrer"')
    })

    it('converts unordered lists', () => {
      const result = processMessageMarkdown('- Item 1\n- Item 2\n- Item 3')
      expect(result).toContain('<ul>')
      expect(result).toContain('</ul>')
      expect(result).toContain('<li>Item 1</li>')
      expect(result).toContain('<li>Item 2</li>')
    })

    it('converts ordered lists', () => {
      const result = processMessageMarkdown('1. First\n2. Second')
      expect(result).toContain('<ol>')
      expect(result).toContain('</ol>')
      expect(result).toContain('<li>First</li>')
      expect(result).toContain('<li>Second</li>')
    })

    it('handles line breaks', () => {
      const result = processMessageMarkdown('Line 1\nLine 2', { lineBreaks: true })
      expect(result).toContain('<br>')
    })

    it('handles double line breaks as paragraphs', () => {
      const result = processMessageMarkdown('Para 1\n\nPara 2', { lineBreaks: true })
      expect(result).toContain('</p><p>')
    })

    it('escapes HTML by default', () => {
      const result = processMessageMarkdown('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('</script>')
    })

    it('allows HTML when allowHTML is true', () => {
      const result = processMessageMarkdown('<b>Bold</b>', { allowHTML: true })
      expect(result).toContain('<b>Bold</b>')
    })

    it('uses bold style for __ text', () => {
      const result = processMessageMarkdown('Hello __World__')
      expect(result).toContain('<strong>World</strong>')
    })

    it('uses italic style for _ text', () => {
      const result = processMessageMarkdown('Hello _World_')
      expect(result).toContain('<em>World</em>')
    })

    it('handles unordered list with * prefix', () => {
      const result = processMessageMarkdown('* Item A\n* Item B')
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>Item A</li>')
    })

    it('handles unordered list with + prefix', () => {
      const result = processMessageMarkdown('+ Item A\n+ Item B')
      expect(result).toContain('<ul>')
      expect(result).toContain('<li>Item A</li>')
    })
  })

  describe('validateMessageLength', () => {
    it('accepts short messages', () => {
      const result = validateMessageLength('Hello')
      expect(result.valid).toBe(true)
      expect(result.characterCount).toBe(5)
      expect(result.warning).toBeUndefined()
    })

    it('accepts messages under 400 chars', () => {
      const message = 'a'.repeat(399)
      const result = validateMessageLength(message)
      expect(result.valid).toBe(true)
      expect(result.warning).toBeUndefined()
    })

    it('warns for messages between 400 and 500 chars', () => {
      const message = 'a'.repeat(450)
      const result = validateMessageLength(message)
      expect(result.valid).toBe(true)
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('quite long')
    })

    it('rejects messages over 500 chars', () => {
      const message = 'a'.repeat(501)
      const result = validateMessageLength(message)
      expect(result.valid).toBe(false)
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('too long')
    })

    it('estimates lines based on character count', () => {
      const result = validateMessageLength('a'.repeat(100))
      expect(result.estimatedLines).toBe(Math.ceil(100 / 50))
    })

    it('returns correct character count for empty string', () => {
      const result = validateMessageLength('')
      expect(result.characterCount).toBe(0)
      expect(result.estimatedLines).toBe(0)
    })

    it('accepts exactly 500 chars', () => {
      const message = 'a'.repeat(500)
      const result = validateMessageLength(message)
      expect(result.valid).toBe(true)
    })
  })

  describe('previewMessageOnPostcard', () => {
    it('generates HTML preview', () => {
      const html = previewMessageOnPostcard('Hello World')
      expect(html).toContain('Hello World')
      expect(html).toContain('font-family')
      expect(html).toContain('padding')
    })

    it('uses default font settings', () => {
      const html = previewMessageOnPostcard('Test')
      expect(html).toContain('Arial')
      expect(html).toContain('24px')
    })

    it('uses custom font settings', () => {
      const html = previewMessageOnPostcard('Test', {
        family: 'Georgia',
        size: '18px'
      })
      expect(html).toContain('Georgia')
      expect(html).toContain('18px')
    })

    it('processes markdown in message', () => {
      const html = previewMessageOnPostcard('**Bold** text')
      expect(html).toContain('<strong>Bold</strong>')
    })

    it('includes styling for postcard display', () => {
      const html = previewMessageOnPostcard('Test')
      expect(html).toContain('border-radius: 8px')
      expect(html).toContain('background: white')
    })
  })
})
