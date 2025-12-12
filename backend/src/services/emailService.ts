import { postgridService } from './postgrid'
import { EmailParser, type EmailParseResult, type ParsedEmail } from './emailParser'
import type { PostGridPostcardRequest } from '../types/postgrid'

export interface EmailData {
  from: string
  to: string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    contentType: string
    data: string // base64 encoded
  }>
}

export interface PostcardRequest {
  to: {
    firstName: string
    lastName: string
    addressLine1: string
    addressLine2?: string
    city: string
    provinceOrState: string
    postalOrZip: string
    countryCode: string
  }
  message?: string
  frontHTML?: string
  backHTML?: string
  size?: '6x4' | '9x6' | '11x6'
}

export class EmailService {
  private parser: EmailParser

  constructor() {
    this.parser = new EmailParser()
  }

  async processEmail(emailData: EmailData): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      // Parse the email to extract recipient, message, and images
      const parsedEmail: ParsedEmail = {
        subject: emailData.subject,
        textContent: emailData.text || '',
        htmlContent: emailData.html,
        attachments: (emailData.attachments || []).map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          data: att.data,
          base64: true
        }))
      }

      const parseResult: EmailParseResult = this.parser.parseEmail(parsedEmail)

      if (!parseResult.isValid) {
        return {
          success: false,
          error: `Failed to parse email: ${parseResult.errors.join(', ')}`
        }
      }

      // Convert to postcard request
      const postcardRequest = this.convertToPostcardRequest(parseResult)

      // Create postcard using PostGrid service
      if (!postgridService) {
        return {
          success: false,
          error: 'PostGrid service not configured'
        }
      }

      const result = await postgridService.createPostcard(postcardRequest)

      return {
        success: true,
        result
      }

    } catch (error) {
      console.error('EmailService error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing email'
      }
    }
  }

  private convertToPostcardRequest(parseResult: EmailParseResult): PostGridPostcardRequest {
    if (!parseResult.recipient) {
      throw new Error('No recipient found in email')
    }

    const request: PostGridPostcardRequest = {
      to: {
        firstName: parseResult.recipient.firstName || '',
        lastName: parseResult.recipient.lastName || '',
        addressLine1: parseResult.recipient.addressLine1 || '',
        addressLine2: parseResult.recipient.addressLine2,
        city: parseResult.recipient.city || '',
        provinceOrState: parseResult.recipient.provinceOrState || '',
        postalOrZip: parseResult.recipient.postalOrZip || '',
        countryCode: parseResult.recipient.countryCode || 'US'
      },
      size: '6x4'
    }

    // Add message content
    if (parseResult.message) {
      request.backHTML = this.formatMessageAsHTML(parseResult.message)
    }

    // Add images as front HTML if any
    if (parseResult.images && parseResult.images.length > 0) {
      request.frontHTML = this.formatImagesAsHTML(parseResult.images)
    }

    return request
  }

  private formatMessageAsHTML(message: string): string {
    // Simple HTML formatting for the message
    const escapedMessage = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    // Convert newlines to paragraphs
    const paragraphs = escapedMessage
      .split('\n\n')
      .filter(p => p.trim())
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1800px;
            height: 1200px;
            overflow: hidden;
            position: relative;
            background: white;
            font-family: Arial, sans-serif;
            padding: 60px;
          }
          .message {
            position: absolute;
            left: 60px;
            top: 60px;
            width: 840px;
            height: 1080px;
            font-size: 24px;
            line-height: 1.6;
            color: #333;
          }
          .message p {
            margin-bottom: 12px;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="message">
          ${paragraphs}
        </div>
      </body>
      </html>
    `.trim()
  }

  private formatImagesAsHTML(images: Array<{ filename: string; data: string }>): string {
    if (images.length === 0) {
      return ''
    }

    const imageTags = images.map(img => {
      // Determine image type from filename
      const ext = img.filename.split('.').pop()?.toLowerCase() || 'jpg'
      const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg'

      return `<img src="data:${mimeType};base64,${img.data}" alt="${img.filename}" style="max-width: 100%; height: auto;" />`
    }).join('\n')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            width: 1800px;
            height: 1200px;
            overflow: hidden;
            position: relative;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .image-container {
            width: 1680px;
            height: 1080px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .image-container img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <div class="image-container">
          ${imageTags}
        </div>
      </body>
      </html>
    `.trim()
  }

  validateEmailData(emailData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!emailData.from || typeof emailData.from !== 'string') {
      errors.push('Valid "from" email address is required')
    }

    if (!emailData.to || !Array.isArray(emailData.to) || emailData.to.length === 0) {
      errors.push('Valid "to" email address array is required')
    }

    if (!emailData.subject || typeof emailData.subject !== 'string') {
      errors.push('Valid "subject" is required')
    }

    if (!emailData.text && !emailData.html) {
      errors.push('Either "text" or "html" content is required')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}