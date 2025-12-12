import { describe, it, expect, mock } from 'bun:test'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'

describe('Security: XSS Protection', () => {
  it('should sanitize malicious HTML directly', async () => {
    const maliciousHTML = `
      <p>Hello</p>
      <script>alert('XSS Attack')</script>
      <p>This is a test message</p>
      <img src="x" onerror="alert('XSS via image')">
      <a href="javascript:alert('XSS via link')">Click me</a>
      <iframe src="javascript:alert('XSS via iframe')"></iframe>
      <div onclick="alert('XSS via click')">Click me too</div>
    `

    // Sanitize the HTML (as done in postcards.ts)
    const sanitizedHTML = DOMPurify.sanitize(maliciousHTML, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img', 'div'],
      ALLOWED_ATTR: ['class', 'href', 'src', 'alt'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
    })

    // These should NOT be present in the sanitized HTML
    expect(sanitizedHTML).not.toContain('<script>')
    expect(sanitizedHTML).not.toContain('alert(')
    expect(sanitizedHTML).not.toContain('onerror=')
    expect(sanitizedHTML).not.toContain('javascript:')
    expect(sanitizedHTML).not.toContain('<iframe')
    expect(sanitizedHTML).not.toContain('onclick=')

    // But legitimate HTML should be preserved
    expect(sanitizedHTML).toContain('Hello')
    expect(sanitizedHTML).toContain('This is a test message')
    expect(sanitizedHTML).toContain('<p>')

    // Safe elements should be preserved but sanitized
    expect(sanitizedHTML).toContain('<img src="x">')
    expect(sanitizedHTML).toContain('<div>Click me too</div>')
  })

  it('should allow safe HTML tags in markdown', async () => {
    const safeHTML = `
      <h1>Safe Title</h1>
      <p>This has <strong>bold text</strong> and <em>italic text</em>.</p>
      <ul>
        <li>List item 1</li>
        <li>List item 2</li>
      </ul>
      <a href="https://example.com">Safe Link</a>
    `

    // Sanitize the HTML (as done in postcards.ts)
    const sanitizedHTML = DOMPurify.sanitize(safeHTML, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img', 'div'],
      ALLOWED_ATTR: ['class', 'href', 'src', 'alt'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
    })

    // These should be present in the sanitized HTML
    expect(sanitizedHTML).toContain('Safe Title')
    expect(sanitizedHTML).toContain('<strong>')
    expect(sanitizedHTML).toContain('<em>')
    expect(sanitizedHTML).toContain('<ul>')
    expect(sanitizedHTML).toContain('<li>')
    expect(sanitizedHTML).toContain('https://example.com')
    expect(sanitizedHTML).toContain('<h1>')
    expect(sanitizedHTML).toContain('<p>')
  })

  it('should block dangerous HTML attributes', async () => {
    const dangerousHTML = `
      <p style="background:url(javascript:alert('XSS'))">Dangerous style</p>
      <div onclick="alert('XSS')">Click me</div>
      <img src="valid.jpg" onload="alert('XSS')">
      <a href="javascript:alert('XSS')">Malicious link</a>
    `

    // Sanitize the HTML (as done in postcards.ts)
    const sanitizedHTML = DOMPurify.sanitize(dangerousHTML, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'a', 'img', 'div'],
      ALLOWED_ATTR: ['class', 'href', 'src', 'alt'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
    })

    // These dangerous attributes should be removed
    expect(sanitizedHTML).not.toContain('style=')
    expect(sanitizedHTML).not.toContain('onclick=')
    expect(sanitizedHTML).not.toContain('onload=')
    expect(sanitizedHTML).not.toContain('javascript:')
    expect(sanitizedHTML).not.toContain('alert(')

    // But safe content should be preserved
    expect(sanitizedHTML).toContain('<p>Dangerous style</p>')
    expect(sanitizedHTML).toContain('<div>Click me</div>')
    expect(sanitizedHTML).toContain('<img src="valid.jpg">')
    expect(sanitizedHTML).toContain('<a>Malicious link</a>')
  })

  it('should test the exact sanitization configuration used in postcards.ts', async () => {
    const testHTML = `
      <h1>Title</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
      <script>alert('xss')</script>
      <img src="test.jpg" onclick="alert('xss')" onerror="alert('xss')">
      <pre><code>Code block</code></pre>
    `

    // Use exact configuration from postcards.ts
    const sanitizedHTML = DOMPurify.sanitize(testHTML, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['class'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style']
    })

    // Verify the exact behavior
    expect(sanitizedHTML).toContain('<h1>Title</h1>')
    expect(sanitizedHTML).toContain('<strong>bold</strong>')
    expect(sanitizedHTML).toContain('<em>italic</em>')
    expect(sanitizedHTML).toContain('<pre><code>Code block</code></pre>')
    expect(sanitizedHTML).not.toContain('<script>')
    expect(sanitizedHTML).not.toContain('onclick=')
    expect(sanitizedHTML).not.toContain('onerror=')
    expect(sanitizedHTML).not.toContain('alert(')
  })
})