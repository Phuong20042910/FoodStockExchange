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
 * /api/wallet/webhook/sepay:
 *   post:
 *     summary: SePAY VietQR Bank Transfer Webhook Auto-Topup
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountIn:
 *                 type: number
 *               transactionContent:
 *                 type: string
 *               referenceNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed & wallet credited
 */
router.post('/webhook/sepay', async (req, res) => {
  const { amountIn, transactionContent, referenceNumber } = req.body;
  if (!amountIn || amountIn <= 0 || !transactionContent) {
    return res.status(400).json({ success: false, message: 'Invalid bank webhook payload' });
  }

  // Parse NAP <USER_ID> syntax from bank transfer memo
  const match = transactionContent.match(/NAP\s*(\d+)/i);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Memo syntax NAP <USER_ID> not found' });
  }

  const userId = match[1];
  const amount = parseFloat(amountIn);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify target user
    const userRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const user = userRes.rows[0];
    if (!user) {
      throw { status: 404, message: `User ID ${userId} not found` };
    }

    // 2. Compute SHA-256 Ledger Audit Hash
    const txType = 'VIETQR_TOPUP';
    const lastTxRes = await client.query('SELECT tx_hash FROM wallet_transactions ORDER BY created_at DESC LIMIT 1');
    const lastHash = lastTxRes.rows[0] ? lastTxRes.rows[0].tx_hash : '0000000000000000000000000000000000000000000000000000000000000000';

    const txHashInput = `${userId}${amount}${txType}${referenceNumber || ''}${lastHash}`;
    const txHash = crypto.createHash('sha256').update(txHashInput).digest('hex');

    await client.query(`
      INSERT INTO wallet_transactions (user_id, amount, type, reference_id, tx_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, amount, txType, referenceNumber || 'VIETQR_AUTO', txHash]);

    // 3. Update Balance
    const updateRes = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
      [amount, userId]
    );

    await client.query('COMMIT');

    // Broadcast instant balance update via Socket.io
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`WALLET_UPDATE_${userId}`, {
        balance: parseFloat(updateRes.rows[0].wallet_balance),
        amount: amount
      });
    }

    console.log(`[VietQR Auto-Topup] Credited +${amount.toLocaleString()}đ to User #${userId}. New Balance: ${updateRes.rows[0].wallet_balance}đ`);

    return res.json({
      success: true,
      message: 'VietQR Webhook auto-topup successful',
      user_id: userId,
      credited_amount: amount,
      new_balance: parseFloat(updateRes.rows[0].wallet_balance)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SePAY Webhook error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

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

/**
 * @swagger
 * /api/wallet/vietqr/{userId}:
 *   get:
 *     summary: Generate dynamic VietQR Napas247 Payment Image Link
 *     tags: [Wallet]
 */
router.get('/vietqr/:userId', async (req, res) => {
  const { userId } = req.params;
  const amount = req.query.amount || 100000;
  const bankId = process.env.VIETQR_BANK_ID || 'MB';
  const accountNo = process.env.VIETQR_ACCOUNT_NO || '0988888888';
  const accountName = process.env.VIETQR_ACCOUNT_NAME || 'FOOD STOCK EXCHANGE';
  const memo = `NAP ${userId}`;

  const qrImageUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;

  return res.json({
    success: true,
    user_id: userId,
    amount: parseFloat(amount),
    memo: memo,
    qr_code_url: qrImageUrl
  });
});

module.exports = router;


