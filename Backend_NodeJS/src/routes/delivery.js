const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');

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
router.post('/quote', auth(), async (req, res) => {
  const { dest_longitude, dest_latitude } = req.body;

  if (dest_longitude === undefined || dest_latitude === undefined) {
    return res.status(400).json({ message: 'Destination longitude and latitude coordinates are required' });
  }

  try {
    const pythonDeliveryUrl = 'http://localhost:8000/ai/delivery-cost';
    const response = await fetch(pythonDeliveryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dest_longitude: parseFloat(dest_longitude),
        dest_latitude: parseFloat(dest_latitude)
      })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json(data);
    } else {
      throw new Error('Python Delivery service returned an error');
    }

  } catch (err) {
    console.error('Error forwarding delivery quote to Python service:', err.message);
    // Fallback if Python microservice is down
    return res.status(502).json({
      message: 'Delivery Service Gateway Error. Python microservice may be offline.',
      distance_km: 0,
      estimated_duration_minutes: 0,
      shipping_fee: 15000, // Flat fallback shipping fee
      source: 'offline_fallback'
    });
  }
});

module.exports = router;
