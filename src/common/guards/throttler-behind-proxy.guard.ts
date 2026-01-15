import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    const forwardedFor = req.headers?.['x-forwarded-for'] as string | undefined;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return forwardedFor || ip;
  }
}
