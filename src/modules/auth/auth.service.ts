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

  async signUp(payload: SignUpDto) {
    const { supabase } = this.supabaseService;

    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: process.env.SUPABASE_REDIRECT_URL,
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (error || !data.session) {
        console.error('Supabase signInWithPassword error:', error);
        throw new UnauthorizedException(error?.message || 'Invalid credentials');
      }

      const supabaseUser = data.user;
      if (supabaseUser) {
        const emailFromToken =
          supabaseUser.email || (supabaseUser.user_metadata as any)?.email || payload.email;

        let dbUser = await this.userRepository.findOne({
          where: [{ supabaseId: supabaseUser.id }, { email: emailFromToken }],
        });

        if (!dbUser) {
          dbUser = this.userRepository.create({
            supabaseId: supabaseUser.id,
            email: emailFromToken,
            emailVerified: !!supabaseUser.email_confirmed_at,
          });
        } else {
          dbUser.email = emailFromToken || dbUser.email;
          dbUser.emailVerified = !!supabaseUser.email_confirmed_at;
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

  async verifyEmail(params: {
    accessToken?: string;
    type?: string;
    token?: string;
    email?: string;
    tokenHash?: string;
  }) {
    const { accessToken, type, token, email } = params;
    const { supabase } = this.supabaseService;

    let userId: string | undefined;
    let userEmail: string | undefined;

    let supabaseUserFromVerify: any | undefined;

    if (accessToken && accessToken.length > 20) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (!error && data.user) {
        userId = data.user.id;
        userEmail = data.user.email || undefined;
        supabaseUserFromVerify = data.user;
      }
    }

    // If JWT check failed or skipped (short token), try OTP flow
    if (!userId) {
      const tokenToVerify = accessToken && accessToken.length <= 20 ? accessToken : token;

      if (tokenToVerify && email) {
        const verifyType =
          type && ['signup', 'email', 'magiclink', 'recovery', 'invite'].includes(type)
            ? (type as any)
            : 'signup'; // Default to signup if type is missing/empty

        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token: tokenToVerify,
          type: verifyType,
        } as any);

        if (error) {
          throw new UnauthorizedException(error.message || 'Invalid or expired token');
        }
        userId = data?.user?.id;
        userEmail = data?.user?.email || email;
        supabaseUserFromVerify = data?.user;
      } else {
        // Only throw if we had no valid JWT AND no valid OTP params
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    if (!userId) {
      throw new UnauthorizedException('Unable to resolve user');
    }

    const emailFromToken =
      userEmail ||
      supabaseUserFromVerify?.email ||
      (supabaseUserFromVerify?.user_metadata as any)?.email ||
      undefined;

    let dbUser = await this.userRepository.findOne({
      where: { supabaseId: userId },
    });

    if (!dbUser) {
      dbUser = this.userRepository.create({
        supabaseId: userId,
        email: emailFromToken || email || '',
        emailVerified: true,
      });
    } else {
      dbUser.emailVerified = true;
      dbUser.email = emailFromToken || email || dbUser.email;
    }

    await this.userRepository.save(dbUser);

    return {
      message: 'Email verified successfully',
      email: userEmail,
      type,
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

    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      emailVerifiedAt: user.email_confirmed_at,
      metadata: user.user_metadata,
      dbUser,
    };
  }
}
