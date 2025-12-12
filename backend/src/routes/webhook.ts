import { EmailService, type EmailData } from '../services/emailService'

// Security headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}

function addSecurityHeaders(response: Response): Response {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

function createJsonResponse(data: any, status: number = 200): Response {
  const response = new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    }
  )
  return addSecurityHeaders(response)
}

// Email service instance
const emailService = new EmailService()

// Handle SendGrid webhook format
function parseSendGridWebhook(body: any): EmailData | null {
  try {
    // SendGrid sends events array, we're interested in "delivered" events
    if (!Array.isArray(body) || body.length === 0) {
      return null
    }

    const event = body[0] // Process first event

    // Parse the email from SendGrid format
    if (event.event === 'delivered' && event.email) {
      return {
        from: event.email || '',
        to: [event.email || ''],
        subject: event.subject || 'No Subject',
        text: event.text || event.content?.text || '',
        html: event.html || event.content?.html,
        attachments: event.attachments || []
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
function parseGenericWebhook(body: any): EmailData | null {
  try {
    // Basic validation
    if (!body || typeof body !== 'object') {
      return null
    }

    return {
      from: body.from || body.sender || '',
      to: Array.isArray(body.to) ? body.to : [body.to || ''],
      subject: body.subject || '',
      text: body.text || body.plain || body.content || '',
      html: body.html || body.bodyHtml,
      attachments: body.attachments || []
    }
  } catch (error) {
    console.error('Error parsing generic webhook:', error)
    return null
  }
}

export async function handleEmailWebhook(req: Request): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || ''
    let emailData: EmailData | null = null

    // Parse based on content type
    if (contentType.includes('application/json')) {
      const body = await req.json()

      // Try different webhook formats
      emailData = parseSendGridWebhook(body) || parseGenericWebhook(body)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      const params = new URLSearchParams()

      // Convert FormData to URLSearchParams for parsing
      for (const [key, value] of formData.entries()) {
        params.append(key, value.toString())
      }

      emailData = parseMailgunWebhook(params)
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data (with attachments)
      const formData = await req.formData()

      // Extract fields from multipart data
      const from = formData.get('from')?.toString() || ''
      const to = formData.get('to')?.toString() || formData.get('recipient')?.toString() || ''
      const subject = formData.get('subject')?.toString() || ''
      const text = formData.get('text')?.toString() || formData.get('body-plain')?.toString() || ''
      const html = formData.get('html')?.toString() || formData.get('body-html')?.toString() || undefined

      // Extract attachments
      const attachments: Array<{ filename: string; contentType: string; data: string }> = []
      for (const [key, value] of formData.entries()) {
        if (value instanceof File && key.startsWith('attachment')) {
          const arrayBuffer = await value.arrayBuffer()
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

          attachments.push({
            filename: value.name,
            contentType: value.type,
            data: base64
          })
        }
      }

      emailData = {
        from,
        to: to.split(',').map(t => t.trim()).filter(t => t),
        subject,
        text,
        html,
        attachments
      }
    }

    if (!emailData) {
      return createJsonResponse({
        success: false,
        error: 'Unable to parse email data from webhook'
      }, 400)
    }

    // Validate the email data
    const validation = emailService.validateEmailData(emailData)
    if (!validation.isValid) {
      return createJsonResponse({
        success: false,
        error: 'Invalid email data',
        details: validation.errors
      }, 400)
    }

    // Process the email and create a postcard
    const result = await emailService.processEmail(emailData)

    if (!result.success) {
      return createJsonResponse({
        success: false,
        error: result.error || 'Failed to process email'
      }, 500)
    }

    return createJsonResponse({
      success: true,
      message: 'Email successfully processed and postcard created',
      postcard: result.result
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return createJsonResponse({
      success: false,
      error: 'Internal server error processing webhook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}

export async function handleWebhookHealth(req: Request): Promise<Response> {
  return createJsonResponse({
    status: 'healthy',
    service: 'email-webhook',
    timestamp: new Date().toISOString()
  })
}