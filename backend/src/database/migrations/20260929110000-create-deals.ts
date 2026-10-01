import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDeals20260929110000 implements MigrationInterface {
  name = 'CreateDeals20260929110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "deals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" varchar(255) NOT NULL,
        "type" varchar(20) NOT NULL DEFAULT 'consumer',
        "status" varchar(20) NOT NULL DEFAULT 'uploaded',
        "name" varchar(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deals_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_deals_type"
          CHECK ("type" IN ('consumer', 'commercial')),
        CONSTRAINT "CHK_deals_status"
          CHECK ("status" IN ('uploaded', 'parsed', 'checked', 'completed'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_deals_user_id"
      ON "deals" ("user_id")
    `);

    await queryRunner.query(`
  CREATE TABLE "statements" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "deal_id" uuid NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "format" varchar(20) NOT NULL,
    "reference" varchar(255),
    "submission_time" varchar(100),
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_statements_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_statements_deal"
      FOREIGN KEY ("deal_id")
      REFERENCES "deals"("id")
      ON DELETE CASCADE
  )
`);

    await queryRunner.query(`
  CREATE INDEX "IDX_statements_deal_id"
  ON "statements" ("deal_id")
`);

    await queryRunner.query(`
  CREATE TABLE "accounts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "statement_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "bank_name" varchar(255) NOT NULL,
    "account_holder" varchar(255) NOT NULL,
    "account_type" varchar(100) NOT NULL,
    "bsb" varchar(50) NOT NULL,
    "account_number" varchar(100) NOT NULL,
    "current_balance" numeric,
    "available_balance" numeric,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_accounts_statement"
      FOREIGN KEY ("statement_id")
      REFERENCES "statements"("id")
      ON DELETE CASCADE,
    CONSTRAINT "FK_accounts_deal"
      FOREIGN KEY ("deal_id")
      REFERENCES "deals"("id")
      ON DELETE CASCADE
  )
`);

    await queryRunner.query(`
  CREATE INDEX "IDX_accounts_deal_id"
  ON "accounts" ("deal_id")
`);

    await queryRunner.query(`
  CREATE TABLE "transactions" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "account_id" uuid NOT NULL,
    "deal_id" uuid NOT NULL,
    "user_id" varchar(255) NOT NULL,
    "date" date NOT NULL,
    "description" text NOT NULL,
    "amount" numeric NOT NULL,
    "balance" numeric,
    "type" varchar(50),
    "original_tags" jsonb NOT NULL DEFAULT '[]',
    "tag" varchar(255),
    "annotation" text,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_transactions_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_transactions_account"
      FOREIGN KEY ("account_id")
      REFERENCES "accounts"("id")
      ON DELETE CASCADE,
    CONSTRAINT "FK_transactions_deal"
      FOREIGN KEY ("deal_id")
      REFERENCES "deals"("id")
      ON DELETE CASCADE
  )
`);

    await queryRunner.query(`
  CREATE INDEX "IDX_transactions_account_id"
  ON "transactions" ("account_id")
`);

    await queryRunner.query(`
  CREATE INDEX "IDX_transactions_deal_id"
  ON "transactions" ("deal_id")
`);
    await queryRunner.query(`
  ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "deals" FORCE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "statements" ENABLE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "statements" FORCE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY
`);

    await queryRunner.query(`
  CREATE POLICY "deals_user_policy"
  ON "deals"
  USING ("user_id" = current_setting('app.current_user_id', true))
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true))
`);

    await queryRunner.query(`
  CREATE POLICY "statements_user_policy"
  ON "statements"
  USING ("user_id" = current_setting('app.current_user_id', true))
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true))
`);

    await queryRunner.query(`
  CREATE POLICY "accounts_user_policy"
  ON "accounts"
  USING ("user_id" = current_setting('app.current_user_id', true))
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true))
`);

    await queryRunner.query(`
  CREATE POLICY "transactions_user_policy"
  ON "transactions"
  USING ("user_id" = current_setting('app.current_user_id', true))
  WITH CHECK ("user_id" = current_setting('app.current_user_id', true))
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  DROP INDEX IF EXISTS "IDX_transactions_deal_id"
`);

    await queryRunner.query(`
  DROP INDEX IF EXISTS "IDX_transactions_account_id"
`);

    await queryRunner.query(`
  DROP TABLE IF EXISTS "transactions"
`);

    await queryRunner.query(`
  DROP INDEX IF EXISTS "IDX_accounts_deal_id"
`);

    await queryRunner.query(`
  DROP TABLE IF EXISTS "accounts"
`);

    await queryRunner.query(`
  DROP INDEX IF EXISTS "IDX_statements_deal_id"
`);

    await queryRunner.query(`
  DROP TABLE IF EXISTS "statements"
`);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_deals_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "deals"
    `);
  }
}
