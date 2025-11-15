import { marked } from 'marked'
import { postgridService } from '../services/postgrid'
import type { PostGridPostcardRequest } from '../types/postgrid'

export async function handlePostcardCreate(req: Request): Promise<Response> {
  try {
    const body = await req.json() as {
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
      frontHTML?: string
      backHTML?: string
      message?: string
      size?: string
    }
    const { to, frontHTML, backHTML, message, size = '6x4' } = body

    if (!to || !to.firstName || !to.lastName || !to.addressLine1 || !to.city || !to.provinceOrState || !to.postalOrZip || !to.countryCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required address fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!frontHTML && !backHTML && !message) {
      return new Response(
        JSON.stringify({ error: 'At least one of frontHTML, backHTML, or message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!postgridService) {
      return new Response(
        JSON.stringify({
          error: 'PostGrid service not configured. Please set POSTGRID_TEST_KEY or POSTGRID_PROD_KEY environment variable.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    let finalBackHTML = backHTML

    if (message) {
      const messageHTML = await marked(message)
      finalBackHTML = `
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
            .message h1 { font-size: 36px; margin-bottom: 16px; }
            .message h2 { font-size: 32px; margin-bottom: 14px; }
            .message h3 { font-size: 28px; margin-bottom: 12px; }
            .message p { margin-bottom: 12px; }
            .message strong { font-weight: bold; }
            .message em { font-style: italic; }
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

    const postcardRequest: PostGridPostcardRequest = {
      to,
      size: size as '6x4' | '9x6' | '11x6',
      frontHTML,
      backHTML: finalBackHTML,
    }

    const result = await postgridService.createPostcard(postcardRequest)

    return new Response(
      JSON.stringify({
        success: true,
        postcard: result,
        testMode: postgridService.getTestMode(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error: unknown) {
    const status = (error as { status?: number }).status || 500
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as { message?: string }).message || 'Failed to create postcard',
        details: (error as { error?: unknown }).error,
      }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
}
