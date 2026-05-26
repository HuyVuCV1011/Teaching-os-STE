import { describe, it, expect } from 'vitest'
import { signJWT, verifyJWT } from '../jwt'

const SECRET = 'test-secret-key-for-jwt-tests-123456'
const ALT_SECRET = 'different-secret-that-should-not-work-789'

describe('signJWT', () => {
  it('returns a string with three dot-separated parts', async () => {
    const token = await signJWT({ role: 'student', class_id: 'abc' }, SECRET)
    expect(token.split('.')).toHaveLength(3)
  })

  it('produces different tokens for different payloads', async () => {
    const token1 = await signJWT({ role: 'student' }, SECRET)
    const token2 = await signJWT({ role: 'admin' }, SECRET)
    expect(token1).not.toBe(token2)
  })
})

describe('verifyJWT', () => {
  it('returns the original payload for a valid token', async () => {
    const payload = { role: 'student', class_id: '123', class_code: 'ABC', student_email: 'test@test.com' }
    const token = await signJWT(payload, SECRET)
    const result = await verifyJWT(token, SECRET)
    expect(result).toMatchObject(payload)
  })

  it('returns null for a token signed with a different secret', async () => {
    const token = await signJWT({ role: 'student' }, SECRET)
    const result = await verifyJWT(token, ALT_SECRET)
    expect(result).toBeNull()
  })

  it('returns null for a tampered payload', async () => {
    const token = await signJWT({ role: 'student' }, SECRET)
    const parts = token.split('.')
    const tamperedPayload = btoa(JSON.stringify({ role: 'admin' }))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`
    const result = await verifyJWT(tampered, SECRET)
    expect(result).toBeNull()
  })

  it('returns null for a tampered signature', async () => {
    const token = await signJWT({ role: 'student' }, SECRET)
    const parts = token.split('.')
    const tampered = `${parts[0]}.${parts[1]}.invalidsignature`
    const result = await verifyJWT(tampered, SECRET)
    expect(result).toBeNull()
  })

  it('returns null for malformed token strings', async () => {
    expect(await verifyJWT('', SECRET)).toBeNull()
    expect(await verifyJWT('not-a-jwt', SECRET)).toBeNull()
    expect(await verifyJWT('a.b', SECRET)).toBeNull()
    expect(await verifyJWT('a.b.c.d', SECRET)).toBeNull()
  })

  it('handles numeric and boolean payload values', async () => {
    const payload = { count: 42, active: true, score: 95.5 }
    const token = await signJWT(payload, SECRET)
    const result = await verifyJWT(token, SECRET)
    expect(result).toMatchObject(payload)
  })

  it('handles array payload values', async () => {
    const payload = { roles: ['student', 'viewer'], tags: ['a', 'b', 'c'] }
    const token = await signJWT(payload, SECRET)
    const result = await verifyJWT(token, SECRET)
    expect(result).toMatchObject(payload)
  })

  it('rejects tokens with invalid base64url payload', async () => {
    const token = await signJWT({ test: true }, SECRET)
    const parts = token.split('.')
    // Replace payload with completely invalid base64url
    const badToken = `${parts[0]}.!!!invalid!!!.${parts[2]}`
    const result = await verifyJWT(badToken, SECRET)
    expect(result).toBeNull()
  })
})

describe('JWT round-trip', () => {
  it('sign then verify returns the exact payload', async () => {
    const original = { class_id: '42', class_code: 'STE2024', student_email: 'student@school.edu', role: 'student' }
    const token = await signJWT(original, SECRET)
    const decoded = await verifyJWT(token, SECRET)
    expect(decoded).toEqual(original)
  })
})

describe('edge cases', () => {
  it('handles empty object payload', async () => {
    const token = await signJWT({}, SECRET)
    const result = await verifyJWT(token, SECRET)
    expect(result).toEqual({})
  })

  it('verifies token with special characters in payload', async () => {
    const payload = { name: 'Nguyễn Văn A', email: 'test+filter@example.com' }
    const token = await signJWT(payload, SECRET)
    const result = await verifyJWT(token, SECRET)
    expect(result).toMatchObject(payload)
  })
})
