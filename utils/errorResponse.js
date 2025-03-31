// utils/errorResponse.js
/**
 * Custom error class for API responses
 * @extends Error
 */
class ErrorResponse extends Error {
    /**
     * Create an error response
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {object} errors - Optional validation errors
     */
    constructor(message, statusCode, errors = null) {
      super(message);
      this.statusCode = statusCode;
      this.errors = errors;
      
      // Capture stack trace, excluding constructor call from it
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = ErrorResponse;