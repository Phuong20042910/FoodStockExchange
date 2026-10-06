const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { body, param } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');

/**
 * @swagger
 * /api/orders/place:
 *   post:
 *     summary: Place a new order with dynamic price checking
 *     tags: [Orders]
 */
router.post('/place', auth(), [
  body('table_number').notEmpty().withMessage('Table number is required'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  checkValidationResult
], async (req, res) => {
  const { table_number, items } = req.body;
  const userId = req.user.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    let walletBalance = parseFloat(userRes.rows[0].wallet_balance);

    let totalAmount = 0;
    const itemsToInsert = [];

    for (const item of items) {
      const productRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      const product = productRes.rows[0];

      if (!product) {
        throw { status: 404, message: `Product ID ${item.product_id} not found` };
      }

      if (!product.is_trading) {
        throw { status: 403, message: `Trading is halted for ${product.name} due to high volatility.` };
      }

      const currentPrice = parseFloat(product.current_price);
      const expectedPrice = parseFloat(item.expected_price);

      const diffPercent = Math.abs(currentPrice - expectedPrice) / expectedPrice;
      if (diffPercent > 0.10) {
        throw { status: 409, message: `Price updated for ${product.name}. Current: ${currentPrice}, Expected: ${expectedPrice}. Please re-submit.` };
      }

      const recipeRes = await client.query(`
        SELECT r.usage_qty, rm.name, rm.stock_qty, rm.id as rm_id
        FROM recipes r
        JOIN raw_materials rm ON rm.id = r.material_id
        WHERE r.product_id = $1
      `, [product.id]);

      for (const recipe of recipeRes.rows) {
        const requiredQty = parseFloat(recipe.usage_qty) * item.quantity;
        const availableQty = parseFloat(recipe.stock_qty);
        if (availableQty < requiredQty) {
          throw { status: 400, message: `Out of stock: ingredient ${recipe.name} is insufficient for ${product.name}` };
        }
        await client.query('UPDATE raw_materials SET stock_qty = stock_qty - $1 WHERE id = $2', [requiredQty, recipe.rm_id]);
      }

      totalAmount += currentPrice * item.quantity;
      itemsToInsert.push({
        product_id: product.id,
        quantity: item.quantity,
        price_at_purchase: currentPrice
      });
    }

    if (walletBalance < totalAmount) {
      throw { status: 400, message: `Insufficient funds. Cost: ${totalAmount}, Wallet: ${walletBalance}` };
    }

    const orderRes = await client.query(
      'INSERT INTO orders (user_id, table_number, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, table_number, totalAmount, 'PENDING']
    );
    const order = orderRes.rows[0];

    for (const item of itemsToInsert) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, owner_id) VALUES ($1, $2, $3, $4, $5)',
        [order.id, item.product_id, item.quantity, item.price_at_purchase, userId] // Set initial owner
      );
    }

    await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [totalAmount, userId]);

    const txType = 'ORDER_PAYMENT';
    const txHashInput = `${userId}${totalAmount * -1}${txType}${order.id}`;
    const txHash = require('crypto').createHash('sha256').update(txHashInput).digest('hex');

    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, totalAmount * -1, txType, order.id, txHash]);

    await client.query('COMMIT');

    const io = req.app.get('socketio');
    io.emit('KITCHEN_NEW_ORDER', {
      order_id: order.id,
      table_number: order.table_number,
      total_amount: order.total_amount,
      created_at: order.created_at,
      items: itemsToInsert
    });

    // --- COPY TRADING LOGIC ---
    // Fetch followers of this user
    const followersRes = await client.query(`
      SELECT f.follower_id, u.username as master_name
      FROM followers f
      JOIN users u ON u.id = f.master_id
      WHERE f.master_id = $1
    `, [userId]);

    if (followersRes.rows.length > 0) {
      // Find the most interesting item (highest quantity or most volatile)
      const topItem = itemsToInsert[0];
      const prodRes = await client.query('SELECT name FROM products WHERE id = $1', [topItem.product_id]);
      const prodName = prodRes.rows[0].name;
      
      const masterName = followersRes.rows[0].master_name;

      followersRes.rows.forEach(follower => {
        io.emit(`COPY_TRADE_ALERT_${follower.follower_id}`, {
          master_id: userId,
          master_name: masterName,
          product_id: topItem.product_id,
          product_name: prodName,
          price: topItem.price_at_purchase,
          quantity: topItem.quantity,
          message: `${masterName} vừa chốt đơn ${topItem.quantity} ${prodName} với giá ${topItem.price_at_purchase.toLocaleString()}đ! Bạn có muốn mua theo không?`
        });
      });
    }
    // --- END COPY TRADING ---

    return res.status(200).json({
      status: 'MATCHED',
      order_id: order.id,
      total_amount: totalAmount,
      new_balance: walletBalance - totalAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order placement error:', err);
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order within 30s and pay 5% penalty
 *     tags: [Orders]
 */
router.post('/:id/cancel', auth(), [
  param('id').isUUID().withMessage('Order ID must be a valid UUID'),
  checkValidationResult
], async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId]);
    const order = orderRes.rows[0];

    if (!order) {
      throw { status: 404, message: 'Order not found' };
    }

    if (order.status !== 'PENDING') {
      throw { status: 400, message: 'Order cannot be cancelled. Kitchen is already cooking.' };
    }

    const createdTime = new Date(order.created_at).getTime();
    const timeDiffSeconds = (Date.now() - createdTime) / 1000;

    if (timeDiffSeconds > 30) {
      throw { status: 400, message: 'Cancellation window expired (max 30 seconds)' };
    }

    const totalAmount = parseFloat(order.total_amount);
    const penaltyAmount = totalAmount * 0.05;
    const refundAmount = totalAmount - penaltyAmount;

    await client.query("UPDATE orders SET status = 'CANCELLED' WHERE id = $1", [id]);

    const orderItems = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    for (const item of orderItems.rows) {
      const recipes = await client.query('SELECT * FROM recipes WHERE product_id = $1', [item.product_id]);
      for (const recipe of recipes.rows) {
        const returnQty = parseFloat(recipe.usage_qty) * item.quantity;
        await client.query('UPDATE raw_materials SET stock_qty = stock_qty + $1 WHERE id = $2', [returnQty, recipe.material_id]);
      }
    }

    await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [refundAmount, userId]);

    const txHashInputRefund = `${userId}${refundAmount}ORDER_REFUND${id}`;
    const txHashRefund = require('crypto').createHash('sha256').update(txHashInputRefund).digest('hex');
    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, 'ORDER_REFUND', $3, $4)
    `, [userId, refundAmount, id, txHashRefund]);

    const txHashInputPenalty = `${userId}${penaltyAmount * -1}CANCEL_PENALTY${id}`;
    const txHashPenalty = require('crypto').createHash('sha256').update(txHashInputPenalty).digest('hex');
    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, 'CANCEL_PENALTY', $3, $4)
    `, [userId, penaltyAmount * -1, id, txHashPenalty]);

    await client.query('COMMIT');

    const io = req.app.get('socketio');
    io.emit('KITCHEN_CANCEL_ORDER', { order_id: id });

    return res.json({
      message: 'Order cancelled successfully',
      refund_amount: refundAmount,
      penalty_amount: penaltyAmount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Cancellation error:', err);
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release();
  }
});

