// server/src/middleware/security.js
const config = require('../config');

function securityMiddleware(req, res, next) {
  // Security Headers per Section 0
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'");

  // CORS per Section 0
  const origin = req.headers.origin;
  if (origin && (origin === config.appUrl || !config.isProduction)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!config.isProduction) {
    res.setHeader('Access-Control-Allow-Origin', config.appUrl);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, If-Match, X-Request-Id');

  // Pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  // CSRF Header check for mutating requests per Section 7
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutatingMethods.includes(req.method)) {
    const csrfHeader = req.headers['x-requested-with'];
    if (!csrfHeader || csrfHeader.toLowerCase() !== 'meettrack') {
      return res.status(403).json({
        error: {
          code: 'CSRF_HEADER_MISSING',
          message: 'Mutating requests require header X-Requested-With: meettrack',
        },
      });
    }
  }

  next();
}

module.exports = securityMiddleware;
