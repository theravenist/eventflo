export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.url} - Error message:`, err.message);
  console.error(err.stack);

  // Default status code: 500 Internal Server Error
  let statusCode = 500;
  let errorMessage = 'An internal server error occurred';

  // Handle specific database errors
  if (err.code === '23505') {
    // Unique violation (e.g., email already registered)
    statusCode = 409;
    errorMessage = 'A record with this unique value already exists';
  } else if (err.code === '23503') {
    // Foreign key violation
    statusCode = 400;
    errorMessage = 'Invalid reference identifier in request parameters';
  }

  // Handle specific custom domain/business errors
  if (
    err.message.includes('not found') || 
    err.message.includes('does not exist')
  ) {
    statusCode = 404;
    errorMessage = err.message;
  } else if (
    err.message.includes('not authorized') || 
    err.message.includes('Access denied') ||
    err.message.includes('Forbidden')
  ) {
    statusCode = 403;
    errorMessage = err.message;
  } else if (
    err.message.includes('Invalid email') ||
    err.message.includes('Invalid username') ||
    err.message.includes('mismatch') ||
    err.message.includes('required') ||
    err.message.includes('deadline') ||
    err.message.includes('Invalid ticket') ||
    err.message.includes('capacity')
  ) {
    statusCode = 400;
    errorMessage = err.message;
  } else if (err.message.includes('already been scanned')) {
    statusCode = 400;
    errorMessage = err.message;
  }

  return res.status(statusCode).json({
    error: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;
