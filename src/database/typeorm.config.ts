import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { Example } from './entities/example.entity';
import { User } from './entities/user.entity';

// Load environment variables for CLI / build-time usage
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const dbUrl = process.env.SUPABASE_DB_URL || '';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [Example, User],
  migrations: [__dirname + '/migrations/*.js'],
  synchronize: false,
  logging: false,
});


