import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../notification/constant', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../notification/constant')>()
  return {
    ...actual,
    INFOBIP_API_KEY: 'mock_api_key',
    INFOBIP_GATEWAY_ENDPOINT: 'https://gateway.infobip.com',
    INFOBIP_SENDER_ID: 'mock_sender'
  }
})

vi.mock('node-fetch', () => {
  return {
    default: vi.fn()
  }
})

import fetch from 'node-fetch'
import { SERVICE_USER_ID } from '@opencrvs/toolkit/authentication'
import { ActionType } from '@opencrvs/toolkit/events'
import { createServer } from '../../index'
import { informantNotificationTestData } from '../notification/testData'

const birthRegister = informantNotificationTestData.find(
  (row) => row.eventType === 'birth' && row.actionType === ActionType.REGISTER
)!

describe('birth and death REGISTER interception', () => {
  let server: Awaited<ReturnType<typeof createServer>>

  beforeEach(async () => {
    process.env.CIVREG_BRIDGE_URL = 'http://civreg-bridge.test'
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string) => {
        if (String(url).includes('/intercept/register')) {
          return {
            ok: true,
            status: 202,
            json: async () => ({ created: true }),
            text: async () => ''
          }
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => 'mock-public-key'
        }
      }
    )
    server = await createServer()
  })

  it('forwards birth REGISTER to the bridge and answers 202', async () => {
    const response = await server.server.inject({
      method: 'POST',
      url: `/trigger/events/birth/actions/${ActionType.REGISTER}`,
      payload: birthRegister.eventDocument,
      auth: {
        strategy: 'jwt',
        credentials: { sub: SERVICE_USER_ID },
        artifacts: { token: 'must-not-be-used-for-accept' }
      }
    })

    expect(response.statusCode).toBe(202)
    const interceptCall = (
      fetch as unknown as ReturnType<typeof vi.fn>
    ).mock.calls.find((call) =>
      String(call[0]).includes('/intercept/register')
    ) as [string, { method: string; body: string }]
    expect(interceptCall).toBeTruthy()
    const [url, init] = interceptCall
    expect(url).toBe('http://civreg-bridge.test/intercept/register')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body) as {
      eventId: string
      actionId: string
      kind: string
    }
    expect(body.eventId).toBe(birthRegister.eventDocument.id)
    expect(body.kind).toBe('birth_nin')
    expect(body.actionId).toBeTruthy()
  })

  it('answers 503 when the bridge is down so core can retry', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (url: string) => {
        if (String(url).includes('/intercept/register')) {
          throw new Error('connect ECONNREFUSED')
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => 'mock-public-key'
        }
      }
    )

    const response = await server.server.inject({
      method: 'POST',
      url: `/trigger/events/birth/actions/${ActionType.REGISTER}`,
      payload: birthRegister.eventDocument,
      auth: {
        strategy: 'jwt',
        credentials: { sub: SERVICE_USER_ID },
        artifacts: { token: 'must-not-be-used-for-accept' }
      }
    })

    expect(response.statusCode).toBe(503)
  })
})
