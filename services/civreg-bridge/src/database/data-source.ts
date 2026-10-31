import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { AuditLogEntity } from './entities/audit-log.entity'
import { DeceasedStatusRequestEntity } from './entities/deceased-status-request.entity'
import { OutboxEntity } from './entities/outbox.entity'
import { RequestEntity } from './entities/request.entity'
import { InitRequestsAndAuditLog1700000000001 } from './migrations/1700000000001-InitRequestsAndAuditLog'
import { AddRequestStatus1700000000002 } from './migrations/1700000000002-AddRequestStatus'
import { DeceasedAndOutbox1700000000003 } from './migrations/1700000000003-DeceasedAndOutbox'

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://civreg:civreg@localhost:5433/civreg'

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [
    RequestEntity,
    AuditLogEntity,
    DeceasedStatusRequestEntity,
    OutboxEntity
  ],
  migrations: [
    InitRequestsAndAuditLog1700000000001,
    AddRequestStatus1700000000002,
    DeceasedAndOutbox1700000000003
  ],
  synchronize: false
})
