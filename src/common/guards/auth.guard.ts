import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly supabaseService: SupabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log('🛡️ AuthGuard - Hello auth happening!');

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const { data, error } = await this.supabaseService.supabase.auth.getUser(token);

    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const roles = (data.user.app_metadata as any)?.roles ?? (data.user.user_metadata as any)?.roles;

    const emailFromToken = data.user.email || (data.user.user_metadata as any)?.email || '';

    let dbUser = await this.userRepository.findOne({
      where: [{ supabaseId: data.user.id }, { email: emailFromToken }],
    });

    if (!dbUser) {
      dbUser = this.userRepository.create({
        supabaseId: data.user.id,
        email: emailFromToken,
        emailVerified: !!data.user.email_confirmed_at,
      });
    } else {
      dbUser.email = emailFromToken || dbUser.email;
      dbUser.emailVerified = !!data.user.email_confirmed_at;
    }

    await this.userRepository.save(dbUser);

    request.user = {
      id: dbUser.id, // Use our internal DB ID, not Supabase ID
      email: data.user.email,
      roles: Array.isArray(roles) ? roles : roles ? [roles] : [],
      supabase: data.user,
      supabaseId: data.user.id,
    };

    console.log('🔍 Authenticated via Supabase', {
      userId: data.user.id,
    });

    return true;
  }
}
