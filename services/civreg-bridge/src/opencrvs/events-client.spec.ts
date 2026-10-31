import { toRegisterAcceptPayload } from './events-client'

describe('toRegisterAcceptPayload', () => {
  it('does not copy annotation or other stored action fields', () => {
    const pending = {
      type: 'REGISTER',
      id: 'act-1',
      status: 'Requested',
      annotation: {
        'review.comment': 'Approved',
        'review.signature': { path: 'events/x/sig.png' }
      },
      createdBy: 'user-1',
      createdByRole: 'nimc_civreg_registrar'
    }

    const body = toRegisterAcceptPayload({
      eventId: 'evt-1',
      actionId: 'act-1',
      transactionId: 'txn-1',
      registrationNumber: 'ABC123XYZ000'
    })

    expect(body).toEqual({
      type: 'REGISTER',
      eventId: 'evt-1',
      actionId: 'act-1',
      transactionId: 'txn-1',
      registrationNumber: 'ABC123XYZ000'
    })
    expect(JSON.stringify(body)).not.toContain('review.comment')
    expect(JSON.stringify(body)).not.toContain('review.signature')
    expect(JSON.stringify(body)).not.toContain(pending.createdBy)
  })
})
