/**
 * Error handler middleware untuk Express
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource tidak ditemukan dengan id: ${err.value}`;
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let field = Object.keys(err.keyValue)[0];
    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
    const message = `${fieldName} '${err.keyValue[field]}' sudah ada`;
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new Error(message);
    error.statusCode = 400;
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const message = 'Validasi data gagal';
    error = new Error(message);
    error.statusCode = 400;
    error.errors = err.errors;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    errors: error.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;