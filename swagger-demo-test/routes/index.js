const express = require('express');
const router = express.Router();

// Welcome route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to swagger-demo-test API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API status route
router.get('/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'operational',
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    }
  });
});

module.exports = router;