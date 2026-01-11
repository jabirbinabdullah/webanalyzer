/**
 * Global error handler middleware
 * Catches and logs all errors, sends consistent error responses
 */

export const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const requestId = req.id || `req-${Date.now()}`;

  // Log error details
  const errorLog = {
    timestamp,
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    status: err.status || 500,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  console.error('Error:', JSON.stringify(errorLog, null, 2));

  // Determine status code
  const statusCode = err.status || err.statusCode || 500;

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

/**
 * Async error wrapper for route handlers
 * Catches errors thrown in async functions and passes to error handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default errorHandler;
