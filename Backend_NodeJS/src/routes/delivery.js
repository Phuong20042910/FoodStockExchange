const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { calculateDeliveryCost } = require('../services/deliveryCost');
const { body } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');

/**
 * @swagger
 * /api/delivery/quote:
 *   post:
 *     summary: Get dynamic shipping fee and ETA for delivery coordinates (Delegated to Python FastAPI Service)
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dest_longitude
 *               - dest_latitude
 *             properties:
 *               dest_longitude:
 *                 type: number
 *               dest_latitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Delivery quote calculated
 */
router.post('/quote', auth(), [
  body('dest_longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('dest_latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  checkValidationResult
], async (req, res) => {
  const { dest_longitude, dest_latitude } = req.body;

  try {
    const result = await calculateDeliveryCost(parseFloat(dest_longitude), parseFloat(dest_latitude));
    return res.json(result);
  } catch (err) {
    console.error('Error calculating delivery quote:', err.message);
    return res.status(502).json({
      message: 'Delivery Service Gateway Error.',
      distance_km: 0,
      estimated_duration_minutes: 0,
      shipping_fee: 15000,
      source: 'offline_fallback'
    });
  }
});

module.exports = router;
