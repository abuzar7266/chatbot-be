import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get supabaseUrl(): string {
    return this.configService.get<string>('SUPABASE_URL', '');
  }

  get supabaseAnonKey(): string {
    return this.configService.get<string>('SUPABASE_ANON_KEY', '');
  }

  get supabaseDbUrl(): string {
    return this.configService.get<string>('SUPABASE_DB_URL', '');
  }

  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL', 60);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 10);
  }

  get cacheTtl(): number {
    return this.configService.get<number>('CACHE_TTL', 300);
  }

  get cacheMax(): number {
    return this.configService.get<number>('CACHE_MAX', 100);
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET', '');
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '1d');
  }
}

