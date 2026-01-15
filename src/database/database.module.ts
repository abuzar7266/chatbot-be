import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { Example } from './entities/example.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        url: config.supabaseDbUrl,
        entities: [Example, User],
        synchronize: false,
        migrationsRun: false,
      }),
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([Example, User]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}


