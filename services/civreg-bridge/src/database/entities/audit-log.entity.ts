import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'audit_log' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'bigint' })
  sequence!: string

  @Column({ name: 'prev_hash', type: 'char', length: 64 })
  prevHash!: string

  @Column({ name: 'row_hash', type: 'char', length: 64 })
  rowHash!: string

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType!: string

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId!: string

  @Column({ type: 'varchar', length: 64 })
  action!: string

  @Column({ name: 'actor_id', type: 'varchar', length: 100 })
  actorId!: string

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date
}
