const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Retrieve list of all menu products
 *     tags: [Products]
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id ASC');
    const products = result.rows.map(p => ({
      ...p,
      base_price: parseFloat(p.base_price),
      current_price: parseFloat(p.current_price),
      min_price: parseFloat(p.min_price),
      max_price: parseFloat(p.max_price),
      elasticity_k: parseFloat(p.elasticity_k)
    }));
    return res.json(products);
  } catch (err) {
    console.error('Fetch products error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/products/{id}/history:
 *   get:
 *     summary: Get price history of a product for chart plotting
 *     tags: [Products]
 */
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT recorded_price, change_percentage, timestamp 
      FROM price_history 
      WHERE product_id = $1 
      ORDER BY timestamp ASC 
      LIMIT 100
    `, [id]);

    const history = result.rows.map(h => ({
      price: parseFloat(h.recorded_price),
      change: parseFloat(h.change_percentage),
      time: new Date(h.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }));

    return res.json(history);
  } catch (err) {
    console.error('Fetch product history error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/products/{id}/predict:
 *   get:
 *     summary: Get machine learning price forecast for the next tick (Delegated to Python FastAPI Service)
 *     tags: [Products]
 */
router.get('/:id/predict', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch recent price history (last 15 records)
    const historyRes = await db.query(`
      SELECT recorded_price FROM price_history 
      WHERE product_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 15
    `, [id]);

    if (historyRes.rows.length === 0) {
      // Fallback if no history yet: return current price
      const prodRes = await db.query('SELECT current_price FROM products WHERE id = $1', [id]);
      const currentPrice = prodRes.rows[0] ? parseFloat(prodRes.rows[0].current_price) : 0.0;
      return res.json({ predicted_price: currentPrice, source: 'current_fallback' });
    }

    // Convert history list (ordered newest to oldest) to list of floats, and reverse it (oldest to newest for ML)
    const prices = historyRes.rows.map(h => parseFloat(h.recorded_price)).reverse();

    // 2. Call Python FastAPI predict service
    const pythonPredictUrl = 'http://localhost:8000/ai/predict';
    const response = await fetch(pythonPredictUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prices })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({
        predicted_price: Math.round(data.predicted_price),
        source: 'Scikit-Learn ML LinearRegression'
      });
    } else {
      throw new Error('Python ML Predictor failed');
    }

  } catch (err) {
    console.error('Error fetching ML prediction from Python service:', err.message);
    // Fallback if Python is down: return latest recorded price
    const prodRes = await db.query('SELECT current_price FROM products WHERE id = $1', [id]);
    const currentPrice = prodRes.rows[0] ? parseFloat(prodRes.rows[0].current_price) : 0.0;
    return res.json({
      predicted_price: currentPrice,
      source: 'offline_fallback'
    });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin)
 *     tags: [Products]
 */
router.post('/', auth('ADMIN'), async (req, res) => {
  const { name, category, image_url, base_price, min_price, max_price, elasticity_k } = req.body;
  if (!name || !category || !base_price || !min_price || !max_price) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    const result = await db.query(`
      INSERT INTO products (name, category, image_url, base_price, current_price, min_price, max_price, elasticity_k)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
      RETURNING *
    `, [name, category, image_url, base_price, min_price, max_price, elasticity_k || 0.0100]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/products/{id}/toggle-trading:
 *   patch:
 *     summary: Toggle product trading availability (Kitchen / Admin Out-Of-Stock trigger)
 *     tags: [Products]
 */
router.patch('/:id/toggle-trading', auth(['ADMIN', 'KITCHEN']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE products SET is_trading = NOT is_trading WHERE id = $1 RETURNING id, name, is_trading',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const io = req.app.get('socketio');
    if (io) {
      io.emit('PRODUCT_TRADING_TOGGLED', result.rows[0]);
    }

    return res.json({
      message: `Tải trạng thái giao dịch cho ${result.rows[0].name} thành ${result.rows[0].is_trading ? 'ĐANG MỞ' : 'TẠM DỪNG (HẾT NGUYÊN LIỆU)'}`,
      product: result.rows[0]
    });
  } catch (err) {
    console.error('Toggle trading error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;

