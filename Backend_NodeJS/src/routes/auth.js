const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username already exists
 */
router.post('/register', async (req, res) => {
  const { username, password, full_name, phone, email, role } = req.body;
  if (!username || !password || !full_name || !phone || !email) {
    return res.status(400).json({ message: 'All fields (Username, Password, Full Name, Phone, Email) are required' });
  }

  const validRoles = ['CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN'];
  const userRole = (role && validRoles.includes(role.toUpperCase())) ? role.toUpperCase() : 'CUSTOMER';
  const initialBalance = userRole === 'CUSTOMER' ? 100000.00 : 0.00;

  try {
    const userExist = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const emailExist = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExist.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (username, password_hash, full_name, phone, email, role, wallet_balance) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, role, wallet_balance, full_name, phone, email',
      [username, hash, full_name, phone, email, userRole, initialBalance]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_food_stock_exchange_2026',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        wallet_balance: parseFloat(user.wallet_balance),
        full_name: user.full_name,
        phone: user.phone,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_food_stock_exchange_2026',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        wallet_balance: parseFloat(user.wallet_balance),
        full_name: user.full_name,
        phone: user.phone,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', auth(), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, username, role, wallet_balance, full_name, phone, email FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];
    return res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      wallet_balance: parseFloat(user.wallet_balance),
      full_name: user.full_name,
      phone: user.phone,
      email: user.email
    });
  } catch (err) {
    console.error('Auth check error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
