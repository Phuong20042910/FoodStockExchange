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
    const result = await db.query('SELECT id, username, role, wallet_balance, full_name, phone, email, created_at FROM users ORDER BY id ASC');
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
 * /api/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role (Admin only)
 *     tags: [Admin]
 */
router.patch('/users/:id/role', auth('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN'];
  if (!role || !validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role.toUpperCase(), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'User role updated', user: result.rows[0] });
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}/wallet:
 *   patch:
 *     summary: Directly adjust user wallet balance (Admin only)
 *     tags: [Admin]
 */
router.patch('/users/:id/wallet', auth('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { new_balance } = req.body;
  if (new_balance === undefined || isNaN(new_balance) || new_balance < 0) {
    return res.status(400).json({ message: 'Invalid new balance' });
  }

  try {
    const result = await db.query(
      'UPDATE users SET wallet_balance = $1 WHERE id = $2 RETURNING id, username, wallet_balance',
      [new_balance, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'Wallet balance updated', user: result.rows[0] });
  } catch (err) {
    console.error('Adjust wallet error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


const globalFoodApi = require('../services/globalFoodApi');

/**
 * @swagger
 * /api/admin/products/import-global:
 *   post:
 *     summary: Import International Food & Beverage Menu from Global APIs (Admin)
 *     tags: [Admin]
 */
router.post('/products/import-global', auth('ADMIN'), async (req, res) => {
  try {
    const openFoodItems = await globalFoodApi.fetchOpenFoodFacts('coffee', 'vietnam');
    const liveDrinks = await globalFoodApi.fetchGlobalBeverages();
    const liveMeals = await globalFoodApi.fetchGlobalMeals();
    const vietnamItems = globalFoodApi.getVietnamIconicItems();
    const presetItems = globalFoodApi.getPresetGlobalItems();
    const allItems = [...vietnamItems, ...openFoodItems, ...presetItems, ...liveDrinks, ...liveMeals];
    let addedCount = 0;



    // Synchronize PostgreSQL primary key sequence with current max ID
    await db.query("SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products))");

    const validCategories = ['BEER', 'COCKTAIL', 'FOOD', 'SOFT_DRINK'];
    for (const item of allItems) {


      // Check if product exists
      const exist = await db.query('SELECT id FROM products WHERE name = $1', [item.name]);
      if (exist.rows.length === 0) {
        let cat = item.category ? item.category.toUpperCase() : 'FOOD';
        if (!validCategories.includes(cat)) {
          if (cat.includes('BEER')) cat = 'BEER';
          else if (cat.includes('COCKTAIL')) cat = 'COCKTAIL';
          else if (cat.includes('DRINK') || cat.includes('BEVERAGE')) cat = 'SOFT_DRINK';
          else cat = 'FOOD';
        }

        await db.query(`
          INSERT INTO products (name, category, image_url, base_price, current_price, min_price, max_price, elasticity_k, linked_asset, asset_multiplier)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          item.name, cat, item.image_url, item.base_price, item.current_price,
          item.min_price, item.max_price, item.elasticity_k, item.linked_asset, item.asset_multiplier
        ]);
        addedCount++;
      }
    }


    return res.json({
      success: true,
      message: `Đã đồng bộ thành công ${addedCount} món ăn/đồ uống quốc tế (Bao gồm đặc sản Việt Nam & Open Food Facts) vào Database!`,
      imported_count: addedCount
    });
  } catch (err) {
    console.error('Import global products error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/admin/products/search-openfood:
 *   get:
 *     summary: Live search Open Food Facts API (>3M global products including Vietnam)
 *     tags: [Admin]
 */
router.get('/products/search-openfood', auth('ADMIN'), async (req, res) => {
  const { query, country } = req.query;
  try {
    const results = await globalFoodApi.fetchOpenFoodFacts(query || 'coffee', country || 'vietnam');
    return res.json(results);
  } catch (err) {
    console.error('Search openfood error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});


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

