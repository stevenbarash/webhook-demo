const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Import the app and clearData function
const { app, clearData } = require('../server');
const DATA_FILE = path.join(__dirname, '../data/webhook-data.json');

const TEST_NAMESPACE1 = 'testns1';
const TEST_NAMESPACE2 = 'testns2';

describe('Webhook Demo App (Namespace Support)', () => {
  beforeEach(async () => {
    // Clear both in-memory data and file data before each test
    clearData();
    try {
      await fs.writeFile(DATA_FILE, '{}');
    } catch (error) {
      // File might not exist, that's ok
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    clearData();
    try {
      await fs.writeFile(DATA_FILE, '{}');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Webhook Endpoint', () => {
    it('should accept valid JSON POST and return 200 with success (namespace)', async () => {
      const testPayload = { message: 'Hello from webhook!', timestamp: new Date().toISOString() };
      const res = await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send(testPayload)
        .set('Content-Type', 'application/json');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook received successfully');
      expect(res.body.id).toBeDefined();
    });

    it('should store the posted data in the correct namespace', async () => {
      const testPayload = { test: 'data', number: 42 };
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send(testPayload)
        .set('Content-Type', 'application/json');
      const getRes = await request(app).get(`/api/webhooks/${TEST_NAMESPACE1}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.length).toBe(1);
      expect(getRes.body[0].payload).toEqual(testPayload);
    });

    it('should isolate data between namespaces', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'ns1' })
        .set('Content-Type', 'application/json');
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE2}`)
        .send({ test: 'ns2' })
        .set('Content-Type', 'application/json');
      const res1 = await request(app).get(`/api/webhooks/${TEST_NAMESPACE1}`);
      const res2 = await request(app).get(`/api/webhooks/${TEST_NAMESPACE2}`);
      expect(res1.body.length).toBe(1);
      expect(res2.body.length).toBe(1);
      expect(res1.body[0].payload).toEqual({ test: 'ns1' });
      expect(res2.body[0].payload).toEqual({ test: 'ns2' });
    });
  });

  describe('API Endpoints', () => {
    it('GET /api/webhooks/:namespace should return all stored webhooks for that namespace', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data1' })
        .set('Content-Type', 'application/json');
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data2' })
        .set('Content-Type', 'application/json');
      const res = await request(app).get(`/api/webhooks/${TEST_NAMESPACE1}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('DELETE /api/webhooks/:namespace should clear only that namespace', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE2}`)
        .send({ test: 'other' })
        .set('Content-Type', 'application/json');
      // Clear ns1
      const deleteRes = await request(app).delete(`/api/webhooks/${TEST_NAMESPACE1}`);
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      // ns1 should be empty, ns2 should still have data
      const getRes1 = await request(app).get(`/api/webhooks/${TEST_NAMESPACE1}`);
      const getRes2 = await request(app).get(`/api/webhooks/${TEST_NAMESPACE2}`);
      expect(getRes1.body.length).toBe(0);
      expect(getRes2.body.length).toBe(1);
    });
  });

  describe('Health Endpoint', () => {
    it('GET /health/:namespace should return status ok and correct count', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      const res = await request(app).get(`/health/${TEST_NAMESPACE1}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.webhookCount).toBe(1);
      expect(res.body.namespace).toBe(TEST_NAMESPACE1);
    });
    it('GET /health should return global stats', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE2}`)
        .send({ test: 'data2' })
        .set('Content-Type', 'application/json');
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.webhookCount).toBe(2);
      expect(res.body.namespaces).toContain(TEST_NAMESPACE1);
      expect(res.body.namespaces).toContain(TEST_NAMESPACE2);
    });
  });

  describe('Landing Page', () => {
    it('GET /webhook should list all namespaces', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE2}`)
        .send({ test: 'data2' })
        .set('Content-Type', 'application/json');
      const res = await request(app).get('/webhook');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain(TEST_NAMESPACE1);
      expect(res.text).toContain(TEST_NAMESPACE2);
    });
  });

  describe('Display Endpoint', () => {
    it('GET /webhook/:namespace should render the dashboard for that namespace', async () => {
      await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      const res = await request(app).get(`/webhook/${TEST_NAMESPACE1}`);
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Webhook Demo');
      expect(res.text).toContain('Total Webhooks');
      expect(res.text).toContain('1');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .set('Content-Type', 'application/json')
        .send('not-json');
      expect(res.statusCode).toBe(400);
    });
    it('should handle empty body', async () => {
      const res = await request(app)
        .post(`/webhook/${TEST_NAMESPACE1}`)
        .set('Content-Type', 'application/json')
        .send('');
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per namespace', async () => {
      // Make 5 requests to test rate limiting works (without hitting the actual limit)
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post(`/webhook/${TEST_NAMESPACE1}`)
            .send({ test: `data${i}` })
            .set('Content-Type', 'application/json')
        );
      }
      const responses = await Promise.all(requests);
      for (let i = 0; i < 5; i++) {
        expect(responses[i].statusCode).toBe(200);
      }
      expect(responses[0].headers).toHaveProperty('x-ratelimit-limit');
      expect(responses[0].headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
}); 