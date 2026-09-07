/**
 * Liveness probe for the deployed API.
 *
 * Deliberately does not boot NestJS or touch the database, so it answers even
 * when the database is misconfigured — which is exactly when you need it. It
 * reports whether a database is wired up and which commit is serving, and
 * echoes the request path the platform handed the function (useful when
 * diagnosing routing).
 */
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    ok: true,
    service: 'ethio-referral-linkage-api',
    receivedUrl: req.url,
    databaseConfigured: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    secretsConfigured: {
      jwt: !!process.env.JWT_SECRET,
      token: !!process.env.TOKEN_SECRET,
      pepper: !!process.env.HASH_PEPPER,
    },
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
    region: process.env.VERCEL_REGION || null,
    time: new Date().toISOString(),
  }, null, 2));
};
