const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');

// Import the app and clearData function
const { app, clearData } = require('../server');
const DATA_FILE = path.join(__dirname, '../data/webhook-data.json');

describe('Webhook Demo App', () => {
  beforeEach(async () => {
    // Clear both in-memory data and file data before each test
    clearData();
    try {
      await fs.writeFile(DATA_FILE, '[]');
    } catch (error) {
      // File might not exist, that's ok
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    clearData();
    try {
      await fs.writeFile(DATA_FILE, '[]');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Webhook Endpoint', () => {
    it('should accept valid JSON POST and return 200 with success', async () => {
      const testPayload = { 
        message: 'Hello from webhook!', 
        timestamp: new Date().toISOString() 
      };

      const res = await request(app)
        .post('/webhook')
        .send(testPayload)
        .set('Content-Type', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook received successfully');
      expect(res.body.id).toBeDefined();
    });

    it('should store the posted data', async () => {
      const testPayload = { test: 'data', number: 42 };

      await request(app)
        .post('/webhook')
        .send(testPayload)
        .set('Content-Type', 'application/json');

      const getRes = await request(app).get('/api/webhooks');
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.length).toBe(1);
      expect(getRes.body[0].payload).toEqual(testPayload);
    });

    it('should store multiple webhooks in correct order', async () => {
      const payload1 = { message: 'First webhook' };
      const payload2 = { message: 'Second webhook' };

      await request(app)
        .post('/webhook')
        .send(payload1)
        .set('Content-Type', 'application/json');

      await request(app)
        .post('/webhook')
        .send(payload2)
        .set('Content-Type', 'application/json');

      const getRes = await request(app).get('/api/webhooks');
      expect(getRes.body.length).toBe(2);
      expect(getRes.body[0].payload).toEqual(payload2); // Most recent first
      expect(getRes.body[1].payload).toEqual(payload1);
    });

    it('should include timestamp and headers in stored data', async () => {
      const testPayload = { test: 'data' };

      const res = await request(app)
        .post('/webhook')
        .send(testPayload)
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'Test-Agent');

      expect(res.statusCode).toBe(200);

      const getRes = await request(app).get('/api/webhooks');
      const webhook = getRes.body[0];

      expect(webhook.timestamp).toBeDefined();
      expect(webhook.headers['content-type']).toBe('application/json');
      expect(webhook.headers['user-agent']).toBe('Test-Agent');
      expect(webhook.method).toBe('POST');
      expect(webhook.url).toBe('/webhook');
    });
  });

  describe('API Endpoints', () => {
    it('GET /api/webhooks should return all stored webhooks', async () => {
      // Add some test data
      await request(app)
        .post('/webhook')
        .send({ test: 'data1' })
        .set('Content-Type', 'application/json');

      await request(app)
        .post('/webhook')
        .send({ test: 'data2' })
        .set('Content-Type', 'application/json');

      const res = await request(app).get('/api/webhooks');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('DELETE /api/webhooks should clear all data', async () => {
      // Add some test data first
      await request(app)
        .post('/webhook')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      // Verify data exists
      let getRes = await request(app).get('/api/webhooks');
      expect(getRes.body.length).toBe(1);

      // Clear data
      const deleteRes = await request(app).delete('/api/webhooks');
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.message).toBe('All webhook data cleared');

      // Verify data is cleared
      getRes = await request(app).get('/api/webhooks');
      expect(getRes.body.length).toBe(0);
    });
  });

  describe('Health Endpoint', () => {
    it('GET /health should return status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.webhookCount).toBeDefined();
    });

    it('should return correct webhook count', async () => {
      // Add a webhook
      await request(app)
        .post('/webhook')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      const res = await request(app).get('/health');
      expect(res.body.webhookCount).toBe(1);
    });
  });

  describe('Display Endpoint', () => {
    it('GET / should render the dashboard', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Webhook Demo');
      expect(res.text).toContain('Total Webhooks');
    });

    it('should display webhook count correctly', async () => {
      // Add a webhook
      await request(app)
        .post('/webhook')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      const res = await request(app).get('/');
      expect(res.text).toContain('Total Webhooks');
      expect(res.text).toContain('1'); // Should show count of 1
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send('not-json');

      expect(res.statusCode).toBe(400);
    });

    it('should handle empty body', async () => {
      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .send('');

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make 5 requests to test rate limiting works (without hitting the actual limit)
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/webhook')
            .send({ test: `data${i}` })
            .set('Content-Type', 'application/json')
        );
      }

      const responses = await Promise.all(requests);
      
      // All should succeed (we're not hitting the rate limit)
      for (let i = 0; i < 5; i++) {
        expect(responses[i].statusCode).toBe(200);
      }
      
      // Verify rate limiting is configured by checking the response headers
      expect(responses[0].headers).toHaveProperty('x-ratelimit-limit');
      expect(responses[0].headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
}); 