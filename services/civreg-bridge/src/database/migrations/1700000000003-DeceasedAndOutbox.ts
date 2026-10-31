import { MigrationInterface, QueryRunner } from 'typeorm'

export class DeceasedAndOutbox1700000000003 implements MigrationInterface {
  name = 'DeceasedAndOutbox1700000000003'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS deceased_status_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id varchar(100) NOT NULL UNIQUE,
        event_id varchar(100) NOT NULL,
        action_id varchar(100) NOT NULL,
        maker_id varchar(100) NOT NULL,
        status varchar(32) NOT NULL,
        nin varchar(16) NOT NULL DEFAULT '00000000000',
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        topic varchar(200) NOT NULL,
        key varchar(200) NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS outbox_unpublished_idx ON outbox (created_at) WHERE published_at IS NULL`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS outbox`)
    await queryRunner.query(`DROP TABLE IF EXISTS deceased_status_requests`)
  }
}
