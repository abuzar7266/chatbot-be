import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('ChatGPT Clone API')
    .setDescription(
      'ChatGPT-style chat API for the Turing Technologies technical test. Includes Supabase Auth, per-user chats, messages, and streaming assistant responses.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const primaryPort = Number(process.env.PORT) || 3000;
  const fallbackPort = 3001;

  async function startOnPort(port: number) {
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  }

  try {
    await startOnPort(primaryPort);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE' && primaryPort === 3000) {
      console.warn(
        `⚠️ Port ${primaryPort} is already in use. Falling back to port ${fallbackPort}...`,
      );
      await startOnPort(fallbackPort);
    } else {
      throw error;
    }
  }
}

bootstrap();
