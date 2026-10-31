export type StubEnv = {
  port: number
  failNinRequests: boolean
  failDeceasedStatus: boolean
  delayMs: number
  ready: boolean
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback
  }
  return value === 'true' || value === '1'
}

export function loadEnv(): StubEnv {
  return {
    port: Number(process.env.PORT ?? 3041),
    failNinRequests: bool(process.env.STUB_FAIL_NIN_REQUESTS, false),
    failDeceasedStatus: bool(process.env.STUB_FAIL_DECEASED_STATUS, false),
    delayMs: Number(process.env.STUB_DELAY_MS ?? 0),
    ready: bool(process.env.STUB_READY, true)
  }
}
