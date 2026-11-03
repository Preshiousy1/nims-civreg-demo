import { PendingRequestReconciler } from './pending-request.reconciler'
import { RequestsService } from '../requests/requests.service'
import { InterceptService } from './intercept.service'

describe('PendingRequestReconciler', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://civreg:civreg@localhost:5433/civreg'
    process.env.RECONCILE_OLDER_THAN_MS = '30000'
  })

  it('calls resolve for each old pending birth request', async () => {
    const requests = {
      listPendingBirthOlderThan: jest.fn().mockResolvedValue([
        { id: 'req-1', eventId: 'evt-1', actionId: 'act-1' },
        { id: 'req-2', eventId: 'evt-2', actionId: 'act-2' }
      ])
    }
    const intercept = {
      resolve: jest.fn().mockResolvedValue('accepted')
    }
    const reconciler = new PendingRequestReconciler(
      requests as unknown as RequestsService,
      intercept as unknown as InterceptService
    )
    await expect(reconciler.tick()).resolves.toBe(2)
    expect(requests.listPendingBirthOlderThan).toHaveBeenCalledWith(30000)
    expect(intercept.resolve).toHaveBeenCalledWith('req-1')
    expect(intercept.resolve).toHaveBeenCalledWith('req-2')
  })
})
