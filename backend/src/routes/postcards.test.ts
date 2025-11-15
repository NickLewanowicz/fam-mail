import { describe, it, expect } from 'bun:test'
import { handlePostcardCreate } from './postcards'

describe('handlePostcardCreate', () => {
  it('should validate required address fields', async () => {
    const req = new Request('http://localhost/api/postcards', {
      method: 'POST',
      body: JSON.stringify({ to: {}, frontHTML: '<html>Test</html>' }),
    })

    const response = await handlePostcardCreate(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required address fields')
  })

  it('should require at least frontHTML or backHTML', async () => {
    const req = new Request('http://localhost/api/postcards', {
      method: 'POST',
      body: JSON.stringify({
        to: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'Ottawa',
          provinceOrState: 'ON',
          postalOrZip: 'K1A 0B1',
          countryCode: 'CA',
        },
      }),
    })

    const response = await handlePostcardCreate(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('frontHTML or backHTML')
  })
})
