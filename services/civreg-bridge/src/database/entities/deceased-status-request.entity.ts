import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

export type DeceasedStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVERSED'

@Entity({ name: 'deceased_status_requests' })
export class DeceasedStatusRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'request_id', type: 'varchar', length: 100, unique: true })
  requestId!: string

  @Column({ name: 'event_id', type: 'varchar', length: 100 })
  eventId!: string

  @Column({ name: 'action_id', type: 'varchar', length: 100 })
  actionId!: string

  @Column({ name: 'maker_id', type: 'varchar', length: 100 })
  makerId!: string

  @Column({ type: 'varchar', length: 32 })
  status!: DeceasedStatus

  @Column({ type: 'varchar', length: 16, default: '00000000000' })
  nin!: string

  @Column({ type: 'text', nullable: true })
  reason!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
