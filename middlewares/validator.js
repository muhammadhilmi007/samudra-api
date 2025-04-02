const { z } = require('zod');

/**
 * Middleware for validating request using Zod
 */

// Default schema that always succeeds (fallback)
const defaultSchema = z.any();

const validateBody = (schema = defaultSchema) => {
  return (req, res, next) => {
    // Debug information
    console.log(`[DEBUG] Validation route: ${req.method} ${req.originalUrl}`);
    console.log(`[DEBUG] Schema defined: ${!!schema}`);

    try {
      // Use the provided schema or default to the fallback schema
      const validationSchema = schema || defaultSchema;
      
      // Format data for handling nested fields
      const data = { ...req.body };
      
      // Validate with schema
      const result = validationSchema.safeParse(data);
      
      if (!result.success) {
        // Format error messages for easier handling
        const formattedErrors = {};
        result.error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: formattedErrors
        });
      }
      
      // If success, update req.body with validated data
      req.body = result.data;
      next(); // Fixed: Call next() to proceed
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        error: error.message
      });
    }
  };
};

/**
 * Middleware for validating query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      // Check if schema is defined
      if (!schema) {
        console.error('Validation schema is undefined');
        return res.status(500).json({
          success: false,
          message: 'Internal server error: Validation schema not defined'
        });
      }

      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const formattedErrors = {};
        result.error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi query gagal',
          errors: formattedErrors
        });
      }
      
      next(); // Fixed: Call next() to proceed
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Validasi query gagal',
        error: error.message
      });
    }
  };
};

/**
 * Middleware for validating URL params
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      // Check if schema is defined
      if (!schema) {
        console.error('Validation schema is undefined');
        return res.status(500).json({
          success: false,
          message: 'Internal server error: Validation schema not defined'
        });
      }

      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const formattedErrors = {};
        result.error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi parameter gagal',
          errors: formattedErrors
        });
      }
      
      next(); // Fixed: Call next() to proceed
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Validasi parameter gagal',
        error: error.message
      });
    }
  };
};

/**
 * Middleware for validating ObjectId MongoDB
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: `ID '${id}' tidak valid`
      });
    }
    
    next(); // Fixed: Call next() to proceed
  };
};

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId
};