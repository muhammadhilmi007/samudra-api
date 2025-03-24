/**
 * Middleware untuk menangani error secara async
 * @param {Function} fn - Fungsi async yang akan ditangani
 * @returns {Function} Middleware Express
 */
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  
  module.exports = asyncHandler;