/**
 * Middleware untuk validasi request menggunakan Zod
 */

const validateBody = (schema) => {
  return (req, res, next) => {
    try {
      // Format data untuk menangani kontakPenanggungJawab
      const data = { ...req.body };
      
      // Validasi dengan schema yang diberikan
      const { success, error, data: validatedData } = schema.safeParse(data);
      
      if (!success) {
        // Format error menjadi object untuk memudahkan penanganan di frontend
        const formattedErrors = {};
        error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi gagal',
          errors: formattedErrors
        });
      }
      
      // Jika success, ubah req.body dengan data yang sudah divalidasi
      req.body = validatedData;
      next();
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
 * Middleware untuk validasi query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { success, error } = schema.safeParse(req.query);
      
      if (!success) {
        const formattedErrors = {};
        error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi query gagal',
          errors: formattedErrors
        });
      }
      
      next();
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
 * Middleware untuk validasi URL params
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      const { success, error } = schema.safeParse(req.params);
      
      if (!success) {
        const formattedErrors = {};
        error.errors.forEach((err) => {
          formattedErrors[err.path.join('.')] = err.message;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validasi parameter gagal',
          errors: formattedErrors
        });
      }
      
      next();
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
 * Middleware untuk validasi ObjectId MongoDB
 */
const validateObjectId = (paramName = 'id') => {
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

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validateObjectId
};