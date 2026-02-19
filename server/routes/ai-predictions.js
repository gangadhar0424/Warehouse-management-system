const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8001';

// Proxy requests to AI engine
const proxyToAI = async (endpoint, method = 'GET', data = null, query = {}) => {
  try {
    const config = {
      method,
      url: `${AI_ENGINE_URL}${endpoint}`,
      params: query,
      timeout: 30000
    };
    if (data) config.data = data;
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`AI Engine error (${endpoint}):`, error.message);
    throw new Error(error.response?.data?.detail || error.response?.data?.error || 'AI Engine unavailable');
  }
};

// POST /api/ai/chat - Chat with AI assistant
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, context } = req.body;
    const result = await proxyToAI('/chat', 'POST', {
      message,
      userId: req.user.id,
      role: req.user.role,
      history: context?.history || []
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, response: 'AI service is currently unavailable. Please try again later.' });
  }
});

// POST /api/ai/inventory/analyze - Inventory intelligence
router.post('/inventory/analyze', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/inventory/analyze', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/weighbridge/analyze - Weighbridge fraud detection
router.post('/weighbridge/analyze', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/weighbridge/analyze', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/loan-risk/assess - Loan risk assessment
router.post('/loan-risk/assess', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/loan-risk/assess', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/market/predict - Market price prediction
router.post('/market/predict', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/market/predict', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/demand/predict - Demand & storage duration prediction
router.post('/demand/predict', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/demand/predict', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/anomaly/detect - Anomaly & fraud detection
router.post('/anomaly/detect', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/anomaly/detect', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/ai/anomaly/alerts - Get fraud alerts
router.get('/anomaly/alerts', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/anomaly/alerts', 'GET');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message, alerts: [] });
  }
});

// POST /api/ai/predict-duration - Storage duration prediction for specific grain allocation
router.post('/predict-duration', auth, async (req, res) => {
  try {
    const result = await proxyToAI('/predict-duration', 'POST', req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ai/health - Check AI engine health
router.get('/health', async (req, res) => {
  try {
    const result = await proxyToAI('/health', 'GET');
    res.json({ status: 'connected', ai_engine: result });
  } catch (error) {
    res.json({ status: 'disconnected', error: error.message });
  }
});

module.exports = router;
