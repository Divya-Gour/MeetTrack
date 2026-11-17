// server/src/middleware/rateLimit.js
const { RateLimit } = require('../models');

function createRateLimiter({
  keyGenerator,
  windowMs = 15 * 60 * 1000,
  maxRequests = 20,
  errorCode = 'RATE_LIMITED',
  errorMessage = 'Too many requests. Please try again later.',
}) {
  return async (req, res, next) => {
    try {
      const rawKey = keyGenerator ? keyGenerator(req) : req.ip;
      const key = `rl:${rawKey}`;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + windowMs);

      const record = await RateLimit.findOneAndUpdate(
        { key },
        {
          $inc: { count: 1 },
          $setOnInsert: { windowStart: now, expiresAt },
        },
        { upsert: true, new: true }
      );

      if (record.count > maxRequests) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil((new Date(record.expiresAt).getTime() - now.getTime()) / 1000)
        );
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          error: {
            code: errorCode,
            message: errorMessage,
            retryAfterSeconds,
          },
        });
      }

      next();
    } catch (err) {
      // Fail open if rate limit storage error occurs, but log warning
      console.warn('[RateLimit] Storage check failed:', err.message);
      next();
    }
  };
}

module.exports = {
  createRateLimiter,
};
