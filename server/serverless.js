/**
 * Serverless entry point for the ERL API (Vercel Functions).
 *
 * Lives inside `server/` on purpose: Node resolves `@nestjs/*`, `express` and
 * `pg` from `server/node_modules`, which a shim in the repo-root `api/` folder
 * could not do.
 *
 * It boots the SAME AppModule as `main.ts` — one set of business rules for
 * local, container and serverless deployments. The compiled `dist/` is used
 * (not the TypeScript sources) because NestJS dependency injection relies on
 * `emitDecoratorMetadata`, which the platform's esbuild-based TS handling does
 * not emit.
 */
require('reflect-metadata');

const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { ValidationPipe, Logger } = require('@nestjs/common');
const { AppModule } = require('./dist/app.module');

/** Cached across invocations on a warm instance: bootstrapping Nest is slow. */
let appPromise = null;

function bootstrap() {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      cors: true,
      logger: ['error', 'warn'],
      // Replaced below: attachments are base64 data URLs and the default
      // 100 kb JSON limit is far too small for an X-ray or a PDF.
      bodyParser: false,
    });
    app.use(express.json({ limit: '4mb' }));
    app.use(express.urlencoded({ extended: true, limit: '4mb' }));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
    await app.init();
    return expressApp;
  })().catch((e) => {
    // Never cache a failed bootstrap — the next request should retry
    // (e.g. after a transient database outage at cold start).
    appPromise = null;
    new Logger('Serverless').error(`Bootstrap failed: ${e.message}`);
    throw e;
  });

  return appPromise;
}

module.exports = async (req, res) => {
  try {
    // Vercel routes this function at /api/**, while the API's own routes are
    // /v1/**. Strip the mount prefix so Nest sees the paths it declares.
    req.url = req.url.replace(/^\/api(?=\/|\?|$)/, '') || '/';

    const app = await bootstrap();
    return app(req, res);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      statusCode: 500,
      message: 'The API failed to start. Check the database configuration (DATABASE_URL).',
    }));
  }
};
