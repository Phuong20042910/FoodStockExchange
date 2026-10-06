const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { predictNextPrice } = require('../services/predictor');
const { body, param } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');

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
router.get('/:id/history', [
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive integer'),
  checkValidationResult
], async (req, res) => {
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
router.get('/:id/predict', [
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive integer'),
  checkValidationResult
], async (req, res) => {
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

    // 2. Call local Node Predictor Service
    const predicted = predictNextPrice(prices);

    return res.json({
      predicted_price: Math.round(predicted),
      source: 'Local Node.js Predictor'
    });

  } catch (err) {
    console.error('Error fetching ML prediction:', err.message);
    // Fallback on error: return latest recorded price
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
router.post('/', auth('ADMIN'), [
  body('name').notEmpty().withMessage('Product name is required').isString(),
  body('category').notEmpty().withMessage('Category is required').isString(),
  body('base_price').notEmpty().withMessage('Base price is required').isFloat({ min: 0 }).withMessage('Base price must be a positive number'),
  body('min_price').notEmpty().withMessage('Min price is required').isFloat({ min: 0 }),
  body('max_price').notEmpty().withMessage('Max price is required').isFloat({ min: 0 }),
  body('elasticity_k').optional().isFloat(),
  body('image_url').optional().isURL().withMessage('Invalid image URL'),
  checkValidationResult
], async (req, res) => {
  const { name, category, image_url, base_price, min_price, max_price, elasticity_k } = req.body;

  try {
    const result = await db.query(`
      INSERT INTO products (name, category, image_url, base_price, current_price, min_price, max_price, elasticity_k)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
      RETURNING *
    `, [name, category, image_url, base_price, min_price, max_price, elasticity_k || 0.0100]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ message: err.message || 'Internal Server Error', detail: err.detail });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product details (Admin)
 *     tags: [Products]
 */
router.put('/:id', auth('ADMIN'), [
  param('id').isInt({ min: 1 }),
  body('name').optional().isString(),
  body('category').optional().isString(),
  body('base_price').optional().isFloat({ min: 0 }),
  body('min_price').optional().isFloat({ min: 0 }),
  body('max_price').optional().isFloat({ min: 0 }),
  body('elasticity_k').optional().isFloat(),
  body('image_url').optional().isURL(),
  checkValidationResult
], async (req, res) => {
  const { id } = req.params;
  const { name, category, image_url, base_price, min_price, max_price, elasticity_k } = req.body;

  try {
    const result = await db.query(`
      UPDATE products 
      SET 
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        image_url = COALESCE($3, image_url),
        base_price = COALESCE($4, base_price),
        min_price = COALESCE($5, min_price),
        max_price = COALESCE($6, max_price),
        elasticity_k = COALESCE($7, elasticity_k)
      WHERE id = $8
      RETURNING *
    `, [name, category, image_url, base_price, min_price, max_price, elasticity_k, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: err.message || 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/products/{id}/toggle-trading:
 *   patch:
 *     summary: Toggle product trading availability (Kitchen / Admin Out-Of-Stock trigger)
 *     tags: [Products]
 */
router.patch('/:id/toggle-trading', auth(['ADMIN', 'KITCHEN']), [
  param('id').isInt({ min: 1 }).withMessage('Product ID must be a valid positive integer'),
  checkValidationResult
], async (req, res) => {
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

