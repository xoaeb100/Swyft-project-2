import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatementStorage1790669508200 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "statements"
      ADD COLUMN "source_file_name" varchar(255)
    `);

    await queryRunner.query(`
      ALTER TABLE "statements"
      ADD COLUMN "storage_path" varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "statements"
      DROP COLUMN "storage_path"
    `);

    await queryRunner.query(`
      ALTER TABLE "statements"
      DROP COLUMN "source_file_name"
    `);
  }
}
