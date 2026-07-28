const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const crypto = require('crypto');

/**
 * @swagger
 * /api/wallet/topup:
 *   post:
 *     summary: Deposit money into customer wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - amount
 *             properties:
 *               user_id:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Deposited successfully
 *       403:
 *         description: Forbidden (Only Cashier or Admin)
 */
router.post('/topup', auth(['ADMIN', 'CASHIER']), async (req, res) => {
  const { user_id, amount } = req.body;
  if (!user_id || !amount || amount <= 0) {
    return res.status(400).json({ message: 'User ID and positive amount are required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify user exists
    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [user_id]);
    const user = userRes.rows[0];
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }

    // 2. Insert transaction log with hash audit check
    const txType = 'TOPUP';
    
    // Fetch last transaction hash to chain it (blockchain-like mechanism)
    const lastTxRes = await client.query('SELECT tx_hash FROM wallet_transactions ORDER BY created_at DESC LIMIT 1');
    const lastHash = lastTxRes.rows[0] ? lastTxRes.rows[0].tx_hash : '0000000000000000000000000000000000000000000000000000000000000000';

    const txHashInput = `${user_id}${amount}${txType}${lastHash}`;
    const txHash = crypto.createHash('sha256').update(txHashInput).digest('hex');

    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, tx_hash)
      VALUES ($1, $2, $3, $4)
    `, [user_id, amount, txType, txHash]);

    // 3. Update User Balance
    const updateRes = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [amount, user_id]
    );

    await client.query('COMMIT');

    // Notify client of topup
    const io = req.app.get('socketio');
    io.emit(`WALLET_UPDATE_${user_id}`, {
      balance: parseFloat(updateRes.rows[0].wallet_balance),
      amount: amount
    });

    return res.json({
      message: 'Deposit successful',
      new_balance: parseFloat(updateRes.rows[0].wallet_balance)
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Wallet deposit error:', err);
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
 * /api/wallet/transactions:
 *   get:
 *     summary: Retrieve wallet transaction logs for customer
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of transactions
 */
router.get('/transactions', auth(), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, amount, type, reference_id, created_at, tx_hash FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    const txs = result.rows.map(t => ({
      ...t,
      amount: parseFloat(t.amount)
    }));
    return res.json(txs);
  } catch (err) {
    console.error('Fetch wallet history error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
