export const getPagination = (query, maxLimit = 100) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(maxLimit, Number(query.limit) || 20);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  data,
  meta: { page, pages: Math.ceil(total / limit) || 1, total, limit },
});
