import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sign up a new user (Supabase Auth)' })
  async signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in user and return access token (Supabase Auth)' })
  async signIn(@Body() dto: SignInDto) {
    return this.authService.signIn(dto);
  }

  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle email verification redirect from Supabase' })
  async verifyEmail(
    @Query('access_token') accessToken?: string,
    @Query('accessToken') accessTokenAlt?: string,
    @Query('type') type?: string,
    @Query('token') token?: string,
    @Query('email') email?: string,
    @Query('token_hash') tokenHash?: string,
  ) {
    return this.authService.verifyEmail({
      accessToken: accessToken ?? accessTokenAlt,
      type,
      token,
      email,
      tokenHash,
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me(@CurrentUser() user: any, @Headers('authorization') authorization?: string) {
    // Prefer the token from Authorization header for a fresh profile lookup
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : user?.supabase?.access_token;

    if (!token) {
      // AuthGuard should normally prevent this
      return user ?? null;
    }

    const profile = await this.authService.getProfile(token);

    return {
      ...profile,
    };
  }
}
