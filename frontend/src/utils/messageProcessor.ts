/**
 * Message processing utilities for postcard back side
 * Supports markdown formatting with safe HTML output
 */

interface MarkdownOptions {
  allowHTML?: boolean
  lineBreaks?: boolean
  emphasizeStyle?: 'italic' | 'bold' | 'underline'
}

/**
 * Process markdown message and convert to safe HTML
 */
export function processMessageMarkdown(
  message: string,
  options: MarkdownOptions = {}
): string {
  const {
    allowHTML = false,
    lineBreaks = true,
    emphasizeStyle = 'italic'
  } = options

  if (!message) {
    return ''
  }

  let processed = message

  // Escape HTML if not allowed
  if (!allowHTML) {
    processed = escapeHtml(processed)
  }

  // Convert markdown to HTML
  processed = processMarkdown(processed, emphasizeStyle)

  // Handle line breaks
  if (lineBreaks) {
    processed = processed.replace(/\n\n/g, '</p><p>')
    processed = processed.replace(/\n/g, '<br>')
  }

  // Wrap in paragraph if not already wrapped
  if (!processed.startsWith('<')) {
    processed = `<p>${processed}</p>`
  }

  return processed
}

/**
 * Convert markdown syntax to HTML
 */
function processMarkdown(text: string, _emphasizeStyle: 'italic' | 'bold' | 'underline'): string {
  // Headers (limit to h3 for postcard size)
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Bold text
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic text
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/_(.+?)_/g, '<em>$1</em>')

  // Underline text
  text = text.replace(/~(.+?)~/g, '<u>$1</u>')

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Lists
  text = processLists(text)

  return text
}

/**
 * Process ordered and unordered lists
 */
function processLists(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inUnorderedList = false
  let inOrderedList = false
  let orderedCounter = 1

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check for unordered list
    if (trimmedLine.match(/^[-*+]\s/)) {
      if (!inUnorderedList) {
        result.push('<ul>')
        inUnorderedList = true
      }
      if (inOrderedList) {
        result.push('</ol>')
        inOrderedList = false
        orderedCounter = 1
      }
      result.push(`<li>${trimmedLine.replace(/^[-*+]\s/, '')}</li>`)
      continue
    }

    // Check for ordered list
    const orderedMatch = trimmedLine.match(/^\d+\.\s/)
    if (orderedMatch) {
      if (!inOrderedList) {
        result.push('<ol>')
        inOrderedList = true
      }
      if (inUnorderedList) {
        result.push('</ul>')
        inUnorderedList = false
      }
      result.push(`<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>`)
      orderedCounter++
      continue
    }

    // Close lists if needed
    if (inUnorderedList) {
      result.push('</ul>')
      inUnorderedList = false
    }
    if (inOrderedList) {
      result.push('</ol>')
      inOrderedList = false
      orderedCounter = 1
    }

    result.push(line)
  }

  // Close any remaining lists
  if (inUnorderedList) result.push('</ul>')
  if (inOrderedList) result.push('</ol>')

  return result.join('\n')
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validate message length for postcard
 */
export function validateMessageLength(message: string): {
  valid: boolean
  characterCount: number
  estimatedLines: number
  warning?: string
} {
  const characterCount = message.length
  const estimatedLines = Math.ceil(characterCount / 50) // Rough estimate

  if (characterCount > 500) {
    return {
      valid: false,
      characterCount,
      estimatedLines,
      warning: 'Message is too long for postcard. Please keep it under 500 characters.'
    }
  }

  if (characterCount > 400) {
    return {
      valid: true,
      characterCount,
      estimatedLines,
      warning: 'Message is quite long. Consider shortening it for better readability.'
    }
  }

  return {
    valid: true,
    characterCount,
    estimatedLines
  }
}

/**
 * Preview message as it would appear on postcard
 */
export function previewMessageOnPostcard(
  message: string,
  fontSelection: { family: string; size: string } = { family: 'Arial', size: '24px' }
): string {
  const messageHTML = processMessageMarkdown(message)

  return `
    <div style="
      font-family: ${fontSelection.family};
      font-size: ${fontSelection.size};
      line-height: 1.6;
      color: #1A1A1A;
      padding: 20px;
      max-width: 600px;
      background: white;
      border: 1px solid #E8EAED;
      border-radius: 8px;
    ">
      ${messageHTML}
    </div>
  `
}