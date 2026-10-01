import 'dotenv/config';
import dataSource from './data-source';

async function run() {
  await dataSource.initialize();

  try {
    await dataSource.runMigrations();
    console.log('Migrations completed successfully.');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
