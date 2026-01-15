import { AppDataSource } from './typeorm.config';

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    console.log('✅ TypeORM migrations executed successfully');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to run TypeORM migrations', error);
    process.exit(1);
  }
}

void runMigrations();
