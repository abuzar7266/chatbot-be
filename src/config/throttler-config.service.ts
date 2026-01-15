import { Injectable } from '@nestjs/common';
import { ThrottlerModuleOptions, ThrottlerOptionsFactory } from '@nestjs/throttler';
import { AppConfigService } from './config.service';

@Injectable()
export class ThrottlerConfigService implements ThrottlerOptionsFactory {
  constructor(private readonly configService: AppConfigService) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    return {
      throttlers: [
        {
          ttl: this.configService.throttleTtl * 1000, // Convert to milliseconds
          limit: this.configService.throttleLimit,
        },
      ],
    };
  }
}
