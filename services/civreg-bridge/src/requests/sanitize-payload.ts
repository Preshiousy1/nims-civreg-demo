/**
 * Keep only ids needed to finish accept/reject. Do not store declaration PII
 * (names, NINs, addresses) in the bridge database.
 */
export function sanitizeRequestPayload(
  payload: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!payload) {
    return {}
  }
  const action = payload.action as Record<string, unknown> | undefined
  const out: Record<string, unknown> = {}
  if (typeof payload.eventType === 'string') {
    out.eventType = payload.eventType
  }
  if (action && typeof action === 'object') {
    const slim: Record<string, unknown> = {}
    for (const key of ['type', 'id', 'createdBy', 'createdByRole', 'createdAtLocation']) {
      if (action[key] !== undefined) {
        slim[key] = action[key]
      }
    }
    out.action = slim
  }
  if (typeof payload.makerStaffId === 'string') {
    out.makerStaffId = payload.makerStaffId
  }
  return out
}
