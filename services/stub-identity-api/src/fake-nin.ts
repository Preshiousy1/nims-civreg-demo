import { createHash } from 'crypto'

/**
 * DEMO fake NIN. Always 11 digits, always starts with 000.
 * Deterministic from requestId so GET is stable. Not a real National Identification Number.
 */
export function fakeNin(requestId: string): string {
  const digest = createHash('sha256').update(`DEMO-NIN:${requestId}`).digest('hex')
  const n = parseInt(digest.slice(0, 8), 16) % 100_000_000
  return `000${n.toString().padStart(8, '0')}`
}
