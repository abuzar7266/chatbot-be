import { Injectable } from '@nestjs/common';
import { CacheModuleOptions, CacheOptionsFactory } from '@nestjs/cache-manager';
import { AppConfigService } from './config.service';

@Injectable()
export class CacheConfigService implements CacheOptionsFactory {
  constructor(private readonly configService: AppConfigService) {}

  createCacheOptions(): CacheModuleOptions {
    return {
      ttl: this.configService.cacheTtl * 1000, // Convert to milliseconds
      max: this.configService.cacheMax,
    };
  }
}
