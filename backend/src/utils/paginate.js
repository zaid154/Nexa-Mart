// Helper functions for paging through long lists of data.

// Read "page" and "limit" from the query and work out how many to skip.
export const getPagination = (query, maxLimit = 100) => {
  // Page is at least 1.
  const page = Math.max(1, Number(query.page) || 1);

  // Limit is at most maxLimit (default 20 per page).
  const limit = Math.min(maxLimit, Number(query.limit) || 20);

  // How many documents to skip to reach this page.
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

// Build a standard paginated response object.
export const paginatedResponse = (data, total, page, limit) => {
  // Total number of pages (at least 1).
  const pages = Math.ceil(total / limit) || 1;

  return {
    success: true,
    data,
    meta: { page, pages, total, limit },
  };
};
