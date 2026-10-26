// Request validation middleware using Zod schemas.

export const validate = (schema) => (req, res, next) => {
  // Validate request body, query, and path parameters
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // If validation fails, extract error messages and pass to error handler
  if (!result.success) {
    const messages = result.error.issues.map((e) => e.message);
    const message = messages.join(", ");
    res.status(400);
    return next(new Error(message));
  }

  // Attach sanitized data back to request
  if (result.data.body) {
    req.body = result.data.body;
  }
  if (result.data.query) {
    req.query = result.data.query;
  }
  if (result.data.params) {
    req.params = result.data.params;
  }

  next();
};
