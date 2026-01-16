import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { User } from '../../database/entities/user.entity';
import { SupabaseService } from '../../supabase/supabase.service';

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: {},
        },
        AuthGuard,
        Reflector,
        {
          provide: SupabaseService,
          useValue: {
            supabase: {
              auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
              },
            },
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
