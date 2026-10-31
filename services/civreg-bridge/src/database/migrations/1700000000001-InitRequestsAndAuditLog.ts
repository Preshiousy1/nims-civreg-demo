import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitRequestsAndAuditLog1700000000001 implements MigrationInterface {
  name = 'InitRequestsAndAuditLog1700000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        idempotency_key varchar(200) NOT NULL UNIQUE,
        event_id varchar(100) NOT NULL,
        action_id varchar(100) NOT NULL,
        kind varchar(64) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence bigint NOT NULL UNIQUE,
        prev_hash char(64) NOT NULL,
        row_hash char(64) NOT NULL,
        entity_type varchar(64) NOT NULL,
        entity_id varchar(100) NOT NULL,
        action varchar(64) NOT NULL,
        actor_id varchar(100) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL
      )
    `)
    await queryRunner.query(
      `CREATE INDEX audit_log_sequence_idx ON audit_log (sequence)`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`)
    await queryRunner.query(`DROP TABLE IF EXISTS requests`)
  }
}
