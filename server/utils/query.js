function parseQuery(query = {}, allowedFilters = []) {
  const { page = 1, limit = 10, pageSize, sort } = query;
  const l = pageSize !== undefined ? pageSize : limit;
  const limitNum = Math.min(parseInt(l, 10) || 10, 100);
  const pageNum = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  if (sort) {
    sort.split(',').forEach((field) => {
      if (!field) return;
      const direction = field.startsWith('-') ? -1 : 1;
      const key = field.replace(/^-/, '');
      sortObj[key] = direction;
    });
  }

  const filters = {};
  allowedFilters.forEach((f) => {
    if (query[f] !== undefined) {
      filters[f] = query[f];
    }
  });

  return { limit: limitNum, skip, sort: sortObj, filters };
}

module.exports = { parseQuery };
