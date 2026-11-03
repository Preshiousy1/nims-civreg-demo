import { MigrationInterface, QueryRunner } from 'typeorm'

export class Section2Hardening1700000000004 implements MigrationInterface {
  name = 'Section2Hardening1700000000004'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "requests"
        ADD COLUMN IF NOT EXISTS "registration_number" character varying(32),
        ADD COLUMN IF NOT EXISTS "accept_transaction_id" character varying(64),
        ADD COLUMN IF NOT EXISTS "nin_request_id" character varying(100),
        ADD COLUMN IF NOT EXISTS "issued_nin" character varying(16)
    `)
    await queryRunner.query(`
      ALTER TABLE "deceased_status_requests"
        ADD COLUMN IF NOT EXISTS "stub_done" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "core_done" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "maker_staff_id" character varying(100)
    `)
    await queryRunner.query(`
      ALTER TABLE "deceased_status_requests"
        ALTER COLUMN "nin" DROP DEFAULT
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deceased_status_requests"
        ALTER COLUMN "nin" SET DEFAULT '00000000000'
    `)
    await queryRunner.query(`
      ALTER TABLE "deceased_status_requests"
        DROP COLUMN IF EXISTS "maker_staff_id",
        DROP COLUMN IF EXISTS "core_done",
        DROP COLUMN IF EXISTS "stub_done"
    `)
    await queryRunner.query(`
      ALTER TABLE "requests"
        DROP COLUMN IF EXISTS "issued_nin",
        DROP COLUMN IF EXISTS "nin_request_id",
        DROP COLUMN IF EXISTS "accept_transaction_id",
        DROP COLUMN IF EXISTS "registration_number"
    `)
  }
}
