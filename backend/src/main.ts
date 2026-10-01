import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));

  app.enableCors({
    origin: ['http://localhost:5173', 'null'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
