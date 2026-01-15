import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
@Entity({ name: 'users' })
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Supabase auth user id (UUID)
  @Column({ name: 'supabase_id', type: 'uuid' })
  supabaseId: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;
}