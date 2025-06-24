const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, '../data/webhook-data.json');
let webhookData = {};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting per-namespace+IP
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const ns = req.params.namespace || 'default';
    return `${ns}:${req.ip}`;
  },
  message: 'Too many webhook requests from this IP/namespace, please try again later.'
});

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Load existing data on startup
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    webhookData = JSON.parse(data);
    if (Array.isArray(webhookData)) {
      // Migrate old array format to object with default namespace
      webhookData = { default: webhookData };
    }
  } catch (error) {
    webhookData = {};
  }
}

// Save data to file
async function saveData() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(webhookData, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Clear data function for testing
function clearData(namespace) {
  if (namespace) {
    webhookData[namespace] = [];
  } else {
    webhookData = {};
  }
}

// Helper to get webhooks for a namespace
function getNamespaceData(namespace) {
  if (!webhookData[namespace]) webhookData[namespace] = [];
  return webhookData[namespace];
}

// Landing page: list namespaces
app.get(['/webhook', '/webhook/'], (req, res) => {
  const namespaces = Object.keys(webhookData);
  res.render('landing', { namespaces });
});

// Webhook dashboard for namespace
app.get('/webhook/:namespace', (req, res) => {
  const { namespace } = req.params;
  const webhooks = getNamespaceData(namespace);
  res.render('index', {
    webhooks,
    totalCount: webhooks.length,
    namespace
  });
});

// Webhook endpoint for namespace (API)
app.post('/api/webhooks/:namespace', webhookLimiter, async (req, res) => {
  const { namespace } = req.params;
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body cannot be empty'
      });
    }
    const webhookEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      payload: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    };
    const nsData = getNamespaceData(namespace);
    nsData.unshift(webhookEntry);
    if (nsData.length > 100) {
      webhookData[namespace] = nsData.slice(0, 100);
    }
    await saveData();
    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      id: webhookEntry.id
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Webhook endpoint for namespace (legacy route for tests)
app.post('/webhook/:namespace', webhookLimiter, async (req, res) => {
  const { namespace } = req.params;
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body cannot be empty'
      });
    }
    const webhookEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      payload: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    };
    const nsData = getNamespaceData(namespace);
    nsData.unshift(webhookEntry);
    if (nsData.length > 100) {
      webhookData[namespace] = nsData.slice(0, 100);
    }
    await saveData();
    res.status(200).json({
      success: true,
      message: 'Webhook received successfully',
      id: webhookEntry.id
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// API endpoint to get webhook data for namespace
app.get('/api/webhooks/:namespace', (req, res) => {
  const { namespace } = req.params;
  res.json(getNamespaceData(namespace));
});

// Clear data endpoint for namespace
app.delete('/api/webhooks/:namespace', async (req, res) => {
  const { namespace } = req.params;
  try {
    webhookData[namespace] = [];
    await saveData();
    res.json({ success: true, message: `All webhook data cleared for ${namespace}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing data' });
  }
});

// Health check endpoint (global)
app.get('/health', (req, res) => {
  // global stats
  const total = Object.values(webhookData).reduce((sum, arr) => sum + arr.length, 0);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhookCount: total,
    namespaces: Object.keys(webhookData)
  });
});

// Health check endpoint (per-namespace)
app.get('/health/:namespace', (req, res) => {
  const { namespace } = req.params;
  const webhooks = getNamespaceData(namespace);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    webhookCount: webhooks.length,
    namespace
  });
});

// Root dashboard: show all webhooks from all namespaces
app.get('/', (req, res) => {
  // Gather all webhooks from all namespaces
  const allWebhooks = Object.entries(webhookData)
    .flatMap(([namespace, arr]) => arr.map(w => ({ ...w, namespace })));
  // Sort by timestamp descending
  allWebhooks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.render('index', {
    webhooks: allWebhooks,
    totalCount: allWebhooks.length,
    namespace: undefined
  });
});

// Vercel handler export
let dataLoaded = false;
const vercelHandler = async (req, res) => {
  if (!dataLoaded) {
    await loadData();
    dataLoaded = true;
  }
  app(req, res);
};

if (process.env.NODE_ENV === 'test') {
  module.exports = { app, clearData };
} else {
  module.exports = vercelHandler;
}

// Local dev entrypoint
if (require.main === module) {
  loadData().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Webhook demo server running on http://localhost:${port}`);
      console.log(`Landing page: http://localhost:${port}/webhook`);
      console.log(`Namespace dashboard: http://localhost:${port}/webhook/your-namespace`);
    });
  });
}

// WARNING: On Vercel, file system is ephemeral. Data will NOT persist between deployments or serverless invocations. For production, use a database or external storage. 