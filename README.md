# Webhook Demo App

A minimal Node.js + Express app that accepts webhook POSTs, saves JSON data to a local store, and displays received webhooks in a modern web UI (EJS).

## Features
- Accepts POST requests at `/webhook` (Content-Type: application/json)
- Stores webhook payloads and headers in memory and persists to disk
- Displays received webhooks in a clean, responsive dashboard
- Clear all data and refresh UI
- Example cURL for testing
- Comprehensive test suite with Jest and Supertest

## Setup

```bash
npm install
npm run dev
```

- App runs at: [http://localhost:3000](http://localhost:3000)
- Webhook endpoint: [http://localhost:3000/webhook](http://localhost:3000/webhook)

## Testing

```bash
npm test
```

The test suite covers:
- Webhook endpoint functionality
- API endpoints (GET, DELETE)
- Health check endpoint
- Display endpoint rendering
- Error handling
- Rate limiting
- Data persistence

## Sending a Webhook

Example cURL:
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from webhook!", "timestamp": "2024-01-01T00:00:00Z"}'
```

## Project Structure
```
webhook-demo/
├── package.json
├── server.js
├── jest.config.js
├── tests/
│   └── server.test.js
├── data/
│   └── webhook-data.json
├── views/
│   ├── layout.ejs
│   └── index.ejs
├── public/
│   ├── styles.css
│   └── script.js
└── README.md
```

## License
MIT 