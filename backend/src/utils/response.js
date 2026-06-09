// Small helper functions to send JSON responses in a consistent shape.

// Send a successful response: { success: true, data, meta? }
export const success = (res, data, status = 200, meta) => {
  const body = { success: true, data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(status).json(body);
};

// Send a response exactly as given (used for older/legacy formats).
export const legacy = (res, payload, status = 200) => {
  return res.status(status).json(payload);
};
