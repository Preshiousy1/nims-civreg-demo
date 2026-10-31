import { ServiceUnavailableException } from '@nestjs/common'
import { fakeNin } from '../fake-nin'
import { NinRequestsService } from './nin-requests.service'

describe('NinRequestsService', () => {
  const envKeys = [
    'STUB_FAIL_NIN_REQUESTS',
    'STUB_FAIL_DECEASED_STATUS',
    'STUB_DELAY_MS',
    'STUB_READY'
  ]

  afterEach(() => {
    for (const key of envKeys) {
      delete process.env[key]
    }
  })

  it('POST is pending without a NIN; GET later issues a deterministic DEMO NIN', async () => {
    process.env.STUB_DELAY_MS = '0'
    const service = new NinRequestsService()
    const created = await service.create({
      eventId: 'evt-1',
      actionId: 'act-1'
    })
    expect(created.status).toBe('pending')
    expect(created.nin).toBeNull()
    expect(created.demo).toBe(true)

    const issued = service.get(created.requestId)
    expect(issued.status).toBe('issued')
    expect(issued.nin).toBe(fakeNin(created.requestId))
    expect(issued.nin).toMatch(/^000\d{8}$/)
    expect(service.get(created.requestId).nin).toBe(issued.nin)
  })

  it('throws when STUB_FAIL_NIN_REQUESTS is set', async () => {
    process.env.STUB_FAIL_NIN_REQUESTS = 'true'
    const service = new NinRequestsService()
    await expect(
      service.create({ eventId: 'evt-1', actionId: 'act-1' })
    ).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})

describe('fakeNin', () => {
  it('is 11 digits, prefix 000, stable for the same id', () => {
    expect(fakeNin('abc')).toBe(fakeNin('abc'))
    expect(fakeNin('abc')).not.toBe(fakeNin('def'))
    expect(fakeNin('abc')).toMatch(/^000\d{8}$/)
  })
})
