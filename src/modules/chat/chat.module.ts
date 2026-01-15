import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Chat } from '../../database/entities/chat.entity';
import { Message } from '../../database/entities/message.entity';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, Message]),
    LlmModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
