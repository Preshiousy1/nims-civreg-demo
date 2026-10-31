import {
  canonicalPayload,
  computeRowHash,
  GENESIS_HASH,
  verifyChain,
  type AuditChainRow
} from './audit-chain'

function row(
  sequence: number,
  prevHash: string,
  payload: unknown,
  createdAt = '2026-10-30T21:00:00.000Z'
): AuditChainRow {
  const input = {
    prevHash,
    sequence,
    entityType: 'request',
    entityId: 'req-1',
    action: 'persist',
    actorId: 'system',
    payload: canonicalPayload(payload),
    createdAt
  }
  return { ...input, rowHash: computeRowHash(input) }
}

describe('audit hash chain', () => {
  it('hashes the genesis row against 64 zeros', () => {
    const first = row(1, GENESIS_HASH, { eventId: 'e1' })
    expect(first.prevHash).toBe('0'.repeat(64))
    expect(first.rowHash).toHaveLength(64)
    expect(verifyChain([first])).toEqual({ ok: true })
  })

  it('links the second row to the first rowHash', () => {
    const first = row(1, GENESIS_HASH, { n: 1 })
    const second = row(2, first.rowHash, { n: 2 })
    expect(verifyChain([first, second])).toEqual({ ok: true })
  })

  it('detects a tampered payload', () => {
    const first = row(1, GENESIS_HASH, { n: 1 })
    const tampered: AuditChainRow = { ...first, payload: canonicalPayload({ n: 99 }) }
    const check = verifyChain([tampered])
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.reason).toMatch(/rowHash mismatch/)
    }
  })

  it('detects a broken prevHash link', () => {
    const first = row(1, GENESIS_HASH, { n: 1 })
    const second = row(2, 'a'.repeat(64), { n: 2 })
    const check = verifyChain([first, second])
    expect(check.ok).toBe(false)
    if (!check.ok) {
      expect(check.reason).toMatch(/prevHash mismatch/)
    }
  })

  it('canonicalPayload sorts object keys so hash is stable', () => {
    expect(canonicalPayload({ b: 1, a: 2 })).toBe(canonicalPayload({ a: 2, b: 1 }))
  })
})
