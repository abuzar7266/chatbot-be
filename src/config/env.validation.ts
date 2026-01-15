import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  validateSync,
  IsIn,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsIn(Object.values(Environment))
  NODE_ENV?: Environment = Environment.Development;

  @IsOptional()
  @IsNumber()
  PORT?: number = 3000;

  @IsString()
  @IsNotEmpty()
  SUPABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_ANON_KEY: string;

  @IsString()
  @IsNotEmpty()
  SUPABASE_DB_URL: string;

  @IsOptional()
  @IsString()
  SUPABASE_REDIRECT_URL?: string;

  @IsOptional()
  @IsNumber()
  THROTTLE_TTL?: number = 60;

  @IsOptional()
  @IsNumber()
  THROTTLE_LIMIT?: number = 10;

  @IsOptional()
  @IsNumber()
  CACHE_TTL?: number = 300;

  @IsOptional()
  @IsNumber()
  CACHE_MAX?: number = 100;

  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string = '1d';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const missingVars = errors
      .map((error: any) => {
        return Object.values(error.constraints || {}).join(', ');
      })
      .join('; ');

    throw new Error(
      `❌ Environment validation failed!\n\n` +
        `Missing or invalid environment variables:\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See env.example for reference.`,
    );
  }

  return validatedConfig;
}

