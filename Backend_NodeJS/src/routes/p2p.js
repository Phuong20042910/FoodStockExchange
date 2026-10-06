const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const crypto = require('crypto');
const { body, param } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');

/**
 * @swagger
 * /api/p2p/list:
 *   post:
 *     summary: List a purchased drink ticket for sale on the secondary market
 *     tags: [P2P]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_item_id
 *               - price
 *             properties:
 *               order_item_id:
 *                 type: integer
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ticket listed successfully
 */
router.post('/list', auth(), [
  body('order_item_id').isInt({ min: 1 }).withMessage('Order item ID must be a positive integer'),
  body('price').isFloat({ min: 1 }).withMessage('Price must be a positive number'),
  checkValidationResult
], async (req, res) => {
  const { order_item_id, price } = req.body;
  const sellerId = req.user.id;

  try {
    // 1. Verify seller actually owns the order item and it hasn't been served
    const ticketRes = await db.query(`
      SELECT oi.*, o.status as order_status 
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = $1 AND oi.owner_id = $2
    `, [order_item_id, sellerId]);

    const ticket = ticketRes.rows[0];
    if (!ticket) {
      return res.status(404).json({ message: 'Drink ticket not found or you do not own it' });
    }

    if (!['PENDING', 'PREPARING', 'READY'].includes(ticket.order_status)) {
      return res.status(400).json({ message: 'Cannot list a ticket that has already been served or cancelled' });
    }

    // 2. Check if already listed
    const activeListRes = await db.query("SELECT id FROM p2p_listings WHERE order_item_id = $1 AND status = 'OPEN'", [order_item_id]);
    if (activeListRes.rows.length > 0) {
      return res.status(400).json({ message: 'This ticket is already listed for sale' });
    }

    // 3. Create listing
    const result = await db.query(`
      INSERT INTO p2p_listings (seller_id, order_item_id, price, status)
      VALUES ($1, $2, $3, 'OPEN')
      RETURNING *
    `, [sellerId, order_item_id, price]);

    // Broadcast update to marketplace
    const io = req.app.get('socketio');
    io.emit('P2P_MARKET_UPDATE', { type: 'LISTED', listing: result.rows[0] });

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('List P2P error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/p2p/listings:
 *   get:
 *     summary: Get all active P2P listings
 *     tags: [P2P]
 */
router.get('/listings', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pl.id as listing_id, pl.price, pl.created_at, u.username as seller_name, 
             p.name as product_name, p.image_url, oi.quantity
      FROM p2p_listings pl
      JOIN users u ON u.id = pl.seller_id
      JOIN order_items oi ON oi.id = pl.order_item_id
      JOIN products p ON p.id = oi.product_id
      WHERE pl.status = 'OPEN'
      ORDER BY pl.created_at DESC
    `);
    const listings = result.rows.map(l => ({
      ...l,
      price: parseFloat(l.price)
    }));
    return res.json(listings);
  } catch (err) {
    console.error('Fetch listings error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/p2p/buy:
 *   post:
 *     summary: Purchase a drink ticket from another user
 *     tags: [P2P]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listing_id
 *             properties:
 *               listing_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket purchased
 */
router.post('/buy', auth(), [
  body('listing_id').isInt({ min: 1 }).withMessage('Listing ID must be a positive integer'),
  checkValidationResult
], async (req, res) => {
  const { listing_id } = req.body;
  const buyerId = req.user.id;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch listing details
    const listingRes = await client.query('SELECT * FROM p2p_listings WHERE id = $1 FOR UPDATE', [listing_id]);
    const listing = listingRes.rows[0];

    if (!listing) {
      throw { status: 404, message: 'Listing not found' };
    }

    if (listing.status !== 'OPEN') {
      throw { status: 400, message: `Listing is not active. Status: ${listing.status}` };
    }

    if (listing.seller_id === buyerId) {
      throw { status: 400, message: 'You cannot buy your own listed ticket' };
    }

    const price = parseFloat(listing.price);

    // 2. Verify buyer wallet
    const buyerRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [buyerId]);
    const buyerBalance = parseFloat(buyerRes.rows[0].wallet_balance);

    if (buyerBalance < price) {
      throw { status: 400, message: 'Insufficient wallet balance to buy this ticket' };
    }

    // 3. Verify seller wallet
    const sellerRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [listing.seller_id]);
    const sellerBalance = parseFloat(sellerRes.rows[0].wallet_balance);

    // 4. Update order_items owner
    await client.query('UPDATE order_items SET owner_id = $1 WHERE id = $2', [buyerId, listing.order_item_id]);

    // 5. Update listing status
    await client.query("UPDATE p2p_listings SET status = 'SOLD' WHERE id = $1", [listing_id]);

    // 6. Subtract buyer, add seller
    await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [price, buyerId]);
    await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [price, listing.seller_id]);

    // Double-entry Ledger Logs for buyer
    const buyTxHashInput = `${buyerId}${price * -1}P2P_BUY${listing_id}`;
    const buyTxHash = crypto.createHash('sha256').update(buyTxHashInput).digest('hex');
    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, 'P2P_BUY', $3, $4)
    `, [buyerId, price * -1, listing_id, buyTxHash]);

    // Double-entry Ledger Logs for seller
    const sellTxHashInput = `${listing.seller_id}${price}P2P_SALE${listing_id}`;
    const sellTxHash = crypto.createHash('sha256').update(sellTxHashInput).digest('hex');
    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, 'P2P_SALE', $3, $4)
    `, [listing.seller_id, price, listing_id, sellTxHash]);

    await client.query('COMMIT');

    // Notify users & market via Socket
    const io = req.app.get('socketio');
    
    // Notify buyer wallet
    io.emit(`WALLET_UPDATE_${buyerId}`, { balance: buyerBalance - price, amount: -price });
    // Notify seller wallet
    io.emit(`WALLET_UPDATE_${listing.seller_id}`, { balance: sellerBalance + price, amount: price });

    io.emit('P2P_MARKET_UPDATE', { type: 'SOLD', listing_id });

    return res.json({
      message: 'Ticket purchased successfully',
      price: price,
      new_balance: buyerBalance - price
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Buy P2P error:', err);
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
 * /api/p2p/listing/{id}/cancel:
 *   post:
 *     summary: Cancel a P2P listing
 *     tags: [P2P]
 *     security:
 *       - bearerAuth: []
 */
router.post('/listing/:id/cancel', auth(), [
  param('id').isInt({ min: 1 }).withMessage('Listing ID must be a positive integer'),
  checkValidationResult
], async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user.id;

  try {
    const checkRes = await db.query('SELECT status FROM p2p_listings WHERE id = $1 AND seller_id = $2', [id, sellerId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (checkRes.rows[0].status !== 'OPEN') {
      return res.status(400).json({ message: `Listing cannot be cancelled in status: ${checkRes.rows[0].status}` });
    }

    await db.query("UPDATE p2p_listings SET status = 'CANCELLED' WHERE id = $1", [id]);

    const io = req.app.get('socketio');
    io.emit('P2P_MARKET_UPDATE', { type: 'CANCELLED', listing_id: id });

    return res.json({ message: 'P2P listing cancelled successfully' });
  } catch (err) {
    console.error('Cancel listing error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
