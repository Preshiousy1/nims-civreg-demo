import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'outbox' })
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 200 })
  topic!: string

  @Column({ type: 'varchar', length: 200 })
  key!: string

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null
}
