import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected internal server error occurred.';
  let details = null;

  // Handle SyntaxError (malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    errorCode = 'INVALID_JSON_BODY';
    message = 'Malformed JSON payload in request body.';
  }

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_RESOURCE_ID';
    message = `Invalid format for resource identifier parameter '${err.path}'.`;
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'RESOURCE_ALREADY_EXISTS';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A resource with the specified '${field}' already exists.`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'DATABASE_VALIDATION_ERROR';
    message = 'Data persistence validation failed.';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Zod Custom Error
  if (err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'INPUT_VALIDATION_ERROR';
    message = 'Input payload failed schema validation.';
    details = err.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message
    }));
  }

  // Log error stack in development/testing
  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode} ${errorCode}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
