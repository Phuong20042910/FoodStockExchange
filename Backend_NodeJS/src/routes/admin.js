const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const pricingEngine = require('../services/pricingEngine');

/**
 * @swagger
 * /api/admin/market/crash:
 *   post:
 *     summary: Trigger a market crash (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Market crash triggered
 */
router.post('/market/crash', auth('ADMIN'), async (req, res) => {
  try {
    const io = req.app.get('socketio');
    await pricingEngine.triggerMarketCrash(io);
    return res.json({ message: 'Market crash triggered successfully' });
  } catch (err) {
    console.error('Trigger crash error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/market/stabilize:
 *   post:
 *     summary: Manually stabilize market from crash (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Market stabilized
 */
router.post('/market/stabilize', auth('ADMIN'), async (req, res) => {
  try {
    const io = req.app.get('socketio');
    await pricingEngine.endMarketCrash(io);
    return res.json({ message: 'Market stabilized successfully' });
  } catch (err) {
    console.error('Stabilize error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/market/status:
 *   get:
 *     summary: Get current market crash status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Status
 */
router.get('/market/status', async (req, res) => {
  const status = pricingEngine.getCrashStatus();
  return res.json({
    is_crash_mode: status.isCrashMode,
    seconds_remaining: status.crashEndTime ? Math.max(0, Math.round((status.crashEndTime - Date.now()) / 1000)) : 0
  });
});

/**
 * @swagger
 * /api/admin/config:
 *   patch:
 *     summary: Update dynamic system parameters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               k_factor_amplifier:
 *                 type: string
 *               idle_cool_down_minutes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Configs updated
 */
router.patch('/config', auth('ADMIN'), async (req, res) => {
  const { k_factor_amplifier, idle_cool_down_minutes } = req.body;
  try {
    if (k_factor_amplifier !== undefined) {
      await db.query("UPDATE system_config SET value = $1 WHERE key = 'k_factor_amplifier'", [k_factor_amplifier]);
    }
    if (idle_cool_down_minutes !== undefined) {
      await db.query("UPDATE system_config SET value = $1 WHERE key = 'idle_cool_down_minutes'", [idle_cool_down_minutes]);
    }
    return res.json({ message: 'System configurations updated successfully' });
  } catch (err) {
    console.error('Update config error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin/Cashier)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/users', auth(['ADMIN', 'CASHIER']), async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role, wallet_balance, created_at FROM users ORDER BY username ASC');
    const users = result.rows.map(u => ({
      ...u,
      wallet_balance: parseFloat(u.wallet_balance)
    }));
    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/materials:
 *   get:
 *     summary: Get raw materials inventory list
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of raw materials
 */
router.get('/materials', auth(['ADMIN', 'KITCHEN']), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM raw_materials ORDER BY id ASC');
    const materials = result.rows.map(m => ({
      ...m,
      stock_qty: parseFloat(m.stock_qty),
      min_threshold: parseFloat(m.min_threshold)
    }));
    return res.json(materials);
  } catch (err) {
    console.error('Fetch materials error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
