export type NinIssue = {
  requestId: string
  status: string
  nin: string | null
}

async function readJson(res: Response): Promise<unknown> {
  return res.json()
}

export async function requestNin(
  stubBaseUrl: string,
  eventId: string,
  actionId: string
): Promise<NinIssue> {
  const res = await fetch(`${stubBaseUrl}/nin-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, actionId })
  })
  if (!res.ok) {
    throw new Error(`stub nin-requests failed: ${res.status}`)
  }
  return (await readJson(res)) as NinIssue
}

export async function getNin(
  stubBaseUrl: string,
  requestId: string
): Promise<NinIssue> {
  const res = await fetch(`${stubBaseUrl}/nin-requests/${requestId}`)
  if (!res.ok) {
    throw new Error(`stub nin GET failed: ${res.status}`)
  }
  return (await readJson(res)) as NinIssue
}

export async function postDeceasedStatus(
  stubBaseUrl: string,
  eventId: string,
  nin: string,
  idempotencyKey: string
): Promise<void> {
  if (!nin) {
    throw new Error('deceased NIN is required')
  }
  const res = await fetch(`${stubBaseUrl}/deceased-status-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nin,
      eventId,
      reason: 'demo',
      idempotencyKey
    })
  })
  if (!res.ok) {
    throw new Error(`stub deceased-status failed: ${res.status}`)
  }
}

export async function postDeceasedReversal(
  stubBaseUrl: string,
  eventId: string,
  nin: string,
  reason: string
): Promise<void> {
  const res = await fetch(`${stubBaseUrl}/deceased-status-reversals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nin, eventId, reason })
  })
  if (!res.ok) {
    throw new Error(`stub deceased-status-reversal failed: ${res.status}`)
  }
}

export async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return
  }
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetries<T>(
  attempts: number,
  delayMs: number,
  fn: () => Promise<T>
): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      await sleep(delayMs)
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}
