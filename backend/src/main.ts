import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Render/Vercel sit behind a proxy — without this every lead records the
  // load balancer's IP and rate limiting would throttle all users as one.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production to prevent open access');
  }
  const origins = process.env.CORS_ORIGIN
    .split(',')
    .map((s) => s.trim());
  app.enableCors({ origin: origins.includes('*') ? true : origins });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Ladakh Vacation backend listening on :${port} (prefix /api)`);
}
bootstrap();
