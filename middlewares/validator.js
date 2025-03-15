const { validate } = require('../utils/validators');

/**
 * Middleware to validate request body using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
exports.validateBody = (schema) => {
  return (req, res, next) => {
    const { valid, errors } = validate(schema, req.body);
    
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate request query using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
exports.validateQuery = (schema) => {
  return (req, res, next) => {
    const { valid, errors } = validate(schema, req.query);
    
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Validasi query gagal',
        errors
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate request params using Zod schema
 * @param {Object} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
exports.validateParams = (schema) => {
  return (req, res, next) => {
    const { valid, errors } = validate(schema, req.params);
    
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Validasi parameter gagal',
        errors
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate ObjectId format
 * @returns {Function} Express middleware
 */
exports.validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: `ID '${id}' tidak valid`
      });
    }
    
    next();
  };
};