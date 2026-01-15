import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { User } from './entities/user.entity';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        url: config.supabaseDbUrl,
        entities: [User, Chat, Message],
        synchronize: false,
      }),
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([User, Chat, Message]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
