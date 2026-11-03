/**
 * Shared postcard HTML building + sanitization.
 *
 * PostGrid renders our HTML into a physical printed card, so everything here
 * must be safe to print and dimension-accurate:
 * - Back-of-card canvases match the real PostGrid pixel sizes per card size
 *   (6x4=1800x1200, 9x6=2700x1800, 11x6=3300x1800 at 300 DPI).
 * - The message area occupies the left portion of the back; PostGrid injects
 *   the delivery address block on the right.
 * - Inline styles are allowed only for a safe CSS property set (no url(),
 *   no positioning, no external references) so users can color and size text
 *   without opening CSS-injection vectors.
 */

import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import type { PostGridPostcardRequest } from '../types/postgrid'

// ---------------------------------------------------------------------------
// Size geometry
// ---------------------------------------------------------------------------

export type CardSize = '6x4' | '9x6' | '11x6'

export interface CardDimensions {
  width: number
  height: number
}

/** Real PostGrid canvas dimensions in pixels at 300 DPI. */
export const SIZE_DIMENSIONS: Record<CardSize, CardDimensions> = {
  '6x4': { width: 1800, height: 1200 },
  '9x6': { width: 2700, height: 1800 },
  '11x6': { width: 3300, height: 1800 },
}

export function isCardSize(size: string): size is CardSize {
  return size === '6x4' || size === '9x6' || size === '11x6'
}

// ---------------------------------------------------------------------------
// CSS sanitization
// ---------------------------------------------------------------------------

/** CSS properties safe for printed postcards. */
const ALLOWED_CSS_PROPERTIES = new Set([
  'color',
  'background-color',
  'text-align',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-decoration',
  'text-transform',
  'width',
  'height',
  'max-width',
  'max-height',
  'object-fit',
  'margin',
  'margin-top',
  'margin-bottom',
  'padding',
  'border-radius',
  'display',
])

/** Characters/constructs never allowed in CSS values (fetches, scripting). */
const CSS_VALUE_FORBIDDEN_RE = /url\s*\(|expression|javascript:|@import|<|>|"|'|\\/

/**
 * Validate a single CSS declaration `prop: value`.
 * @returns true when both the property and value are safe.
 */
function isSafeCssDeclaration(declaration: string): boolean {
  const colonIndex = declaration.indexOf(':')
  if (colonIndex === -1) return false

  const property = declaration.slice(0, colonIndex).trim().toLowerCase()
  const value = declaration.slice(colonIndex + 1).trim()
  if (!property || !value) return false
  if (!ALLOWED_CSS_PROPERTIES.has(property)) return false
  if (CSS_VALUE_FORBIDDEN_RE.test(value)) return false
  // Values are plain token lists: colors, lengths, keywords, numbers.
  if (!/^[a-zA-Z0-9#\s,.%-]+$/.test(value)) return false
  return true
}

/**
 * Filter a `style` attribute value down to safe declarations.
 * @returns the cleaned declarations, or '' when nothing is safe.
 */
export function sanitizeStyleAttribute(value: string): string {
  return value
    .split(';')
    .filter((declaration) => isSafeCssDeclaration(declaration))
    .map((declaration) => `${declaration.trim()};`)
    .join(' ')
    .trim()
}

// ---------------------------------------------------------------------------
// DOMPurify configuration
// ---------------------------------------------------------------------------

/** Tags allowed in the rendered message body (markdown + inline formatting). */
export const MESSAGE_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'span',
  'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code', 'pre', 'hr',
]

/** Tags allowed in full postcard documents sent to PostGrid. */
const DOCUMENT_ALLOWED_TAGS = [
  'html', 'head', 'body', 'meta', 'title', 'style',
  'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'img', 'a',
]

/**
 * Detect a full HTML document — those must be sanitized as whole documents,
 * otherwise DOMPurify drops the html/head/body wrapper and the print canvas.
 */
function isFullDocument(html: string): boolean {
  return /<html[\s>]/i.test(html) || /<!DOCTYPE/i.test(html)
}

let hookRegistered = false

/**
 * Register the global style-attribute filter on the shared DOMPurify
 * instance. Idempotent; the hook validates every `style` attribute value
 * against the safe CSS property set regardless of which sanitizer config
 * runs, and removes the attribute when nothing survives.
 */
function registerStyleAttributeHook(): void {
  if (hookRegistered) return
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'style') {
      const cleaned = sanitizeStyleAttribute(data.attrValue ?? '')
      if (cleaned === '') {
        data.keepAttr = false
      } else {
        data.attrValue = cleaned
      }
    }
  })
  hookRegistered = true
}

/**
 * Sanitize a rendered message fragment (markdown -> HTML output).
 */
export function sanitizeMessageFragment(html: string): string {
  registerStyleAttributeHook()
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MESSAGE_ALLOWED_TAGS,
    ALLOWED_ATTR: ['class', 'style'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'svg'],
  })
}

/**
 * Sanitize a full postcard HTML document before sending to PostGrid.
 *
 * PostGrid renders the HTML into a physical postcard. Any malicious HTML
 * (script injection, event handlers, iframes, etc.) must be stripped to
 * prevent content injection that wastes real money on abusive postcards.
 */
export function sanitizePostcardHtml(html: string): string {
  registerStyleAttributeHook()
  return DOMPurify.sanitize(html, {
    // Full documents (front/back card canvases) must be sanitized as whole
    // documents — DOMPurify otherwise strips the html/head/body wrapper and
    // the print canvas dimensions with it.
    WHOLE_DOCUMENT: isFullDocument(html),
    ALLOWED_TAGS: DOCUMENT_ALLOWED_TAGS,
    ALLOWED_ATTR: ['class', 'href', 'src', 'alt', 'charset', 'name', 'content', 'style'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
    // Strip tag contents of forbidden elements entirely
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'svg'],
  })
}

