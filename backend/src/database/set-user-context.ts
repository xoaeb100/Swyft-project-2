import { QueryRunner } from 'typeorm';

export async function setUserContext(
  queryRunner: QueryRunner,
  userId: string,
): Promise<void> {
  await queryRunner.query(
    `SELECT set_config('app.current_user_id', $1, true)`,
    [userId],
  );
}
