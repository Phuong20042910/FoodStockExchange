const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { body } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');
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
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').notEmpty().withMessage('Full name is required'),
  body('phone').notEmpty().withMessage('Phone number is required').isMobilePhone('vi-VN').withMessage('Invalid Vietnamese phone number'),
  body('email').notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format'),
  body('role').optional().isIn(['CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN']).withMessage('Invalid role'),
  checkValidationResult
], async (req, res) => {
  const { username, password, full_name, phone, email, role } = req.body;

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
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  checkValidationResult
], async (req, res) => {
  const { username, password } = req.body;

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
