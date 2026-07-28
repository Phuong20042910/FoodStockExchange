const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * /api/ai/advise:
 *   post:
 *     summary: Get trading advice from the AI Broker chatbot (Delegated to Python FastAPI Service)
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 */
router.post('/advise', auth(), async (req, res) => {
  const { budget } = req.body;
  
  if (!budget || budget <= 0) {
    return res.status(400).json({ message: 'A positive budget is required to consult the AI Broker' });
  }

  try {
    // 1. Fetch current product prices and status to send as context to Python Service
    const productsRes = await db.query('SELECT id, name, category, current_price, base_price, min_price, max_price, is_trading FROM products');
    const products = productsRes.rows.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: parseFloat(p.current_price),
      base: parseFloat(p.base_price),
      min: parseFloat(p.min_price),
      max: parseFloat(p.max_price),
      is_trading: p.is_trading
    }));

    const contextStr = products.map(p => 
      `- ${p.name} [Mã: ${p.id} - ${p.category}]: Giá hiện tại: ${p.price.toLocaleString()}đ (Giá sàn: ${p.min.toLocaleString()}đ, Giá trần: ${p.max.toLocaleString()}đ). Trạng thái: ${p.is_trading ? 'Đang giao dịch' : 'TẠM NGỪNG DO VOLATILITY'}`
    ).join('\n');

    // 2. Forward request to Python FastAPI Microservice
    const pythonServiceUrl = 'http://localhost:8000/ai/advise';
    const response = await fetch(pythonServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        budget: parseFloat(budget),
        menu_context: contextStr
      })
    });

    if (response.ok) {
      const data = await response.json();
      return res.json({ advice: data.advice, model: data.model });
    } else {
      throw new Error('Python AI service returned an error status');
    }

  } catch (err) {
    console.error('Error delegating AI advise to Python service:', err.message);
    // Safe fallback if Python microservice is down
    return res.status(502).json({ 
      message: 'AI Service Gateway Error. Python microservice may be offline.',
      advice: '⚠️ AI Broker hiện đang ngoại tuyến (Offline). Bạn vui lòng khởi động dịch vụ Python FastAPI trên cổng 8000 để bắt đầu trò chuyện.'
    });
  }
});

module.exports = router;
