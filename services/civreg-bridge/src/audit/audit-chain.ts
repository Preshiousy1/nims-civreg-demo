import { createHash } from 'crypto'

export const GENESIS_HASH = '0'.repeat(64)

export type AuditChainInput = {
  prevHash: string
  sequence: number
  entityType: string
  entityId: string
  action: string
  actorId: string
  payload: string
  createdAt: string
}

export type AuditChainRow = AuditChainInput & {
  rowHash: string
}

export function canonicalPayload(payload: unknown): string {
  return JSON.stringify(sortValue(payload))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortValue(record[key])
    }
    return sorted
  }
  return value
}

export function computeRowHash(input: AuditChainInput): string {
  const material = [
    input.prevHash,
    String(input.sequence),
    input.entityType,
    input.entityId,
    input.action,
    input.actorId,
    input.payload,
    input.createdAt
  ].join('|')
  return createHash('sha256').update(material).digest('hex')
}

export type ChainCheck =
  | { ok: true }
  | { ok: false; index: number; reason: string }

export function verifyChain(rows: AuditChainRow[]): ChainCheck {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const expectedPrev = i === 0 ? GENESIS_HASH : rows[i - 1].rowHash
    if (row.prevHash !== expectedPrev) {
      return {
        ok: false,
        index: i,
        reason: `prevHash mismatch at sequence ${row.sequence}`
      }
    }
    const expectedHash = computeRowHash(row)
    if (row.rowHash !== expectedHash) {
      return {
        ok: false,
        index: i,
        reason: `rowHash mismatch at sequence ${row.sequence}`
      }
    }
    if (i > 0 && row.sequence <= rows[i - 1].sequence) {
      return {
        ok: false,
        index: i,
        reason: `sequence not increasing at ${row.sequence}`
      }
    }
  }
  return { ok: true }
}
