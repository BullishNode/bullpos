/**
 * Integration tests for authentication flows
 * Tests: registration, login, JWT token validation, and auth middleware
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import { generateTestMerchant, TEST_JWT_SECRET } from '../setup.js';
import jwt from 'jsonwebtoken';

describe('Authentication Integration Tests', () => {
  describe('POST /api/merchants/register', () => {
    it('should register a new merchant and return JWT token', async () => {
      const merchantData = generateTestMerchant('1');

      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchantData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('merchantId');
      expect(typeof response.body.token).toBe('string');
      expect(typeof response.body.merchantId).toBe('string');

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.token, TEST_JWT_SECRET) as any;
      expect(decoded).toHaveProperty('merchantId');
      expect(decoded.merchantId).toBe(response.body.merchantId);
    });

    it('should reject registration with missing email', async () => {
      const invalidData = {
        password: 'Test123!@#',
        storeName: 'Test Store',
        pgpPublicKey: 'test-key',
      };

      await request(app)
        .post('/api/merchants/register')
        .send(invalidData)
        .expect(400);
    });

    it('should reject registration with invalid email format', async () => {
      const invalidData = generateTestMerchant('2');
      invalidData.email = 'not-an-email';

      await request(app)
        .post('/api/merchants/register')
        .send(invalidData)
        .expect(400);
    });

    it('should reject registration with weak password', async () => {
      const invalidData = generateTestMerchant('3');
      invalidData.password = '123'; // Too short

      await request(app)
        .post('/api/merchants/register')
        .send(invalidData)
        .expect(400);
    });

    it('should reject duplicate email registration', async () => {
      const merchantData = generateTestMerchant('4');

      // First registration should succeed
      await request(app)
        .post('/api/merchants/register')
        .send(merchantData)
        .expect(201);

      // Second registration with same email should fail
      await request(app)
        .post('/api/merchants/register')
        .send(merchantData)
        .expect(409);
    });
  });

  describe('POST /api/auth/login', () => {
    const merchantData = generateTestMerchant('login');
    let merchantId: string;

    beforeEach(async () => {
      // Register a merchant for login tests
      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchantData);
      merchantId = response.body.merchantId;
    });

    it('should login with valid credentials and return JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('merchantId');
      expect(response.body.merchantId).toBe(merchantId);

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, TEST_JWT_SECRET) as any;
      expect(decoded.merchantId).toBe(merchantId);
    });

    it('should reject login with invalid email', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: merchantData.password,
        })
        .expect(401);
    });

    it('should reject login with invalid password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should reject login with missing credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('Auth Middleware - Protected Routes', () => {
    let token: string;
    let merchantId: string;

    beforeEach(async () => {
      // Register and get token
      const merchantData = generateTestMerchant('protected');
      const response = await request(app)
        .post('/api/merchants/register')
        .send(merchantData);
      token = response.body.token;
      merchantId = response.body.merchantId;
    });

    it('should allow access to protected route with valid token', async () => {
      await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should reject access without token', async () => {
      await request(app)
        .get('/api/merchants/profile')
        .expect(401);
    });

    it('should reject access with malformed token', async () => {
      await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject access with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { merchantId },
        TEST_JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject access with invalid token signature', async () => {
      // Create token with wrong secret
      const invalidToken = jwt.sign(
        { merchantId },
        'wrong-secret',
        { expiresIn: '7d' }
      );

      await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject access without Bearer prefix', async () => {
      await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', token)
        .expect(401);
    });
  });

  describe('Complete Registration → Login Flow', () => {
    it('should complete full registration and login cycle', async () => {
      const merchantData = generateTestMerchant('fullflow');

      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/merchants/register')
        .send(merchantData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('token');
      const registrationToken = registerResponse.body.token;
      const merchantId = registerResponse.body.merchantId;

      // Step 2: Use registration token to access profile
      const profileResponse1 = await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(200);

      expect(profileResponse1.body).toHaveProperty('email', merchantData.email);
      expect(profileResponse1.body).toHaveProperty('storeName', merchantData.storeName);

      // Step 3: Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
      expect(loginResponse.body.merchantId).toBe(merchantId);
      const loginToken = loginResponse.body.token;

      // Step 4: Use login token to access profile
      const profileResponse2 = await request(app)
        .get('/api/merchants/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse2.body).toHaveProperty('email', merchantData.email);
      expect(profileResponse2.body).toHaveProperty('storeName', merchantData.storeName);

      // Verify both tokens work for the same account
      expect(profileResponse1.body.merchantId).toBe(profileResponse2.body.merchantId);
    });
  });
});
