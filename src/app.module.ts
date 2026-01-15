import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { SupabaseModule } from './supabase/supabase.module';
import { DatabaseModule } from './database/database.module';
import { ThrottlerConfigService } from './config/throttler-config.service';
import { CacheConfigService } from './config/cache-config.service';
import { ExampleModule } from './modules/example/example.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validate } from './config/env.validation';
import { LlmModule } from './modules/llm/llm.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: config => validate(config),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    AppConfigModule,
    // Throttling
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      useClass: ThrottlerConfigService,
    }),
    // Caching
    CacheModule.registerAsync({
      imports: [AppConfigModule],
      useClass: CacheConfigService,
      isGlobal: true,
    }),
    // Supabase (Auth)
    SupabaseModule,
    // Postgres via TypeORM (Supabase DB)
    DatabaseModule,
    // Feature modules
    AuthModule,
    ExampleModule,
    LlmModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
