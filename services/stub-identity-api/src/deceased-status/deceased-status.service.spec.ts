import { ServiceUnavailableException } from '@nestjs/common'
import { DeceasedStatusService } from './deceased-status.service'

describe('DeceasedStatusService', () => {
  afterEach(() => {
    delete process.env.STUB_FAIL_DECEASED_STATUS
    delete process.env.STUB_DELAY_MS
  })

  it('stores a deceased-status event and a reversal', async () => {
    const service = new DeceasedStatusService()
    const event = await service.recordEvent({
      nin: '00012345678',
      eventId: 'death-1'
    })
    expect(event.type).toBe('deceased-status')
    expect(event.demo).toBe(true)

    const reversal = await service.recordReversal({
      nin: '00012345678',
      reason: 'recorded in error',
      eventId: 'death-1'
    })
    expect(reversal.type).toBe('deceased-status-reversal')
    expect(reversal.reason).toBe('recorded in error')
    expect(service.get(event.id)?.id).toBe(event.id)
  })

  it('throws when STUB_FAIL_DECEASED_STATUS is set', async () => {
    process.env.STUB_FAIL_DECEASED_STATUS = 'true'
    const service = new DeceasedStatusService()
    await expect(
      service.recordEvent({ nin: '00012345678' })
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
