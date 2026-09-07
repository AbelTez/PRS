import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
// Load server/.env wherever the process was started from (the root
// package.json scripts run from the repo root), then any .env in the working
// directory. dotenv never overwrites variables that are already set, so real
// environment variables — a platform's injected config — always win.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser is replaced rather than defaulted: referral attachments arrive
  // as base64 data URLs, and Express's stock 100 kb JSON limit would reject an
  // X-ray or a PDF well below the API's own 1.5 MB cap.
  const app = await NestFactory.create(AppModule, { cors: true, bodyParser: false });
  app.use(json({ limit: '4mb' }));
  app.use(urlencoded({ extended: true, limit: '4mb' }));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Ethio Referral Linkage API listening on http://localhost:${port}`);
}
bootstrap();
