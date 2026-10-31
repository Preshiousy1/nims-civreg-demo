import {
  buildBirthRegisteredEnvelope,
  createKafkaProducer,
  publishBirthRegistered,
  REGISTRY_TOPIC
} from './producer'

const send = jest.fn()
const connect = jest.fn()
const disconnect = jest.fn()

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: () => ({
      connect,
      send,
      disconnect
    })
  }))
}))

describe('createKafkaProducer', () => {
  const logs: string[] = []

  beforeEach(() => {
    logs.length = 0
    jest.clearAllMocks()
    send.mockResolvedValue(undefined)
    connect.mockResolvedValue(undefined)
    disconnect.mockResolvedValue(undefined)
  })

  it('refuses an empty broker list', () => {
    expect(() => createKafkaProducer({ brokers: [] })).toThrow(/KAFKA_BROKERS/)
  })

  it('sends with eventId as the key and logs topic+key only', async () => {
    const producer = createKafkaProducer({
      brokers: ['broker:19092'],
      log: (line) => logs.push(line)
    })
    await producer.connect()
    await producer.send({
      topic: REGISTRY_TOPIC,
      key: 'evt-1',
      value: { nin: '00011111111', demo: true }
    })

    expect(send).toHaveBeenCalledWith({
      topic: REGISTRY_TOPIC,
      messages: [
        {
          key: 'evt-1',
          value: JSON.stringify({ nin: '00011111111', demo: true })
        }
      ]
    })
    expect(logs.join('\n')).toContain(`topic=${REGISTRY_TOPIC}`)
    expect(logs.join('\n')).toContain('key=evt-1')
    expect(logs.join('\n')).not.toContain('00011111111')
  })

  it('wraps send errors with topic and key, not the payload', async () => {
    send.mockRejectedValue(new Error('broker down'))
    const producer = createKafkaProducer({
      brokers: ['broker:19092'],
      log: (line) => logs.push(line)
    })
    await expect(
      producer.send({
        topic: REGISTRY_TOPIC,
        key: 'evt-9',
        value: { nin: '00099999999' }
      })
    ).rejects.toThrow(/topic=civreg.registry.events.v1 key=evt-9/)
    expect(logs.join('\n')).not.toContain('00099999999')
  })
})

describe('buildBirthRegisteredEnvelope', () => {
  it('marks the NIN as demo and uses eventId as subject', () => {
    const envelope = buildBirthRegisteredEnvelope({
      eventId: 'evt-1',
      actionId: 'act-1',
      ninRequestId: 'nin-1',
      nin: '00011111111',
      time: '2026-10-31T08:00:00.000Z',
      id: 'msg-1'
    })
    expect(envelope).toEqual({
      specversion: '1.0',
      id: 'msg-1',
      source: 'civreg-bridge',
      type: 'civreg.birth.registered.v1',
      time: '2026-10-31T08:00:00.000Z',
      subject: 'evt-1',
      data: {
        eventId: 'evt-1',
        actionId: 'act-1',
        ninRequestId: 'nin-1',
        nin: '00011111111',
        demo: true
      }
    })
  })
})

describe('publishBirthRegistered', () => {
  it('publishes to the registry topic keyed by eventId', async () => {
    const sendFn = jest.fn().mockResolvedValue(undefined)
    await publishBirthRegistered(
      {
        eventId: 'evt-1',
        actionId: 'act-1',
        ninRequestId: 'nin-1',
        nin: '00011111111'
      },
      {
        connect: jest.fn(),
        send: sendFn,
        disconnect: jest.fn()
      }
    )
    expect(sendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: REGISTRY_TOPIC,
        key: 'evt-1'
      })
    )
  })
})
