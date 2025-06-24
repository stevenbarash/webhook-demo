# Webhook Demo App

A minimal Node.js + Express app (now using **Express 5**) that accepts webhook POSTs, saves JSON data to a local store, and displays received webhooks in a modern web UI (EJS).

## Requirements
- Node.js 18 or higher
- Express 5 (see [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html))

## Features
- Accepts POST requests at `/webhook/:namespace` (Content-Type: application/json)
- Each namespace is isolated: data posted to `/webhook/steven` is only visible at `/webhook/steven`
- Stores webhook payloads and headers in memory and persists to disk
- Displays received webhooks in a clean, responsive dashboard per namespace
- **Root dashboard at `/` shows all webhooks from all namespaces, with namespace labels**
- Clear all data and refresh UI per namespace
- Landing page at `/webhook` to list and create namespaces
- Example cURL for testing
- Comprehensive test suite with Jest and Supertest

## Setup

```bash
npm install
npm run dev
```

- App runs at: [http://localhost:3000](http://localhost:3000)
- **Root dashboard:** [http://localhost:3000/](http://localhost:3000/) — all webhooks from all namespaces, with namespace labels
- **Namespace dashboard:** [http://localhost:3000/webhook/:namespace](http://localhost:3000/webhook/:namespace) — only that namespace's webhooks
- **Landing page:** [http://localhost:3000/webhook](http://localhost:3000/webhook) — list and create namespaces

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

Example cURL (for namespace `steven`):
```bash
curl -X POST http://localhost:3000/webhook/steven \
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
│   ├── index.ejs
│   └── landing.ejs
├── public/
│   ├── styles.css
│   └── script.js
└── README.md
```

## License
MIT 

## Vercel Hosting Warning

**Note:** When deployed to Vercel, the file system is ephemeral. This means webhook data stored in `data/webhook-data.json` will NOT persist between deployments or serverless function invocations. For production use, you must use a database or external storage for persistence. 

## Usage

- To view all webhooks from all namespaces, go to [http://localhost:3000/](http://localhost:3000/)
- To view webhooks for a specific namespace, go to [http://localhost:3000/webhook/your-namespace](http://localhost:3000/webhook/your-namespace)
- To list or create namespaces, go to [http://localhost:3000/webhook](http://localhost:3000/webhook) 

- Uses Express 5's built-in body parsing (no need for body-parser) 