import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * Message HTML contract (mirrors the backend sanitizeMarkdown):
 * markdown is allowed, plus the inline tags <u>, <s>, <sub>, <sup> and
 * <span style="color:..."> where the style attribute must be a single
 * color declaration. Everything else (scripts, event handlers, other
 * inline styles) is stripped.
 */
export const COLOR_STYLE_PATTERN = /^\s*color:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*;?\s*$/

// The hook mutates shared DOMPurify state — register it exactly once.
let colorStyleHookInstalled = false

function ensureColorStyleHook() {
  if (colorStyleHookInstalled) return
  colorStyleHookInstalled = true
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'style' && !COLOR_STYLE_PATTERN.test(data.attrValue)) {
      data.keepAttr = false
    }
  })
}

/**
 * Render a markdown message to sanitized HTML for display.
 * Allows the inline formatting subset (<u>, <s>, <sub>, <sup>,
 * <span style="color:...">) on top of markdown output.
 */
export function renderMessageHtml(message: string): string {
  ensureColorStyleHook()
  if (!message.trim()) return ''
  const raw = marked.parse(message, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['u', 's', 'sub', 'sup', 'span'],
  })
}
