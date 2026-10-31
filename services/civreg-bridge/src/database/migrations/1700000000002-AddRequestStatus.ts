import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRequestStatus1700000000002 implements MigrationInterface {
  name = 'AddRequestStatus1700000000002'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS status varchar(32) NOT NULL DEFAULT 'pending'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE requests DROP COLUMN IF EXISTS status`)
  }
}
