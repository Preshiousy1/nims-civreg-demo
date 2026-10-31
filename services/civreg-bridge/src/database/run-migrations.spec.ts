import { runMigrationsWithRetry } from './run-migrations'

describe('runMigrationsWithRetry', () => {
  it('retries until postgres accepts the connection', async () => {
    const dataSource = {
      isInitialized: false,
      initialize: jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockImplementation(async () => {
          dataSource.isInitialized = true
        }),
      runMigrations: jest.fn().mockResolvedValue([]),
      destroy: jest.fn().mockImplementation(async () => {
        dataSource.isInitialized = false
      })
    }
    await runMigrationsWithRetry(dataSource, {
      attempts: 3,
      delayMs: 1,
      sleep: async () => undefined
    })
    expect(dataSource.initialize).toHaveBeenCalledTimes(2)
    expect(dataSource.runMigrations).toHaveBeenCalledTimes(1)
    expect(dataSource.destroy).toHaveBeenCalledTimes(1)
  })
})
