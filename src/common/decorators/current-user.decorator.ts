import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  console.log('👤 CurrentUser decorator called - Hello auth happening!');
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
