/**
 * Calculates the SHA-256 hex hash of a file.
 * This is edge-runtime compatible and uses standard Web Crypto APIs.
 */
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex.slice(0, 16) // use first 16 chars for cleaner file hashes in storage URLs
}
