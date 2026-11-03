import { createHash } from 'crypto'

/**
 * Stable UUID-shaped id so OpenCRVS can recognise a retry of the same accept/reject.
 * Same eventId + actionId + kind always yields the same value.
 */
export function deterministicTransactionId(
  eventId: string,
  actionId: string,
  kind: 'accept' | 'reject'
): string {
  const hex = createHash('sha256')
    .update(`${eventId}:${actionId}:${kind}`)
    .digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-')
}
