import { Body, Controller, Get, Param, Post, Request, Sse, Query, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { Chat } from '../../database/entities/chat.entity';
import { Message, MessageRole } from '../../database/entities/message.entity';

@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(@Request() req: any): Promise<{
    chat: Chat;
    created: boolean;
  }> {
    const userId = req.user.id;
    return this.chatService.createChat(userId);
  }

  @Get()
  async getUserChats(@Request() req: any): Promise<Chat[]> {
    const userId = req.user.id;
    return this.chatService.getUserChats(userId);
  }

  @Get(':id')
  async getChat(@Request() req: any, @Param('id') id: string): Promise<Chat> {
    const userId = req.user.id;
    return this.chatService.getChat(id, userId);
  }

  @Get(':id/messages')
  async getChatMessages(
    @Request() req: any,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: MessageRole,
    @Query('before') before?: string,
    @Query('after') after?: string,
    @Query('search') search?: string,
  ): Promise<{ items: Message[]; total: number; page: number; limit: number }> {
    const userId = req.user.id;

    const beforeDate = before ? new Date(before) : undefined;
    const afterDate = after ? new Date(after) : undefined;

    return this.chatService.getChatMessages(id, userId, {
      page,
      limit,
      role,
      before: beforeDate,
      after: afterDate,
      search,
    });
  }

  /**
   * Send a message and get a stream of response chunks (Server-Sent Events).
   * Usage: EventSource to /chats/:id/messages/stream?content=... (Not ideal for POST body)
   * Better: POST request that returns an event stream.
   * NestJS @Sse usually works with GET, but we need to send data.
   * Standard practice: Client sends POST to trigger, then listens to SSE, OR we use POST with text/event-stream content-type.
   *
   * NestJS @Sse decorator forces 'text/event-stream'.
   */
  @Sse(':id/messages/stream')
  async streamMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Query('content') content?: string,
  ): Promise<Observable<any>> {
    const userId = req.user.id;

    if (!content) {
      throw new BadRequestException('Content is required');
    }

    const stream$ = await this.chatService.sendMessageStream(id, userId, content);

    return stream$;
  }
}
