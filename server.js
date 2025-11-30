/**
 * Main Server Entry Point
 * Express server with Groq integration and token splitting
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const webhookRouter = require('./webhooks/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for frontend
app.use(express.json({ limit: '10mb' })); // Allow large payloads for long messages
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (HTML frontend)
app.use(express.static('public'));

// Root route - serve the web interface
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    tokenLimits: {
      maxInputTokens: 6000,
      maxOutputTokens: 500,
      maxTotalTokens: 6500
    }
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'FlowState Conversational Bot API',
    version: '1.0.0',
    description: 'NLP-powered task management and conversational assistant',
    endpoints: {
      health: 'GET /health',
      webhook: 'POST /api/webhook',
      apiInfo: 'GET /api'
    },
    features: [
      'Task management (create, list, complete, delete)',
      'Note taking and management',
      'Focus mode timer',
      'Math calculations',
      'Natural language understanding',
      'Priority management',
      'Context-aware conversations'
    ],
    example: {
      endpoint: '/api/webhook',
      method: 'POST',
      body: {
        userId: 'user123',
        message: 'create a task to review code'
      }
    }
  });
});

// Webhook routes
app.use('/api', webhookRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Token limits configured:`);
  console.log(`   - Max input tokens per call: 6000`);
  console.log(`   - Max output tokens per call: 500`);
  console.log(`   - Max total tokens per call: 6500`);
  console.log(`\n✅ Token splitting enabled for long inputs\n`);
});

module.exports = app;
