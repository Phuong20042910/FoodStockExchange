const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middlewares/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { body } = require('express-validator');
const { checkValidationResult } = require('../middlewares/validate');

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: Chat with AI Broker Assistant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/chat', [
  body('message').notEmpty().withMessage('Message is required').isString(),
  body('preferredModel').optional().isString(),
  checkValidationResult
], async (req, res) => {
  const { message, preferredModel } = req.body;

  try {
    // Fetch system configs
    const configRes = await db.query('SELECT key, value FROM system_config WHERE key IN ($1, $2)', ['gemini_api_key', 'groq_api_key']);
    const configs = {};
    configRes.rows.forEach(r => configs[r.key] = r.value);

    // Fetch current product prices and status to send as context to AI
    const productsRes = await db.query('SELECT id, name, category, current_price, base_price, min_price, max_price, is_trading FROM products');
    const products = productsRes.rows.map(p => ({
      name: p.name,
      category: p.category,
      price: parseFloat(p.current_price),
      base: parseFloat(p.base_price),
      is_trading: p.is_trading
    }));

    const contextStr = products.map(p => 
      `- ${p.name} (${p.category}): Giá hiện tại ${p.price.toLocaleString()}đ (Giá gốc ${p.base.toLocaleString()}đ) - ${p.is_trading ? 'Đang giao dịch' : 'SẬP SÀN'}`
    ).join('\n');

    const systemPrompt = `Bắt buộc trả lời bằng TIẾNG VIỆT, phong cách người anh em thiện lành dân nhậu (xưng hô: tôi/ông, tui/bà, ông bạn, xèng, múc, chốt đơn, v.v.).
Bạn là một chuyên gia tư vấn (AI Broker) kiêm "Cạ Nhậu" tại quán Food Stock Exchange. Quán hoạt động như sàn chứng khoán ẩm thực, giá đổi theo cung cầu.
Nhiệm vụ của bạn:
1. Trò chuyện tự nhiên như một con người về MỌI CHỦ ĐỀ trong cuộc sống (tình yêu, công việc, tâm sự, thể thao...). Đóng vai một người bạn nhậu biết lắng nghe và hay đùa.
2. Dù đang nói chuyện gì, hãy khéo léo lái câu chuyện để "phím hàng", tư vấn các "Kèo thơm" (món đang rớt giá/SẬP SÀN) dựa trên bảng giá.
3. Tư vấn Combo đồ ăn/uống nếu khách nhắc đến ngân sách.
4. Trả lời ngắn gọn, hài hước, không liệt kê số liệu khô khan, không dùng tiếng Anh.`;

    const userMessageWithContext = `Đây là bảng giá Real-time hiện tại của sàn:
${contextStr}

Ngân sách và yêu cầu của khách hàng: "${message}"

Hãy tư vấn ngay một kèo thơm dựa trên dữ liệu bảng giá trên!`;

    // Helpers to call APIs
    const callGemini = async () => {
      const apiKey = configs['gemini_api_key'];
      if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') throw new Error('Gemini API Key missing');
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", systemInstruction: systemPrompt });
      const chat = model.startChat({ generationConfig: { temperature: 0.9 } });
      const result = await chat.sendMessage(userMessageWithContext);
      return (await result.response).text();
    };

    const callGroq = async () => {
      const apiKey = configs['groq_api_key'];
      if (!apiKey || apiKey === 'YOUR_GROQ_API_KEY_HERE') throw new Error('Groq API Key missing');
      
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessageWithContext }],
        model: "qwen/qwen3.8-27b",
        temperature: 0.9,
      });
      return completion.choices[0]?.message?.content || "";
    };

    // Routing Logic based on preferredModel
    let replyText = "";
    let sourceModel = "";

    if (preferredModel === 'groq') {
      try {
        replyText = await callGroq();
        sourceModel = 'Groq Qwen 27B';
      } catch (err) {
        console.warn("Groq failed, falling back to Gemini", err.message);
        replyText = await callGemini();
        sourceModel = 'Gemini 3.6 (Fallback from Groq)';
      }
    } else {
      // Default to Gemini (or if preferredModel === 'gemini')
      try {
        replyText = await callGemini();
        sourceModel = 'Gemini 3.6 Flash';
      } catch (err) {
        console.warn("Gemini failed, falling back to Groq", err.message);
        replyText = await callGroq();
        sourceModel = 'Groq Qwen 27B (Fallback from Gemini)';
      }
    }

    return res.json({ reply: replyText, source: sourceModel });

  } catch (err) {
    console.error('All AI engines failed:', err.message);
    return res.status(500).json({ 
      message: 'Lỗi khi gọi AI',
      reply: 'Hệ thống AI đang quá tải do lượng giao dịch đột biến! Vui lòng thử lại sau.'
    });
  }
});

module.exports = router;