// LIMIT ORDER ENDPOINTS

/**
 * @swagger
 * /api/orders/limit:
 *   post:
 *     summary: Place a new auto-trigger limit order (Auto Buy)
 *     tags: [Orders]
 */
router.post('/limit', auth(), [
  body('product_id').isInt({ min: 1 }).withMessage('Product ID must be a positive integer'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('target_price').isFloat({ min: 0 }).withMessage('Target price must be a positive number'),
  checkValidationResult
], async (req, res) => {
  const { product_id, quantity, target_price } = req.body;
  const userId = req.user.id;

  try {
    const productRes = await db.query('SELECT name FROM products WHERE id = $1', [product_id]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const result = await db.query(`
      INSERT INTO limit_orders (user_id, product_id, quantity, target_price, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      RETURNING *
    `, [userId, product_id, quantity, target_price]);

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create limit order error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/orders/limit/my-limits:
 *   get:
 *     summary: Get all pending/filled limit orders for current user
 *     tags: [Orders]
 */
router.get('/limit/my-limits', auth(), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lo.*, p.name as product_name, p.image_url
      FROM limit_orders lo
      JOIN products p ON p.id = lo.product_id
      WHERE lo.user_id = $1
      ORDER BY lo.created_at DESC
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch limit orders error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/orders/limit/{id}/cancel:
 *   post:
 *     summary: Cancel a pending limit order
 *     tags: [Orders]
 */
router.post('/limit/:id/cancel', auth(), [
  param('id').isInt({ min: 1 }).withMessage('Limit order ID must be a positive integer'),
  checkValidationResult
], async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  try {
    const checkRes = await db.query('SELECT status FROM limit_orders WHERE id = $1 AND user_id = $2', [id, userId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Limit order not found' });
    }

    if (checkRes.rows[0].status !== 'PENDING') {
      return res.status(400).json({ message: `Cannot cancel a limit order in status: ${checkRes.rows[0].status}` });
    }

    await db.query("UPDATE limit_orders SET status = 'CANCELLED' WHERE id = $1", [id]);
    return res.json({ message: 'Limit order cancelled successfully' });
  } catch (err) {
    console.error('Cancel limit order error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// OWNED ITEMS (TICKETS) FOR P2P RESELLING

/**
 * @swagger
 * /api/orders/my-tickets:
 *   get:
 *     summary: Get all active, unserved drink tickets owned by current user (for P2P listing)
 *     tags: [Orders]
 */
router.get('/my-tickets', auth(), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT oi.id as order_item_id, oi.quantity, oi.price_at_purchase, p.name as product_name, p.image_url, p.id as product_id, o.status as order_status
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE oi.owner_id = $1 
        AND o.status IN ('PENDING', 'PREPARING', 'READY') -- Only items not served yet
        AND oi.id NOT IN (SELECT order_item_id FROM p2p_listings WHERE status = 'OPEN') -- Not already listed for sale
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch my tickets error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Retrieve history of customer orders
 *     tags: [Orders]
 */
router.get('/my-orders', auth(), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, 
        JSON_AGG(JSON_BUILD_OBJECT('name', p.name, 'qty', oi.quantity, 'price', oi.price_at_purchase)) as items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch my-orders error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/orders/pending:
 *   get:
 *     summary: Retrieve all pending orders for KDS
 *     tags: [Orders]
 */
router.get('/pending', auth(['ADMIN', 'KITCHEN']), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT o.*, 
        JSON_AGG(JSON_BUILD_OBJECT('product_id', p.id, 'name', p.name, 'qty', oi.quantity)) as items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.status IN ('PENDING', 'PREPARING', 'READY')
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Fetch pending error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (KDS kitchen workflow)
 *     tags: [Orders]
 */
router.put('/:id/status', auth(['ADMIN', 'KITCHEN', 'CASHIER']), [
  param('id').isUUID().withMessage('Order ID must be a valid UUID'),
  body('status').notEmpty().withMessage('Status is required').isString(),
  checkValidationResult
], async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    const io = req.app.get('socketio');
    io.emit('ORDER_STATUS_CHANGED', { order_id: id, status });
    return res.json({ message: `Order status updated to ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
