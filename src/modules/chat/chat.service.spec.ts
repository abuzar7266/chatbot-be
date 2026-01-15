import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Chat } from '../../database/entities/chat.entity';
import { Message } from '../../database/entities/message.entity';
import { LlmService } from '../llm/llm.service';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Chat),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {},
        },
        {
          provide: LlmService,
          useValue: {
            generateResponseStream: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
