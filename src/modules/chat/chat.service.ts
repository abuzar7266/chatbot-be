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

  /**
   * Create a new chat session for a user.
   */
  async createChat(userId: string, title: string = 'New Chat'): Promise<Chat> {
    const chat = this.chatRepository.create({
      userId,
      title,
    });
    return this.chatRepository.save(chat);
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

    // If no text search, use simple findAndCount
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
        order: { createdAt: 'ASC' },
        skip,
        take: limit,
      });

      return { items, total, page, limit };
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
      .orderBy('message.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
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
      if (!chat.title || chat.title === 'New Chat') {
        chat.title = sample.topic;
        void this.chatRepository.save(chat);
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
