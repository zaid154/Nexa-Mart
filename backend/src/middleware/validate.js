// This middleware validates the request using a Zod schema.
// If the data is wrong, it sends a 400 error with a clear message.

export const validate = (schema) => (req, res, next) => {
  // Check the body, query and params against the schema.
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // If validation failed, join all the error messages into one string.
  // Zod v4 keeps the list on `issues`. (In v3 it was `errors`, which is
  // undefined here and used to crash this line with a confusing 500.)
  if (!result.success) {
    const messages = result.error.issues.map((e) => e.message);
    const message = messages.join(", ");
    res.status(400);
    return next(new Error(message));
  }

  // Replace the request data with the cleaned/validated data.
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
