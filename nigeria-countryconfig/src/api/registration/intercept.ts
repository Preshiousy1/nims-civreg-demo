import * as Hapi from '@hapi/hapi'
import fetch from 'node-fetch'
import { EventDocument, getPendingAction } from '@opencrvs/toolkit/events'
import { logger } from '@countryconfig/logger'
import { env } from '@countryconfig/environment'
import { ActionConfirmationRequest } from './index'

function bridgeBaseUrl(): string {
  return (process.env.CIVREG_BRIDGE_URL || env.CIVREG_BRIDGE_URL).replace(
    /\/$/,
    ''
  )
}

function interceptSecret(): string {
  return (
    process.env.CIVREG_BRIDGE_INTERCEPT_SECRET ||
    env.CIVREG_BRIDGE_INTERCEPT_SECRET ||
    ''
  )
}

/**
 * Birth and death REGISTER: forward to civreg-bridge and answer 202.
 * Core retries until it gets 2xx. Do not use the trigger token for accept/reject.
 */
export async function onInterceptedRegisterHandler(
  request: ActionConfirmationRequest,
  h: Hapi.ResponseToolkit
) {
  const event = request.payload as EventDocument
  const action = getPendingAction(event.actions)
  const eventId = event.id
  const actionId = action.id
  const bridgeUrl = bridgeBaseUrl()

  if (!bridgeUrl) {
    logger.warn(
      { eventId, actionId },
      'civreg-bridge URL is not set, cannot intercept REGISTER'
    )
    return h.response({ error: 'bridge not configured' }).code(503)
  }

  try {
    const secret = interceptSecret()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (secret) {
      headers['x-civreg-intercept-secret'] = secret
    }

    const res = await fetch(`${bridgeUrl}/intercept/register`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        eventId,
        actionId,
        kind: event.type === 'birth' ? 'birth_nin' : 'death_register',
        actorId: action.createdBy,
        payload: {
          eventType: event.type,
          action
        }
      }),
      timeout: 5000
    })

    if (!res.ok) {
      logger.warn(
        { eventId, actionId, status: res.status },
        'civreg-bridge forward failed'
      )
      return h.response({ error: 'bridge unavailable' }).code(503)
    }

    logger.info(
      { eventId, actionId },
      'REGISTER forwarded to civreg-bridge'
    )
    return h.response().code(202)
  } catch {
    logger.warn(
      { eventId, actionId },
      'civreg-bridge forward threw'
    )
    return h.response({ error: 'bridge unavailable' }).code(503)
  }
}
