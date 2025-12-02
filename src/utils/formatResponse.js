const { ResponseCode, getResponseCode } = require('./ResponseCode');

/**
 * Format success response
 * @param {*} data - Response data
 * @param {string} code - Response code (default: 'SUCCESS')
 * @param {string} message - Custom message (optional, will use default from ResponseCode if not provided)
 * @returns {Object} Formatted success response
 */
function success(data = null, code = 'SUCCESS', message = null) {
  const responseCode = getResponseCode(code);
  return {
    success: true,
    code: responseCode.code,
    message: message || responseCode.message,
    data,
  };
}

/**
 * Format error response
 * @param {string} code - Response code (required)
 * @param {string} message - Custom message (optional, will use default from ResponseCode if not provided)
 * @param {*} data - Additional error data (optional, default: null)
 * @returns {Object} Formatted error response
 */
function failure(code, message = null, data = null) {
  const responseCode = getResponseCode(code);
  return {
    success: false,
    code: responseCode.code,
    message: message || responseCode.message,
    data,
  };
}

/**
 * Format error response (alias for failure)
 */
function error(code, message = null, data = null) {
  return failure(code, message, data);
}

/**
 * Get HTTP status code from response code
 * @param {string} code - Response code
 * @returns {number} HTTP status code
 */
function getHttpStatus(code) {
  const responseCode = getResponseCode(code);
  return responseCode.httpStatus;
}

/**
 * Format response with automatic success/error detection
 * @param {boolean} isSuccess - Whether the operation was successful
 * @param {string} code - Response code
 * @param {*} data - Response data
 * @param {string} message - Custom message (optional)
 * @returns {Object} Formatted response
 */
function formatResponse(isSuccess, code, data = null, message = null) {
  if (isSuccess) {
    return success(data, code, message);
  } else {
    return failure(code, message, data);
  }
}

module.exports = {
  success,
  failure,
  error,
  formatResponse,
  getHttpStatus,
  ResponseCode, // Export for direct access if needed
};


