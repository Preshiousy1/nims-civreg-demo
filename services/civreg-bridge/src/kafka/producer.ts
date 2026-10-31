import { randomUUID } from 'crypto'
import { Kafka } from 'kafkajs'
import { loadEnv } from '../env'

export const REGISTRY_TOPIC = 'civreg.registry.events.v1'
export const AUDIT_TOPIC = 'civreg.audit.v1'

export type KafkaSendInput = {
  topic: string
  key: string
  value: unknown
}

export type KafkaProducerWrapper = {
  connect: () => Promise<void>
  send: (input: KafkaSendInput) => Promise<void>
  disconnect: () => Promise<void>
}

type LogFn = (message: string) => void

/**
 * Thin Kafka producer: connect, send, errors.
 * Key is always the OpenCRVS eventId so one birth stays ordered.
 * Logs topic + key only. Never log value (may contain a DEMO NIN).
 */
export function createKafkaProducer(options: {
  brokers: string[]
  clientId?: string
  log?: LogFn
}): KafkaProducerWrapper {
  if (options.brokers.length === 0) {
    throw new Error('KAFKA_BROKERS is empty')
  }

  const log: LogFn = options.log ?? ((message) => {
    process.stdout.write(`${message}\n`)
  })

  const kafka = new Kafka({
    clientId: options.clientId ?? 'civreg-bridge',
    brokers: options.brokers
  })

  const producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5
  })

  return {
    async connect() {
      await producer.connect()
      log('kafka connected')
    },
    async send(input: KafkaSendInput) {
      try {
        await producer.send({
          topic: input.topic,
          messages: [
            {
              key: input.key,
              value: JSON.stringify(input.value)
            }
          ]
        })
        log(`kafka send ok topic=${input.topic} key=${input.key}`)
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : 'unknown'
        throw new Error(
          `kafka send failed topic=${input.topic} key=${input.key}: ${reason}`
        )
      }
    },
    async disconnect() {
      await producer.disconnect()
    }
  }
}

export function buildBirthRegisteredEnvelope(input: {
  eventId: string
  actionId: string
  ninRequestId: string
  nin: string
  time?: string
  id?: string
}): {
  specversion: '1.0'
  id: string
  source: 'civreg-bridge'
  type: 'civreg.birth.registered.v1'
  time: string
  subject: string
  data: {
    eventId: string
    actionId: string
    ninRequestId: string
    nin: string
    demo: true
  }
} {
  return {
    specversion: '1.0',
    id: input.id ?? randomUUID(),
    source: 'civreg-bridge',
    type: 'civreg.birth.registered.v1',
    time: input.time ?? new Date().toISOString(),
    subject: input.eventId,
    data: {
      eventId: input.eventId,
      actionId: input.actionId,
      ninRequestId: input.ninRequestId,
      nin: input.nin,
      demo: true
    }
  }
}

export function buildAuditAppendedEnvelope(input: {
  outboxId: string
  entityType: string
  entityId: string
  action: string
  sequence: string
  rowHash: string
  eventId?: string
  time?: string
}): {
  specversion: '1.0'
  id: string
  source: 'civreg-bridge'
  type: 'civreg.audit.appended.v1'
  time: string
  subject: string
  data: {
    entityType: string
    entityId: string
    action: string
    sequence: string
    rowHash: string
    demo: true
  }
} {
  return {
    specversion: '1.0',
    id: input.outboxId,
    source: 'civreg-bridge',
    type: 'civreg.audit.appended.v1',
    time: input.time ?? new Date().toISOString(),
    subject: input.eventId ?? input.entityId,
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      sequence: input.sequence,
      rowHash: input.rowHash,
      demo: true
    }
  }
}

export async function publishBirthRegistered(
  input: {
    eventId: string
    actionId: string
    ninRequestId: string
    nin: string
  },
  producer: KafkaProducerWrapper
): Promise<void> {
  await producer.send({
    topic: REGISTRY_TOPIC,
    key: input.eventId,
    value: buildBirthRegisteredEnvelope(input)
  })
}

let shared: KafkaProducerWrapper | undefined

export async function getSharedProducer(
  log?: LogFn
): Promise<KafkaProducerWrapper | null> {
  const brokers = loadEnv().kafkaBrokers
  if (brokers.length === 0) {
    return null
  }
  if (!shared) {
    shared = createKafkaProducer({ brokers, log })
    await shared.connect()
  }
  return shared
}

export function resetSharedProducer(): void {
  shared = undefined
}
