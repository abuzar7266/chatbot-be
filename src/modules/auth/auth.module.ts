import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseModule } from '../../supabase/supabase.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [SupabaseModule, TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
