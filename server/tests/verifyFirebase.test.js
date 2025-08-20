const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');

jest.mock('../lib/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../services/authService', () => ({
  createUserIfNew: jest.fn(),
  issueResetTokenForPhone: jest.fn(),
}));

const { verifyIdToken } = require('../lib/firebaseAdmin');
const { createUserIfNew, issueResetTokenForPhone } = require('../services/authService');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('verify-firebase', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('handles signup flow', async () => {
    verifyIdToken.mockResolvedValue({ phone_number: '+911234567890' });
    createUserIfNew.mockResolvedValue({ user: { id: '1', phone: '+911234567890' }, token: 'jwt' });

    const res = await request(app).post('/auth/verify-firebase').send({
      idToken: 'token',
      purpose: 'signup',
      signupDraft: {
        name: 'A',
        phone: '+911234567890',
        password: 'secret123',
        location: 'Loc',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(createUserIfNew).toHaveBeenCalled();
  });

  it('rejects invalid token', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    const res = await request(app).post('/auth/verify-firebase').send({
      idToken: 'bad',
      purpose: 'reset',
    });
    expect(res.status).toBe(400);
  });
});
