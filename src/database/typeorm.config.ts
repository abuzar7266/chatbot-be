import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { Example } from './entities/example.entity';
import { User } from './entities/user.entity';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';

// Load environment variables for CLI / build-time usage
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const dbUrl = process.env.SUPABASE_DB_URL || '';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  entities: [Example, User, Chat, Message],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
