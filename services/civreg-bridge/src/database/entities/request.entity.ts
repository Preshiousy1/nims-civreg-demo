import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

@Entity({ name: 'requests' })
export class RequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'idempotency_key', type: 'varchar', length: 200, unique: true })
  idempotencyKey!: string

  @Column({ name: 'event_id', type: 'varchar', length: 100 })
  eventId!: string

  @Column({ name: 'action_id', type: 'varchar', length: 100 })
  actionId!: string

  @Column({ type: 'varchar', length: 64 })
  kind!: string

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: 'pending' | 'accepted' | 'rejected'

  @Column({ name: 'registration_number', type: 'varchar', length: 32, nullable: true })
  registrationNumber!: string | null

  @Column({
    name: 'accept_transaction_id',
    type: 'varchar',
    length: 64,
    nullable: true
  })
  acceptTransactionId!: string | null

  @Column({ name: 'nin_request_id', type: 'varchar', length: 100, nullable: true })
  ninRequestId!: string | null

  @Column({ name: 'issued_nin', type: 'varchar', length: 16, nullable: true })
  issuedNin!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date
}
