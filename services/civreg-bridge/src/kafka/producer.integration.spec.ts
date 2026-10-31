import { Kafka } from 'kafkajs'
import { randomUUID } from 'crypto'
import {
  createKafkaProducer,
  publishBirthRegistered,
  REGISTRY_TOPIC
} from './producer'

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((item) => item.trim())
  .filter((item) => item.length > 0)

describe('kafka producer against local broker', () => {
  it('round-trips a birth registered envelope', async () => {
    const eventId = `it-${randomUUID()}`
    const producer = createKafkaProducer({
      brokers,
      clientId: `civreg-bridge-it-${eventId}`
    })
    await producer.connect()

    const consumer = new Kafka({
      clientId: `civreg-bridge-it-consumer-${eventId}`,
      brokers
    }).consumer({ groupId: `civreg-bridge-it-${eventId}` })
    await consumer.connect()
    await consumer.subscribe({ topic: REGISTRY_TOPIC, fromBeginning: true })

    const seen = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('timed out waiting for kafka message')),
        15000
      )
      void consumer.run({
        eachMessage: async ({ message }) => {
          if (message.key?.toString() === eventId && message.value) {
            clearTimeout(timer)
            resolve(message.value.toString())
          }
        }
      })
    })

    await publishBirthRegistered(
      {
        eventId,
        actionId: 'act-it',
        ninRequestId: 'nin-it',
        nin: '00000000001'
      },
      producer
    )

    const raw = await seen
    const parsed = JSON.parse(raw) as { type: string; subject: string; data: { demo: boolean } }
    expect(parsed.type).toBe('civreg.birth.registered.v1')
    expect(parsed.subject).toBe(eventId)
    expect(parsed.data.demo).toBe(true)

    await consumer.disconnect()
    await producer.disconnect()
  }, 20000)
})
