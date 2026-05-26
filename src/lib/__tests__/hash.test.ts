import { describe, it, expect } from 'vitest'
import { calculateFileHash } from '../hash'

/**
 * Helper to create a mock File object for testing.
 * Uses Blob and File which are available in Node.js 20+.
 */
function createMockFile(content: string, name = 'test.txt', mimeType = 'text/plain'): File {
  const blob = new Blob([content], { type: mimeType })
  return new File([blob], name, { type: mimeType })
}

describe('calculateFileHash', () => {
  it('returns a 16-character hex string', async () => {
    const hash = await calculateFileHash(createMockFile('hello world'))
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('is deterministic for identical content', async () => {
    const content = 'The quick brown fox jumps over the lazy dog'
    const hash1 = await calculateFileHash(createMockFile(content))
    const hash2 = await calculateFileHash(createMockFile(content))
    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different content', async () => {
    const hash1 = await calculateFileHash(createMockFile('content-A'))
    const hash2 = await calculateFileHash(createMockFile('content-B'))
    expect(hash1).not.toBe(hash2)
  })

  it('handles an empty file', async () => {
    const hash = await calculateFileHash(createMockFile(''))
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('is case-sensitive to content', async () => {
    const hash1 = await calculateFileHash(createMockFile('Hello'))
    const hash2 = await calculateFileHash(createMockFile('hello'))
    expect(hash1).not.toBe(hash2)
  })

  it('ignores filename when computing hash', async () => {
    const hash1 = await calculateFileHash(createMockFile('same content', 'file1.txt'))
    const hash2 = await calculateFileHash(createMockFile('same content', 'file2.txt'))
    expect(hash1).toBe(hash2)
  })

  it('handles large content', async () => {
    const largeContent = 'A'.repeat(100000)
    const hash = await calculateFileHash(createMockFile(largeContent))
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('handles binary-like content', async () => {
    const binary = '\x00\x01\x02\xff\xfe\xfd'
    const hash = await calculateFileHash(createMockFile(binary, 'binary.bin', 'application/octet-stream'))
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })
})
