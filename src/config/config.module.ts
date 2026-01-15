import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { ConfigValidatorService } from './config-validator.service';

@Global()
@Module({
  providers: [ConfigService, AppConfigService, ConfigValidatorService],
  exports: [ConfigService, AppConfigService],
})
export class ConfigModule {}
