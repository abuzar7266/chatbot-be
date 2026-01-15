import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.constants';

@Injectable()
export class SupabaseService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient) {}

  get supabase(): SupabaseClient {
    return this.client;
  }
}


