const request = require('supertest');
const { app } = require('../../server');

// Use a test DB — set TEST_DATABASE_URL in .env.test
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup DB, close connections
});

describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'Test@1234',
    phone: `+9190${Date.now().toString().slice(-8)}`,
    role: 'customer',
  };

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.statusCode).toBe(409);
  });

  it('should reject weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, password: '123', email: 'new@test.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should reject invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validUser, email: 'not-an-email' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  const creds = { email: 'test@example.com', password: 'Test@1234' };

  it('should return 401 for unknown user', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Test@1234' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
