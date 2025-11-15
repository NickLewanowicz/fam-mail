import { postgridService } from '../services/postgrid'
import type { PostGridPostcardRequest } from '../types/postgrid'

export async function handlePostcardCreate(req: Request): Promise<Response> {
  try {
    if (!postgridService) {
      return new Response(
        JSON.stringify({ 
          error: 'PostGrid service not configured. Please set POSTGRID_TEST_KEY or POSTGRID_PROD_KEY environment variable.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const body = await req.json()
    const { to, frontHTML, backHTML, size = '4x6' } = body

    if (!to || !to.firstName || !to.lastName || !to.addressLine1 || !to.city || !to.provinceOrState || !to.postalOrZip || !to.countryCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required address fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    if (!frontHTML && !backHTML) {
      return new Response(
        JSON.stringify({ error: 'At least one of frontHTML or backHTML is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    const postcardRequest: PostGridPostcardRequest = {
      to,
      size,
      frontHTML,
      backHTML,
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
