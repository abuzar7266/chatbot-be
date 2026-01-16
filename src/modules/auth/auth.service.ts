import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private xorDecrypt(base64Value: string, key: string): string {
    if (!key) {
      throw new Error('Password encryption key is not configured');
    }

    const encrypted = Buffer.from(base64Value, 'base64');
    const keyBytes = Buffer.from(key, 'utf8');

    const result = Buffer.alloc(encrypted.length);

    for (let i = 0; i < encrypted.length; i++) {
      const keyByte = keyBytes[i % keyBytes.length];
      result[i] = encrypted[i] ^ keyByte;
    }

    return result.toString('utf8');
  }

  private decryptPassword(value: string): string {
    const key = process.env.PASSWORD_ENCRYPTION_KEY;
    if (!key) {
      return value;
    }

    try {
      return this.xorDecrypt(value, key);
    } catch {
      return value;
    }
  }

  private resolveFullNameFromIdentity(user: any): string | null {
    const identities = (user as any).identities as any[] | undefined;
    const identity =
      identities?.find(i => i.provider === 'google') ||
      identities?.find(i => i.provider === 'apple') ||
      identities?.[0];

    const identityData = identity?.identity_data || {};
    const metadata = (user as any).user_metadata || {};

    const fromIdentity =
      identityData.full_name ||
      identityData.name ||
      (identityData.given_name && identityData.family_name
        ? `${identityData.given_name} ${identityData.family_name}`
        : null);

    const fromMetadata =
      metadata.fullName ||
      metadata.full_name ||
      (metadata.given_name && metadata.family_name
        ? `${metadata.given_name} ${metadata.family_name}`
        : null);

    return fromIdentity || fromMetadata || null;
  }

  async signUp(payload: SignUpDto) {
    const { supabase } = this.supabaseService;

    const decryptedPassword = this.decryptPassword(payload.password);

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: decryptedPassword,
      options: {
        emailRedirectTo: process.env.SUPABASE_REDIRECT_URL,
        data: {
          fullName: payload.fullName,
        },
      },
    });

    if (error || !data.user) {
      throw new UnauthorizedException(error?.message || 'Unable to sign up user');
    }

    // Create corresponding user record in Postgres via TypeORM
    const userEntity = this.userRepository.create({
      supabaseId: data.user.id,
      email: data.user.email || payload.email,
      emailVerified: !!data.user.email_confirmed_at,
      fullName: payload.fullName,
    });
    await this.userRepository.save(userEntity);

    return {
      user: data.user,
      dbUser: userEntity,
      // Supabase will send a confirmation email if email confirmation is enabled
      message: 'Sign up successful. Please check your email to verify your account.',
    };
  }

  async signIn(payload: SignInDto) {
    const { supabase } = this.supabaseService;

    const decryptedPassword = this.decryptPassword(payload.password);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: decryptedPassword,
      });

      if (error || !data.session) {
        console.error('Supabase signInWithPassword error:', error);
        throw new UnauthorizedException(error?.message || 'Invalid credentials');
      }

      const supabaseUser = data.user;
      if (supabaseUser) {
        const emailFromToken =
          supabaseUser.email || (supabaseUser.user_metadata as any)?.email || payload.email;
        const fullNameFromToken =
          (supabaseUser.user_metadata as any)?.fullName ||
          (supabaseUser.user_metadata as any)?.full_name;

        let dbUser = await this.userRepository.findOne({
          where: [{ supabaseId: supabaseUser.id }, { email: emailFromToken }],
        });

        if (!dbUser) {
          dbUser = this.userRepository.create({
            supabaseId: supabaseUser.id,
            email: emailFromToken,
            emailVerified: !!supabaseUser.email_confirmed_at,
            fullName: fullNameFromToken || null,
          });
        } else {
          dbUser.email = emailFromToken || dbUser.email;
          dbUser.emailVerified = !!supabaseUser.email_confirmed_at;
          dbUser.fullName = fullNameFromToken || dbUser.fullName;
        }

        await this.userRepository.save(dbUser);
      }

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: data.user,
      };
    } catch (err: any) {
      console.error('Error in AuthService.signIn:', err);

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException(
        err?.message || 'Failed to sign in via Supabase (see server logs for details)',
      );
    }
  }

  async verifyEmail(params: { token?: string; email?: string; tokenHash?: string }) {
    const { token, email } = params;
    const { supabase } = this.supabaseService;

    let userId: string | undefined;
    let userEmail: string | undefined;

    let supabaseUserFromVerify: any | undefined;

    if (token && email) {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      } as any);

      if (error) {
        throw new UnauthorizedException(error.message || 'Invalid or expired token');
      }
      userId = data?.user?.id;
      userEmail = data?.user?.email || email;
      supabaseUserFromVerify = data?.user;
    } else {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!userId) {
      throw new UnauthorizedException('Unable to resolve user');
    }

    const emailFromToken =
      userEmail ||
      supabaseUserFromVerify?.email ||
      (supabaseUserFromVerify?.user_metadata as any)?.email ||
      undefined;
    const fullNameFromToken =
      (supabaseUserFromVerify?.user_metadata as any)?.fullName ||
      (supabaseUserFromVerify?.user_metadata as any)?.full_name;

    let dbUser = await this.userRepository.findOne({
      where: { supabaseId: userId },
    });

    if (!dbUser) {
      dbUser = this.userRepository.create({
        supabaseId: userId,
        email: emailFromToken || email || '',
        emailVerified: true,
        fullName: fullNameFromToken || null,
      });
    } else {
      dbUser.emailVerified = true;
      dbUser.email = emailFromToken || email || dbUser.email;
      dbUser.fullName = fullNameFromToken || dbUser.fullName;
    }

    await this.userRepository.save(dbUser);

    return {
      message: 'Email verified successfully',
      email: userEmail,
      type: 'signup',
    };
  }

  async getProfile(accessToken: string) {
    const { supabase } = this.supabaseService;
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = data.user;

    // Look up matching DB user record
    const dbUser = await this.userRepository.findOne({
      where: { supabaseId: user.id },
    });

    const fullNameFromMetadata =
      (user.user_metadata as any)?.fullName || (user.user_metadata as any)?.full_name;
    const fullName = dbUser?.fullName || fullNameFromMetadata || null;

    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      emailVerifiedAt: user.email_confirmed_at,
      fullName,
      metadata: user.user_metadata,
      dbUser,
    };
  }

  async syncUserFromAccessToken(accessToken: string) {
    const { supabase } = this.supabaseService;
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = data.user as any;

    const identities = (user.identities as any[]) || [];
    const socialIdentity = identities.find(
      i => i.provider === 'google' || i.provider === 'apple',
    );

    let dbUser = await this.userRepository.findOne({
      where: { supabaseId: user.id },
    });

    if (!dbUser) {
      if (!socialIdentity) {
        throw new UnauthorizedException('User not found in local database; sign up required');
      }

      const emailFromToken =
        user.email || (user.user_metadata as any)?.email || socialIdentity?.identity_data?.email;
      const fullNameFromIdentity = this.resolveFullNameFromIdentity(user);

      dbUser = this.userRepository.create({
        supabaseId: user.id,
        email: emailFromToken || '',
        emailVerified: !!user.email_confirmed_at,
        fullName: fullNameFromIdentity,
      });
    } else {
      const emailFromToken =
        user.email || (user.user_metadata as any)?.email || dbUser.email;
      const fullNameFromIdentity = this.resolveFullNameFromIdentity(user) || dbUser.fullName;

      dbUser.email = emailFromToken || dbUser.email;
      dbUser.emailVerified = !!user.email_confirmed_at;
      dbUser.fullName = fullNameFromIdentity;
    }

    await this.userRepository.save(dbUser);

    return this.getProfile(accessToken);
  }

  async updateProfile(params: {
    accessToken?: string;
    supabaseId?: string;
    updates: { fullName?: string };
  }) {
    const { accessToken, supabaseId, updates } = params;
    const { supabase } = this.supabaseService;

    if (!supabaseId) {
      throw new UnauthorizedException('Missing user context');
    }

    if (updates.fullName !== undefined) {
      const { error } = await supabase.auth.admin.updateUserById(supabaseId, {
        user_metadata: {
          fullName: updates.fullName,
        },
      } as any);

      if (error) {
        throw new UnauthorizedException(error.message || 'Unable to update user profile');
      }

      const dbUser = await this.userRepository.findOne({
        where: { supabaseId },
      });

      if (dbUser) {
        dbUser.fullName = updates.fullName || null;
        await this.userRepository.save(dbUser);
      }
    }

    if (accessToken) {
      return this.getProfile(accessToken);
    }

    return {
      message: 'Profile updated',
    };
  }
}
