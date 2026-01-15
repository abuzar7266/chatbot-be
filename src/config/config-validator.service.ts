import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from './env.validation';

@Injectable()
export class ConfigValidatorService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Get all environment variables
    const config = {
      NODE_ENV: this.configService.get('NODE_ENV'),
      PORT: this.configService.get('PORT'),
      SUPABASE_URL: this.configService.get('SUPABASE_URL'),
      SUPABASE_ANON_KEY: this.configService.get('SUPABASE_ANON_KEY'),
      SUPABASE_DB_URL: this.configService.get('SUPABASE_DB_URL'),
      SUPABASE_REDIRECT_URL: this.configService.get('SUPABASE_REDIRECT_URL'),
      THROTTLE_TTL: this.configService.get('THROTTLE_TTL'),
      THROTTLE_LIMIT: this.configService.get('THROTTLE_LIMIT'),
      CACHE_TTL: this.configService.get('CACHE_TTL'),
      CACHE_MAX: this.configService.get('CACHE_MAX'),
      JWT_SECRET: this.configService.get('JWT_SECRET'),
      JWT_EXPIRES_IN: this.configService.get('JWT_EXPIRES_IN'),
    };

    // Validate environment variables
    validate(config);
    console.log('✅ Environment variables validated successfully');
  }
}

