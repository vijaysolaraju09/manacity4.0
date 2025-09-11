const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error');
const AppError = require('../utils/AppError');

describe('error handler', () => {
  it('returns detailed errors', async () => {
    const app = express();
    app.get('/err', () => {
      throw AppError.internal('INTERNAL_ERROR', 'Test failure');
    });
    app.use(errorHandler);

    const res = await request(app).get('/err');
    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Test failure');
    expect(res.body.error.stack).toBeDefined();
  });
});
