// server/src/middleware/errors.js

function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    },
  });
}

function errorHandler(err, req, res, next) {
  const reqId = req.id || 'unknown';

  // Check if error has status code and custom error code
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 500 ? 'INTERNAL' : 'ERROR');

  if (status === 500) {
    console.error(`[ERROR] [${reqId}] ${err.name || 'Error'}: ${err.message}\n${err.stack || ''}`);
    return res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'An unexpected internal error occurred. Reference: ' + reqId,
      },
    });
  }

  // Client errors (4xx) and known operational errors (503, 502)
  const response = {
    error: {
      code,
      message: err.message || 'Request failed',
    },
  };

  if (err.fields) {
    response.error.fields = err.fields;
  }
  if (err.retryAfterSeconds !== undefined) {
    response.error.retryAfterSeconds = err.retryAfterSeconds;
  }

  res.status(status).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
