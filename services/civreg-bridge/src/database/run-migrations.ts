import { AppDataSource } from './data-source'

export type MigrationDataSource = {
  isInitialized: boolean
  initialize: () => Promise<unknown>
  runMigrations: () => Promise<unknown>
  destroy: () => Promise<unknown>
}

export async function runMigrationsWithRetry(
  dataSource: MigrationDataSource,
  options?: {
    attempts?: number
    delayMs?: number
    sleep?: (ms: number) => Promise<void>
  }
): Promise<void> {
  const attempts = options?.attempts ?? 30
  const delayMs = options?.delayMs ?? 2000
  const sleep =
    options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize()
      }
      await dataSource.runMigrations()
      if (dataSource.isInitialized) {
        await dataSource.destroy()
      }
      return
    } catch (err) {
      last = err
      if (dataSource.isInitialized) {
        await dataSource.destroy().catch(() => undefined)
      }
      await sleep(delayMs)
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

async function main(): Promise<void> {
  await runMigrationsWithRetry(AppDataSource)
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
  })
}
