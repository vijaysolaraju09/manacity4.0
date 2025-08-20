import { parsePagination, applyPagination, PaginationOptions } from '../utils/pagination';

describe('pagination helper', () => {
  it('parses pagination query with sorting', () => {
    const opts = parsePagination({ page: '2', limit: '5', sort: '-createdAt,ratingAvg' });
    expect(opts.page).toBe(2);
    expect(opts.limit).toBe(5);
    expect(opts.skip).toBe(5);
    expect(opts.sort).toEqual({ createdAt: -1, ratingAvg: 1 });
  });

  it('applies pagination to mongoose query', () => {
    const skip = jest.fn().mockReturnThis();
    const limit = jest.fn().mockReturnThis();
    const sort = jest.fn().mockReturnThis();
    const lean = jest.fn().mockReturnThis();
    const select = jest.fn().mockReturnThis();
    const query: any = { skip, limit, sort, lean, select };
    const options: PaginationOptions = {
      page: 1,
      limit: 2,
      skip: 0,
      sort: { createdAt: -1 },
      lean: true,
    } as any;
    applyPagination(query, options, { name: 1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(2);
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(lean).toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith({ name: 1 });
  });
});
