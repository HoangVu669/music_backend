const { failure, getHttpStatus, ResponseCode } = require('../utils/formatResponse');

/**
 * Global Error Middleware - Microservice Architecture
 * Centralized error handling with standardized response format
 */
function errorMiddleware(err, req, res, next) {
  // Log error for debugging
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom application errors (AppError) with response code
  if (err.name === 'AppError' || err.responseCode) {
    const responseCode = err.responseCode || 'INTERNAL_ERROR';
    const httpStatus = err.statusCode || getHttpStatus(responseCode);
    return res.status(httpStatus).json(
      failure(responseCode, err.message || null, err.data || null)
    );
  }

  // Handle MongoDB duplicate key error
  if (err.name === 'MongoServerError' || err.name === 'MongoError') {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      let responseCode = 'CONFLICT';

      // Map specific duplicate fields to specific error codes
      if (field === 'email') {
        responseCode = 'EMAIL_ALREADY_EXISTS';
      } else if (field === 'username') {
        responseCode = 'USERNAME_ALREADY_EXISTS';
      } else if (field === 'id' || field === 'userId') {
        responseCode = 'USER_ALREADY_EXISTS';
      }

      const httpStatus = getHttpStatus(responseCode);
      return res.status(httpStatus).json(
        failure(responseCode, `${field} đã tồn tại`)
      );
    }

    // Database connection error
    if (err.message && err.message.includes('connection')) {
      return res.status(503).json(
        failure('DATABASE_CONNECTION_FAILED', err.message)
      );
    }

    // Other MongoDB errors
    return res.status(500).json(
      failure('DATABASE_ERROR', err.message || 'Lỗi cơ sở dữ liệu')
    );
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(
      failure('VALIDATION_ERROR', messages.join(', '))
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      failure('TOKEN_INVALID', 'Token không hợp lệ')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      failure('TOKEN_EXPIRED', 'Token đã hết hạn')
    );
  }

  // Handle CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json(
      failure('INVALID_INPUT', `Giá trị không hợp lệ: ${err.path}`)
    );
  }

  // Handle custom error with status code
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    let responseCode = 'INTERNAL_ERROR';

    // Map HTTP status to response code
    if (status === 400) responseCode = 'VALIDATION_ERROR';
    else if (status === 401) responseCode = 'UNAUTHORIZED';
    else if (status === 403) responseCode = 'FORBIDDEN';
    else if (status === 404) responseCode = 'NOT_FOUND';
    else if (status === 409) responseCode = 'CONFLICT';
    else if (status === 429) responseCode = 'RATE_LIMIT_EXCEEDED';
    else if (status >= 500) responseCode = 'INTERNAL_ERROR';

    return res.status(status).json(
      failure(responseCode, err.message || 'Lỗi xử lý yêu cầu')
    );
  }

  // Default error handling - Internal Server Error
  return res.status(500).json(
    failure('INTERNAL_ERROR', err.message || 'Lỗi hệ thống')
  );
}

module.exports = { errorMiddleware };


