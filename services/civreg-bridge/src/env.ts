export type BridgeEnv = {
  port: number
  databaseUrl: string
  runMigrations: boolean
  stubIdentityUrl: string
  stubRetryAttempts: number
  stubRetryDelayMs: number
  openCrvsTokenUrl: string
  openCrvsEventsUrl: string
  openCrvsClientId: string
  openCrvsClientSecret: string
  kafkaBrokers: string[]
  jwtSecret: string
  interceptSharedSecret: string
  reconcileOlderThanMs: number
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback
  }
  return value === 'true' || value === '1'
}

export function loadEnv(): BridgeEnv {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return {
    port: Number(process.env.PORT ?? 3042),
    databaseUrl,
    runMigrations: bool(process.env.RUN_MIGRATIONS, true),
    stubIdentityUrl: (process.env.STUB_IDENTITY_URL ?? 'http://localhost:3041').replace(
      /\/$/,
      ''
    ),
    stubRetryAttempts: Number(process.env.STUB_RETRY_ATTEMPTS ?? 3),
    stubRetryDelayMs: Number(process.env.STUB_RETRY_DELAY_MS ?? 200),
    openCrvsTokenUrl:
      process.env.OPENCRVS_TOKEN_URL ??
      'http://gateway.opencrvs.localhost/auth/token',
    openCrvsEventsUrl:
      process.env.OPENCRVS_EVENTS_URL ??
      'http://gateway.opencrvs.localhost/events',
    openCrvsClientId: process.env.OPENCRVS_CLIENT_ID ?? '',
    openCrvsClientSecret: process.env.OPENCRVS_CLIENT_SECRET ?? '',
    kafkaBrokers: (process.env.KAFKA_BROKERS ?? '')
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker.length > 0),
    jwtSecret: process.env.JWT_SECRET ?? '',
    interceptSharedSecret: process.env.INTERCEPT_SHARED_SECRET ?? '',
    reconcileOlderThanMs: Number(process.env.RECONCILE_OLDER_THAN_MS ?? 30_000)
  }
}
