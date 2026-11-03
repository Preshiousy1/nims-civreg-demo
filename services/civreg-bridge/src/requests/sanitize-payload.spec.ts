import { sanitizeRequestPayload } from './sanitize-payload'

describe('sanitizeRequestPayload', () => {
  it('drops declaration fields that hold PII', () => {
    const cleaned = sanitizeRequestPayload({
      eventType: 'birth',
      action: {
        type: 'REGISTER',
        id: 'act-1',
        createdBy: 'user-1',
        createdByRole: 'nimc_civreg_registrar',
        declaration: {
          'child.name': { firstname: 'Ada' },
          'mother.nin': '00012345678'
        },
        annotation: { 'review.comment': 'ok' }
      }
    })
    expect(cleaned).toEqual({
      eventType: 'birth',
      action: {
        type: 'REGISTER',
        id: 'act-1',
        createdBy: 'user-1',
        createdByRole: 'nimc_civreg_registrar'
      }
    })
    expect(JSON.stringify(cleaned)).not.toContain('Ada')
    expect(JSON.stringify(cleaned)).not.toContain('00012345678')
  })
})
