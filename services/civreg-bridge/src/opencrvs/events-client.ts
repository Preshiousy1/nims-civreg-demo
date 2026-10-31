import { createClient } from '@opencrvs/toolkit/api'
import { randomBytes, randomUUID } from 'crypto'

const REG_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function generateRegistrationNumber(): string {
  const bytes = randomBytes(12)
  let out = ''
  for (const byte of bytes) {
    out += REG_ALPHABET[byte % REG_ALPHABET.length]
  }
  return out
}

/**
 * Core register.accept is ActionInput, not the stored ActionDocument.
 * Spreading the pending action sends annotation.review.* and Core
 * answers 400 Unexpected field.
 */
export function toRegisterAcceptPayload(input: {
  eventId: string
  actionId: string
  registrationNumber: string
  transactionId: string
}): {
  type: 'REGISTER'
  eventId: string
  actionId: string
  transactionId: string
  registrationNumber: string
} {
  return {
    type: 'REGISTER',
    eventId: input.eventId,
    actionId: input.actionId,
    transactionId: input.transactionId,
    registrationNumber: input.registrationNumber
  }
}

export async function acceptRegister(input: {
  eventsUrl: string
  token: string
  eventId: string
  actionId: string
}): Promise<void> {
  const client = createClient(input.eventsUrl, `Bearer ${input.token}`)
  await client.event.actions.register.accept.mutate(
    toRegisterAcceptPayload({
      eventId: input.eventId,
      actionId: input.actionId,
      transactionId: randomUUID(),
      registrationNumber: generateRegistrationNumber()
    })
  )
}

export async function rejectRegister(input: {
  eventsUrl: string
  token: string
  eventId: string
  actionId: string
}): Promise<void> {
  const client = createClient(input.eventsUrl, `Bearer ${input.token}`)
  await client.event.actions.register.reject.mutate({
    transactionId: randomUUID(),
    eventId: input.eventId,
    actionId: input.actionId
  })
}
