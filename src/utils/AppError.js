/**
 * Application Error Class - Microservice Architecture
 * Custom error class with response code support
 */
class AppError extends Error {
    constructor(responseCode, message = null, data = null, statusCode = null) {
        super(message || responseCode);
        this.name = 'AppError';
        this.responseCode = responseCode;
        this.message = message;
        this.data = data;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;

