/**
 * High-Order Zod Request Validator Middleware (DEC-011)
 * Validates request body, query params, or URL route params
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsedData = schema.parse(dataToValidate);
      req[source] = parsedData;
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        const primaryIssue = details.length > 0 ? `${details[0].field}: ${details[0].message}` : 'Schema validation failed';

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: `Incoming request payload failed schema validation constraints. (${primaryIssue})`,
            details
          }
        });
      }
      next(error);
    }
  };
};

export const validateBody = (schema) => validate(schema, 'body');
export const validateParams = (schema) => validate(schema, 'params');
export const validateQuery = (schema) => validate(schema, 'query');
