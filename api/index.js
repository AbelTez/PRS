/**
 * Vercel Function mount point for the API.
 *
 * Everything under /api/** is rewritten here by vercel.json (a catch-all
 * `[...path].js` filename builds but is not routed by this project type, so
 * the mapping is explicit instead). The real handler lives in ../server so its
 * `require`s resolve against server/node_modules; this file stays a one-line
 * shim.
 */
module.exports = require('../server/serverless.js');
