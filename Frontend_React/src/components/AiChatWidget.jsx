import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, MessageSquare, X, Send, Sparkles, TrendingDown, Flame, DollarSign, RefreshCw } from 'lucide-react';

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [budget, setBudget] = useState(100000);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: '🍻 Ê ông bạn! Tôi là AI Broker Cạ Nhậu của ông đây! Ngân sách hôm nay có bao nhiêu xèng để tôi "phím hàng" món hời rớt giá và né nến đỏ cho ông?',
      model: 'Groq Llama 3.1 Bro Persona'
    }
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (customBudget = null, customText = null) => {
    const activeBudget = customBudget !== null ? customBudget : budget;
    const userQuery = customText || inputMsg || `Ngân sách ${activeBudget.toLocaleString()}đ, tư vấn cho tôi món hời!`;

    // Push user message
    const newMsgList = [...messages, { sender: 'user', text: userQuery }];
    setMessages(newMsgList);
    setInputMsg('');
    setLoading(true);

    try {
      // 1. Fetch live products context for AI
      const productsRes = await axios.get('http://localhost:5000/api/products');
      const products = productsRes.data;
      const menuContextStr = products.map(p => 
        `- ${p.name}: Giá hiện tại ${Math.round(p.current_price).toLocaleString()}đ (Gốc: ${Math.round(p.base_price).toLocaleString()}đ, Sàn: ${Math.round(p.min_price).toLocaleString()}đ, Trần: ${Math.round(p.max_price).toLocaleString()}đ) [Kategori: ${p.category}]`
      ).join('\n');

      // 2. Post to AI Python Microservice
      const res = await axios.post('http://localhost:8000/ai/advise', {
        budget: activeBudget,
        menu_context: menuContextStr
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: res.data.advice,
          model: res.data.model
        }
      ]);
    } catch (err) {
      console.error('Lỗi khi chat với AI Broker:', err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `🍻 Ối ông bạn ơi! Mạng bên bàn nhậu đang hơi nghẽn tẹo. Với ngân sách ${activeBudget.toLocaleString()}đ của ông, tôi thấy cứ "bắt đáy" mấy món đang rớt giá nhấp nháy Đỏ trên bảng điện tử là chắc ăn nhất!`,
          model: 'Fallback Offline Engine'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-sky-500 via-emerald-500 to-teal-400 p-3.5 pr-5 rounded-full text-slate-950 font-bold shadow-[0_0_25px_rgba(56,189,248,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
        >
          <div className="relative p-2 bg-slate-950 rounded-full text-sky-400 border border-slate-800">
            <Bot className="h-6 w-6 animate-bounce text-sky-400" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-400 rounded-full ring-2 ring-slate-950 animate-pulse" />
          </div>
          <div className="text-left font-mono">
            <div className="text-xs tracking-wider uppercase font-extrabold flex items-center gap-1">
              AI BROKER CẠ NHẬU <Sparkles className="h-3 w-3 text-amber-300" />
            </div>
            <div className="text-[10px] text-slate-900 font-semibold opacity-90">Tư vấn bắt đáy 24/7</div>
          </div>
        </button>
      )}

      {/* Chat Modal Popup */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] h-[580px] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-mono">
                  AI BROKER CẠ NHẬU <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">ONLINE</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">Powered by Groq Llama 3.1 & Gemini</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="bg-slate-950/60 p-2.5 border-b border-slate-800/80 flex gap-2 overflow-x-auto no-scrollbar text-[11px] font-mono">
            <button 
              onClick={() => handleSend(100000, "Ngân sách 100k, phím hàng món hời cho tôi!")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-sky-300 rounded-xl whitespace-nowrap flex items-center gap-1 shrink-0 transition"
            >
              🍻 Ngân sách 100k
            </button>
            <button 
              onClick={() => handleSend(150000, "Món nào đang giảm giá rớt sàn múc được?")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 rounded-xl whitespace-nowrap flex items-center gap-1 shrink-0 transition"
            >
              <TrendingDown className="h-3 w-3" /> Món rớt sàn
            </button>
            <button 
              onClick={() => handleSend(200000, "Tạo cho tôi combo nhậu 200k căng bụng!")}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 rounded-xl whitespace-nowrap flex items-center gap-1 shrink-0 transition"
            >
              🔥 Combo 200k
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-mono text-xs">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold rounded-tr-none shadow-md' 
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-md whitespace-pre-line'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.model && (
                  <span className="text-[9px] text-slate-500 mt-1 px-1">
                    {msg.model}
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-400 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 w-fit">
                <RefreshCw className="h-4 w-4 animate-spin text-sky-400" />
                <span className="text-xs">Cạ nhậu đang soi nến 10s phân tích...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Budget Quick Controller & Input Footer */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Ngân sách nhậu:
              </span>
              <span className="text-emerald-400 font-share-mono font-bold text-xs">{budget.toLocaleString()} VNĐ</span>
            </div>

            <input 
              type="range" 
              min="50000" 
              max="500000" 
              step="10000"
              value={budget} 
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (inputMsg.trim()) handleSend();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                placeholder="Hỏi cạ nhậu bất kỳ món gì..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sky-400 font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="p-2.5 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold rounded-xl hover:brightness-110 active:scale-95 transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