// ---------------------------------------------------------------------------
// Markdown-stage sanitization
// ---------------------------------------------------------------------------

/**
 * Strip HTML from markdown text while letting the inline formatting whitelist
 * through (`<u>`, `<s>`, `<sub>`, `<sup>`, and color-only `<span style>`).
 *
 * The final HTML still passes through DOMPurify (sanitizeMessageFragment), so
 * this stage is defense-in-depth against markup that could confuse the
 * markdown parser.
 */
export function sanitizeMarkdownMessage(markdown: string): string {
  if (typeof markdown !== 'string') {
    return ''
  }

  const protectedTags: string[] = []
  const protect = (tag: string): string => {
    protectedTags.push(tag)
    return `\u0000${protectedTags.length - 1}\u0000`
  }

  // Phase 1: paired spans. Color-styled spans survive with their style
  // filtered; any other span is unwrapped, keeping its content.
  let shielded = markdown.replace(
    /<span(\s+style="([^"]*)")?\s*>([\s\S]*?)<\/span>/g,
    (_match, styleAttr: string | undefined, styleValue: string, inner: string) => {
      const cleaned = styleAttr !== undefined ? sanitizeStyleAttribute(styleValue) : ''
      if (cleaned) {
        return protect(`<span style="${cleaned}">`) + inner + protect('</span>')
      }
      return inner
    }
  )

  // Phase 2: simple formatting tags pass through untouched.
  shielded = shielded.replace(/<(\/?)(?:u|s|sub|sup)\s*>/g, (match) => protect(match))

  // Strip every remaining tag.
  const stripped = shielded.replace(/<[^>]*>/g, '')

  let restored = stripped
  protectedTags.forEach((tag, index) => {
    restored = restored.split(`\u0000${index}\u0000`).join(tag)
  })
  return restored
}

// ---------------------------------------------------------------------------
// Back-of-card document builders
// ---------------------------------------------------------------------------

/**
 * Build the full back-of-card HTML document for a markdown message.
 *
 * Layout: message block on the left, empty space on the right where PostGrid
 * prints the delivery address. Dimensions follow the real card size.
 */
export function buildMessageBackHTML(messageMarkdown: string, size: CardSize): string {
  const dims = SIZE_DIMENSIONS[size]
  const pad = Math.round(dims.height * 0.05)
  const messageWidth = Math.round(dims.width * 0.467)
  const baseFont = Math.round(dims.height * 0.02)
  const h1 = Math.round(baseFont * 1.5)
  const h2 = Math.round(baseFont * 1.33)
  const h3 = Math.round(baseFont * 1.17)

  const sanitizedMarkdown = sanitizeMarkdownMessage(messageMarkdown)
  const markedHTML = marked.parse(sanitizedMarkdown, { async: false })
  const messageHTML = sanitizeMessageFragment(markedHTML)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: ${dims.width}px;
          height: ${dims.height}px;
          overflow: hidden;
          position: relative;
          background: white;
          font-family: Arial, sans-serif;
          padding: ${pad}px;
        }
        .message {
          position: absolute;
          left: ${pad}px;
          top: ${pad}px;
          width: ${messageWidth}px;
          height: ${dims.height - pad * 2}px;
          font-size: ${baseFont}px;
          line-height: 1.6;
          color: #333;
        }
        .message h1 { font-size: ${h1}px; margin-bottom: ${baseFont * 0.67}px; }
        .message h2 { font-size: ${h2}px; margin-bottom: ${baseFont * 0.58}px; }
        .message h3 { font-size: ${h3}px; margin-bottom: ${baseFont * 0.5}px; }
        .message p { margin-bottom: ${baseFont * 0.5}px; }
        .message strong { font-weight: bold; }
        .message em { font-style: italic; }
        .message u { text-decoration: underline; }
        .message s { text-decoration: line-through; }
      </style>
    </head>
    <body>
      <div class="message">
        ${messageHTML}
      </div>
    </body>
    </html>
  `.trim()
}

/**
 * Normalize raw base64 image data into a data URI for HTML embedding.
 * Accepts already-formed data URIs unchanged; detects the MIME type from the
 * base64 magic-byte prefixes (JPEG /9j/, PNG iVBOR, WebP UklGR).
 */
export function imageToDataUri(imageData: string): string {
  if (imageData.startsWith('data:image/')) {
    return imageData
  }
  let mime = 'image/jpeg'
  if (imageData.startsWith('iVBOR')) {
    mime = 'image/png'
  } else if (imageData.startsWith('UklGR')) {
    mime = 'image/webp'
  }
  return `data:${mime};base64,${imageData}`
}

/**
 * Build a full-bleed front-of-card document from a base64 image data URI.
 *
 * Used when a card's artwork comes from an uploaded photo instead of
 * user-authored HTML. The image covers the whole front canvas.
 */
export function buildImageFrontHTML(imageData: string, size: CardSize): string {
  const dims = SIZE_DIMENSIONS[size]
  const src = imageToDataUri(imageData)
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { width: ${dims.width}px; height: ${dims.height}px; overflow: hidden; }
        img {
          width: ${dims.width}px;
          height: ${dims.height}px;
          object-fit: cover;
          display: block;
        }
      </style>
    </head>
    <body>
      <img src="${src}" alt="Postcard front">
    </body>
    </html>
  `.trim()
}

/** Re-export for request-type consumers. */
export type { PostGridPostcardRequest }
