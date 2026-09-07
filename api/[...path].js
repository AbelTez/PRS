/**
 * Vercel Function mount point for the API.
 *
 * Everything under /api/** is handed to the NestJS application. The real
 * handler lives in ../server so its `require`s resolve against
 * server/node_modules; this file is deliberately a one-line shim.
 */
module.exports = require('../server/serverless.js');
