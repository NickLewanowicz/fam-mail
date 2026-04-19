import { EmailService, type EmailData } from '../services/emailService'
import { getConfig } from '../config'
import { jsonResponse } from '../middleware/headers'
import { logger } from '../utils/logger'

// Email service instance (exported for testing)
let emailService: EmailService = new EmailService()

/**
 * Replace the email service instance. Used for testing.
 * @internal
 */
export function _setEmailService(service: EmailService): void {
  emailService = service
}

function verifyWebhookSecret(req: Request): boolean {
  const config = getConfig()
  const secret = config.postgrid.webhookSecret

  // Reject all requests when WEBHOOK_SECRET is not configured
  if (!secret) {
    logger.error('WEBHOOK_SECRET is not configured — webhook authentication is disabled. Set POSTGRID_WEBHOOK_SECRET in your environment.')
    return false
  }

  // Check for secret in header only (query params leak into server/CDN logs)
  const headerSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '')

  return headerSecret === secret
}

// Handle SendGrid webhook format
function parseSendGridWebhook(body: unknown): EmailData | null {
  try {
    // SendGrid sends events array, we're interested in "delivered" events
    if (!Array.isArray(body) || body.length === 0) {
      return null
    }

    const event = body[0] as Record<string, unknown> // Process first event

    // Parse the email from SendGrid format
    if (event.event === 'delivered' && event.email) {
      const content = event.content as Record<string, unknown> | undefined
      return {
        from: (event.email as string) || '',
        to: [(event.email as string) || ''],
        subject: (event.subject as string) || 'No Subject',
        text: (event.text as string) || (content?.text as string) || '',
        html: (event.html as string) || (content?.html as string),
        attachments: (Array.isArray(event.attachments) ? event.attachments : []) as EmailData['attachments']
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing SendGrid webhook:', error)
    return null
  }
}

// Handle Mailgun webhook format
function parseMailgunWebhook(formData: URLSearchParams): EmailData | null {
  try {
    return {
      from: formData.get('from') || '',
      to: [formData.get('recipient') || formData.get('to') || ''],
      subject: formData.get('subject') || '',
      text: formData.get('body-plain') || '',
      html: formData.get('body-html') || undefined,
      attachments: [] // Mailgun handles attachments differently
    }
  } catch (error) {
    console.error('Error parsing Mailgun webhook:', error)
    return null
  }
}

// Handle generic email webhook (simple JSON format)
function parseGenericWebhook(body: unknown): EmailData | null {
  try {
    // Basic validation
    if (!body || typeof body !== 'object') {
      return null
    }

    const data = body as Record<string, unknown>

    return {
      from: (data.from as string) || (data.sender as string) || '',
      to: Array.isArray(data.to) ? data.to as string[] : [String(data.to || '')],
      subject: (data.subject as string) || '',
      text: (data.text as string) || (data.plain as string) || (data.content as string) || '',
      html: (data.html as string) || (data.bodyHtml as string),
      attachments: (Array.isArray(data.attachments) ? data.attachments : []) as EmailData['attachments']
    }
  } catch (error) {
    console.error('Error parsing generic webhook:', error)
    return null
  }
}

export async function handleEmailWebhook(req: Request): Promise<Response> {
  try {
    if (!verifyWebhookSecret(req)) {
      return jsonResponse({
        success: false,
        error: 'Invalid webhook secret'
      }, 401, req)
    }

    const contentType = req.headers.get('content-type') || ''
    let emailData: EmailData | null = null

    if (contentType.includes('application/json')) {
      try {
        const body = await req.json()

        // Try SendGrid format first (array of events)
        if (Array.isArray(body)) {
          emailData = parseSendGridWebhook(body)
          if (!emailData) {
            // Empty array or non-delivered event — fall back to generic
            emailData = parseGenericWebhook(body)
          }
        } else {
          // Generic JSON format
          emailData = parseGenericWebhook(body)
        }
      } catch {
        // Malformed JSON
        return jsonResponse({
          success: false,
          error: 'Unable to parse email data from webhook'
        }, 400, req)
      }
    } else if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData()
        const params = new URLSearchParams()
        formData.forEach((value, key) => {
          params.set(key, typeof value === 'string' ? value : '')
        })
        emailData = parseMailgunWebhook(params)
      } catch {
        return jsonResponse({
          success: false,
          error: 'Unable to parse email data from webhook'
        }, 400, req)
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const text = await req.text()
        const params = new URLSearchParams(text)
        emailData = parseMailgunWebhook(params)
      } catch {
        return jsonResponse({
          success: false,
          error: 'Unable to parse email data from webhook'
        }, 400, req)
      }
    } else {
      return jsonResponse({
        success: false,
        error: 'Unable to parse email data from webhook'
      }, 400, req)
    }

    if (!emailData) {
      return jsonResponse({
        success: false,
        error: 'Unable to parse email data from webhook'
      }, 400, req)
    }

    // Validate email data
    const validation = emailService.validateEmailData(emailData)
    if (!validation.isValid) {
      return jsonResponse({
        success: false,
        error: 'Invalid email data',
        details: validation.errors
      }, 400, req)
    }

    // Process email and create postcard
    const result = await emailService.processEmail(emailData)
    if (!result.success) {
      return jsonResponse({
        success: false,
        error: result.error || 'Failed to process email'
      }, 500, req)
    }

    return jsonResponse({
      success: true,
      message: 'Email successfully processed and postcard created',
      postcard: result.result
    }, 200, req)
  } catch (error) {
    logger.error('Error processing email webhook', { error })
    return jsonResponse({
      success: false,
      error: 'Internal server error processing webhook'
    }, 500, req)
  }
}

export async function handleWebhookHealth(_req: Request): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    service: 'email-webhook',
    timestamp: new Date().toISOString()
  }, 200, _req)
}
