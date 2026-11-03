import { deterministicTransactionId } from './ids'

describe('deterministicTransactionId', () => {
  it('returns the same id for the same inputs', () => {
    const a = deterministicTransactionId('evt-1', 'act-1', 'accept')
    const b = deterministicTransactionId('evt-1', 'act-1', 'accept')
    expect(a).toBe(b)
  })

  it('differs for accept vs reject', () => {
    const accept = deterministicTransactionId('evt-1', 'act-1', 'accept')
    const reject = deterministicTransactionId('evt-1', 'act-1', 'reject')
    expect(accept).not.toBe(reject)
  })

  it('looks like a UUID', () => {
    const id = deterministicTransactionId('evt-1', 'act-1', 'accept')
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})
