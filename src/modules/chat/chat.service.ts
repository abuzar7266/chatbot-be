import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, MoreThan, LessThan, Between } from 'typeorm';
import { Observable } from 'rxjs';
import { finalize, map, tap, startWith } from 'rxjs/operators';
import { Chat } from '../../database/entities/chat.entity';
import { Message, MessageRole } from '../../database/entities/message.entity';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private llmService: LlmService,
  ) {}

  async createChat(userId: string): Promise<{
    chat: Chat;
    created: boolean;
  }> {
    const existingEmptyChat = await this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.userId = :userId', { userId })
      .andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from(Message, 'message')
          .where('message.chatId = chat.id');
        return `NOT EXISTS ${subQuery.getQuery()}`;
      })
      .orderBy('chat.createdAt', 'DESC')
      .getOne();

    if (existingEmptyChat) {
      return {
        chat: existingEmptyChat,
        created: false,
      };
    }

    const chat = this.chatRepository.create({
      userId,
      title: 'New Chat',
    });
    const saved = await this.chatRepository.save(chat);

    return {
      chat: saved,
      created: true,
    };
  }

  /**
   * Retrieve all chat sessions for a specific user.
   */
  async getUserChats(userId: string): Promise<Chat[]> {
    return this.chatRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieve a specific chat by ID, ensuring it belongs to the user.
   */
  async getChat(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found or access denied');
    }

    return chat;
  }

  async getChatMessages(
    chatId: string,
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      role?: MessageRole;
      before?: Date;
      after?: Date;
      search?: string;
    },
  ): Promise<{ items: Message[]; total: number; page: number; limit: number }> {
    await this.getChat(chatId, userId);

    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;
    const skip = (page - 1) * limit;

    // If no text search, use simple findAndCount (most recent messages first)
    if (!options?.search) {
      const where: FindOptionsWhere<Message> = { chatId };

      if (options?.role) {
        where.role = options.role;
      }

      if (options?.before && options?.after) {
        where.createdAt = Between(options.after, options.before);
      } else if (options?.before) {
        where.createdAt = LessThan(options.before);
      } else if (options?.after) {
        where.createdAt = MoreThan(options.after);
      }

      const [items, total] = await this.messageRepository.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      const sortedItems = items.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      return { items: sortedItems, total, page, limit };
    }

    // With text search, use QueryBuilder and ILIKE for Postgres
    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chatId = :chatId', { chatId });

    if (options.role) {
      qb.andWhere('message.role = :role', { role: options.role });
    }

    if (options.before && options.after) {
      qb.andWhere('message.createdAt BETWEEN :after AND :before', {
        after: options.after,
        before: options.before,
      });
    } else if (options.before) {
      qb.andWhere('message.createdAt < :before', { before: options.before });
    } else if (options.after) {
      qb.andWhere('message.createdAt > :after', { after: options.after });
    }

    qb.andWhere('message.content ILIKE :search', { search: `%${options.search}%` })
      .orderBy('message.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    const sortedItems = items.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return { items: sortedItems, total, page, limit };
  }

  /**
   * Send a message to the chat and get an AI response stream (SSE).
   */
  async sendMessageStream(
    chatId: string,
    userId: string,
    content: string,
  ): Promise<
    Observable<{
      data: {
        messageId: string;
        previousMessageId: string | null;
        chatId: string;
        role: MessageRole;
        content: string;
        index: number;
        createdAt: string;
      };
    }>
  > {
    const chat = await this.getChat(chatId, userId);

    const previousMessage = await this.messageRepository.findOne({
      where: { chatId },
      order: { createdAt: 'DESC' },
    });

    const userMessage = this.messageRepository.create({
      chatId,
      role: MessageRole.USER,
      content,
    });
    await this.messageRepository.save(userMessage);

    const lastMessage = await this.messageRepository.findOne({
      where: { chatId },
      order: { createdAt: 'DESC' },
    });

    if (!lastMessage || lastMessage.role !== MessageRole.USER) {
      throw new BadRequestException('Last message in chat must be a user prompt');
    }

    const assistantMessage = this.messageRepository.create({
      chatId,
      role: MessageRole.ASSISTANT,
      content: '',
    });
    await this.messageRepository.save(assistantMessage);

    const messageId = assistantMessage.id;
    const createdAt = assistantMessage.createdAt.toISOString();

    const stream = this.llmService.generateResponseStream(content, sample => {
      const defaultTitles = ['New Chat', 'SSE Test Chat'];
      if (!chat.title || defaultTitles.includes(chat.title)) {
        chat.title = sample.topic;
        this.chatRepository.save(chat).catch(error => {
          // eslint-disable-next-line no-console
          console.error('Failed to update chat title from LLM sample:', error);
        });
      }
    });

    let fullResponse = '';
    let index = 0;

    const userEvent = {
      data: {
        messageId: userMessage.id,
        previousMessageId: previousMessage ? previousMessage.id : null,
        chatId,
        role: MessageRole.USER,
        content,
        index: 0,
        createdAt: userMessage.createdAt.toISOString(),
      },
    };

    return stream.pipe(
      tap(chunk => {
        fullResponse += chunk;
      }),
      map(chunk => {
        const payload = {
          messageId,
          previousMessageId: userMessage.id,
          chatId,
          role: MessageRole.ASSISTANT,
          content: chunk,
          index,
          createdAt,
        };
        index += 1;
        return { data: payload };
      }),
      finalize(() => {
        if (fullResponse.trim().length > 0) {
          assistantMessage.content = fullResponse;
          void this.messageRepository.save(assistantMessage);
        }
      }),
      startWith(userEvent),
    );
  }

  /**
   * Helper to save the assistant message after streaming is done.
   * This should be called when the stream completes.
   */
  async saveAssistantMessage(chatId: string, content: string): Promise<Message> {
    const assistantMessage = this.messageRepository.create({
      chatId,
      role: MessageRole.ASSISTANT,
      content,
    });
    return this.messageRepository.save(assistantMessage);
  }
}
