const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Log error untuk development
    console.error(err);
  
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      const message = `Resource dengan ID ${err.value} tidak ditemukan`;
      error = new Error(message);
      error.statusCode = 404;
    }
  
    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      const value = err.keyValue[field];
      const message = `${field} dengan nilai ${value} sudah ada`;
      error = new Error(message);
      error.statusCode = 400;
    }
  
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message);
      error = new Error(message.join(', '));
      error.statusCode = 400;
    }
  
    // JWT error
    if (err.name === 'JsonWebTokenError') {
      const message = 'Token tidak valid';
      error = new Error(message);
      error.statusCode = 401;
    }
  
    // JWT expired
    if (err.name === 'TokenExpiredError') {
      const message = 'Token kedaluwarsa';
      error = new Error(message);
      error.statusCode = 401;
    }
  
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan pada server'
    });
  };
  
  module.exports = errorHandler;