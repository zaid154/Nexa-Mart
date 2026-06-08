export const success = (res, data, status = 200, meta) => {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};

export const legacy = (res, payload, status = 200) => res.status(status).json(payload);
