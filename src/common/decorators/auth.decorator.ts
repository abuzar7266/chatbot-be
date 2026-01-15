import { SetMetadata } from '@nestjs/common';

export const AUTH_KEY = 'auth';
export const Auth = (roles?: string[]) => {
  console.log('🔐 Auth decorator called - Hello auth happening!', { roles });
  return SetMetadata(AUTH_KEY, roles || []);
};
