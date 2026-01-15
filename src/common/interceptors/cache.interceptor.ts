import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_KEY_METADATA, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheKey = this.getCacheKey(context);

    if (!cacheKey) {
      return next.handle();
    }

    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      return of(cachedData);
    }

    return next.handle().pipe(
      tap(async data => {
        await this.cacheManager.set(cacheKey, data);
      }),
    );
  }

  private getCacheKey(context: ExecutionContext): string | undefined {
    const cacheKey = Reflect.getMetadata(CACHE_KEY_METADATA, context.getHandler());
    return cacheKey || undefined;
  }
}
