import { describe, it, expect, beforeEach } from 'bun:test'
import { handlePostcardCreate } from './postcards'
import type { User } from '../models/user'
import { Database } from '../database'

const mockUser: User = {
  id: 'test-user-id',
  oidcSub: 'test-oidc-sub',
  oidcIssuer: 'https://accounts.google.com',
  email: 'test@example.com',
  emailVerified: true,
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('handlePostcardCreate', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  it('should validate required address fields', async () => {
    const req = new Request('http://localhost/api/postcards', {
      method: 'POST',
      body: JSON.stringify({ to: {}, frontHTML: '<html>Test</html>' }),
    })

    const response = await handlePostcardCreate(req, mockUser, db)
    const data = await response.json() as { error?: string; errors?: Array<{ field: string; message: string }> }

    expect(response.status).toBe(400)
    expect(data.error).toContain('Validation failed')
    expect(data.errors).toBeDefined()
    expect(data.errors!.length).toBeGreaterThan(0)
  })

  it('should require at least frontHTML, backHTML, or message', async () => {
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

    const response = await handlePostcardCreate(req, mockUser, db)
    const data = await response.json() as { error?: string; errors?: Array<{ field: string; message: string }> }

    expect(response.status).toBe(400)
    expect(data.error).toContain('Validation failed')
    expect(data.errors).toBeDefined()
    expect(data.errors!.some(e => e.message.includes('frontHTML, backHTML, or message'))).toBe(true)
  })

  it('should accept message as markdown', async () => {
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
        frontHTML: '<html>Front</html>',
        message: '**Hello** _world_',
      }),
    })

    const response = await handlePostcardCreate(req, mockUser, db)
    expect(response.status).not.toBe(400)
  })
})
