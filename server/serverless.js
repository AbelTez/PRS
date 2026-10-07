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

/**
 * The platform mounts this function at /api and rewrites /api/<rest> to it,
 * carrying the real path in `__erl_path` (see vercel.json). Nest's own routes
 * are /v1/**, so rebuild the path it expects — preserving any genuine query
 * string — and fall back to simply stripping the mount prefix when the
 * function is called directly (local harness, or /api itself).
 */
function apiPath(rawUrl) {
  const q = rawUrl.indexOf('?');
  const params = new URLSearchParams(q >= 0 ? rawUrl.slice(q + 1) : '');
  const forwarded = params.get('__erl_path');
  if (forwarded === null) {
    return rawUrl.replace(/^\/api(?=\/|\?|$)/, '') || '/';
  }
  params.delete('__erl_path');
  const rest = params.toString();
  return `/${forwarded.replace(/^\/+/, '')}${rest ? `?${rest}` : ''}`;
}

module.exports = async (req, res) => {
  try {
    req.url = apiPath(req.url);

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
