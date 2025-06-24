const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, '../data/webhook-data.json');
let webhookData = [];

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many webhook requests from this IP, please try again later.'
});

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Load existing data on startup
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    webhookData = JSON.parse(data);
  } catch (error) {
    webhookData = [];
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
function clearData() {
  webhookData = [];
}

// Webhook endpoint
app.post('/webhook', webhookLimiter, async (req, res) => {
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
    webhookData.unshift(webhookEntry);
    if (webhookData.length > 100) {
      webhookData = webhookData.slice(0, 100);
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

// Display endpoint
app.get('/', (req, res) => {
  res.render('index', { 
    webhooks: webhookData,
    totalCount: webhookData.length
  });
});

// API endpoint to get webhook data
app.get('/api/webhooks', (req, res) => {
  res.json(webhookData);
});

// Clear data endpoint
app.delete('/api/webhooks', async (req, res) => {
  try {
    webhookData = [];
    await saveData();
    res.json({ success: true, message: 'All webhook data cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error clearing data' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    webhookCount: webhookData.length 
  });
});

// Vercel handler export
let dataLoaded = false;
module.exports = async (req, res) => {
  if (!dataLoaded) {
    await loadData();
    dataLoaded = true;
  }
  app(req, res);
};

// WARNING: On Vercel, file system is ephemeral. Data will NOT persist between deployments or serverless invocations. For production, use a database or external storage. 