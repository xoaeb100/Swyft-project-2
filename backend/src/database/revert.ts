import 'dotenv/config';
import dataSource from './data-source';

async function revert() {
  await dataSource.initialize();

  try {
    await dataSource.undoLastMigration();
    console.log('Migration reverted successfully.');
  } finally {
    await dataSource.destroy();
  }
}

revert().catch((error) => {
  console.error('Migration revert failed:', error);
  process.exit(1);
});
