import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Request,
  Sse,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ChatService } from './chat.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Chat } from '../../database/entities/chat.entity';
import { Message } from '../../database/entities/message.entity';

@Controller('chats')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async createChat(
    @Request() req: any,
    @Body('title') title?: string,
  ): Promise<Chat> {
    const userId = req.user.id;
    return this.chatService.createChat(userId, title);
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
  ): Promise<Message[]> {
    const userId = req.user.id;
    return this.chatService.getChatMessages(id, userId);
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
    @Query('content') contentQuery?: string,
    @Body('content') contentBody?: string, 
  ): Promise<Observable<any>> {
    const userId = req.user.id;
    const content = contentQuery || contentBody;

    if (!content) {
        throw new BadRequestException('Content is required');
    }
    
    // Create a local accumulator to save the full message at the end
    let fullContent = '';

    const stream$ = await this.chatService.sendMessageStream(id, userId, content);

    return stream$.pipe(
        finalize(async () => {
            // This block runs when the stream completes or errors
            if (fullContent.trim().length > 0) {
               await this.chatService.saveAssistantMessage(id, fullContent);
            }
        }),
        // We also need to capture the data as it flows through to build fullContent
        // We can't easily use 'tap' here because we need to modify the stream being returned? 
        // No, tap doesn't modify.
        // We need to tap into the observable returned by sendMessageStream BEFORE it gets here if we want to be clean,
        // but we can also just map it again here.
    ).pipe(
        // Intercept chunks to build the full history string
        // Note: The stream from service returns objects { data: "chunk" }
        // We need to extract the "chunk" string.
        (source) => new Observable(observer => {
            return source.subscribe({
                next(value) {
                    fullContent += value.data;
                    observer.next(value);
                },
                error(err) { observer.error(err); },
                complete() { observer.complete(); }
            });
        })
    );
  }
}
