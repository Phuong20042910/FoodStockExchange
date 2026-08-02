import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, TrendingDown, BrainCircuit, Sparkles } from 'lucide-react';

export default function ProductDetailModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    fetchPrediction();
  }, [product.id]);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/products/${product.id}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error('Error fetching price history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async () => {
    try {
      setPredictLoading(true);
      const res = await axios.get(`http://localhost:5000/api/products/${product.id}/predict`);
      setPrediction(res.data);
    } catch (err) {
      console.error('Error fetching prediction:', err);
    } finally {
      setPredictLoading(false);
    }
  };

  const isUp = history.length > 1 && history[history.length - 1].price >= history[history.length - 2].price;
  const strokeColor = isUp ? "#10b981" : "#f43f5e";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-2xl">
        <button 
          onClick={onClose} 
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-950/60 border border-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pr-10 mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="h-16 w-16 object-cover border border-slate-700/80 rounded-2xl shadow-lg shrink-0" 
            />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 font-mono uppercase font-bold">
                  {product.category || 'ASSET'}
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-white">{product.name}</h2>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="font-share-mono text-2xl text-sky-400 font-bold">{Math.round(product.current_price).toLocaleString()} VND</span>
                {isUp ? (
                  <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">
                    <TrendingUp className="h-3.5 w-3.5 mr-1" /> TĂNG GIÁ
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 font-mono">
                    <TrendingDown className="h-3.5 w-3.5 mr-1" /> GIẢM GIÁ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Machine Learning Prediction Banner */}
        <div className="mb-6 bg-gradient-to-r from-sky-500/10 via-slate-900 to-emerald-500/10 border border-sky-500/30 p-4 rounded-2xl flex items-center gap-3.5 shadow-lg">
          <div className="p-2.5 bg-sky-500/15 border border-sky-500/30 rounded-xl text-sky-400 shrink-0">
            <BrainCircuit className="h-6 w-6 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-sky-300 block font-mono uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
              DỰ BÁO XU HƯỚNG MACHINE LEARNING <Sparkles className="h-3 w-3 text-amber-400" />
            </span>
            {predictLoading ? (
              <span className="text-slate-400 font-mono">Đang chạy mô hình hồi quy Scikit-Learn...</span>
            ) : prediction ? (
              <span className="text-slate-200 font-mono">
                Mức giá tiếp theo dự kiến: <strong className="text-sky-400 font-share-mono text-base font-bold">{prediction.predicted_price?.toLocaleString()}đ</strong>
                <span className="text-[10px] text-emerald-400 ml-2 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">85% Confidence</span>
              </span>
            ) : (
              <span className="text-slate-400 font-mono">Chưa đủ dữ liệu nến để chạy mô hình AI.</span>
            )}
          </div>
        </div>

        {/* Area Chart Container */}
        <div className="mb-6 bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Biểu đồ đường biến động theo tick</h3>
            <span className="text-[10px] text-slate-400 font-mono">CHỈ SỐ REALTIME 10S</span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 font-mono text-xs">Đang tải biểu đồ...</div>
            ) : history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 font-mono text-xs">Chưa có dữ liệu lịch sử giá. Đang chờ tick tiếp theo...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPriceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={strokeColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff', fontFamily: 'Share Tech Mono' }}
                    formatter={(value) => [`${value.toLocaleString()} VND`, 'Giá bán']}
                  />
                  <Area type="monotone" dataKey="price" stroke={strokeColor} strokeWidth={2.5} fillOpacity={1} fill="url(#colorPriceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Financial Rules Range Bar */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs font-mono border-t border-slate-800 pt-4">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">GIÁ GỐC (BASE)</span>
            <span className="font-share-mono font-bold text-slate-200 text-sm">{Math.round(product.base_price).toLocaleString()}đ</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-rose-400 block uppercase">GIÁ SÀN (MIN FLOOR)</span>
            <span className="font-share-mono font-bold text-rose-400 text-sm">{Math.round(product.min_price).toLocaleString()}đ</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 block uppercase">GIÁ TRẦN (MAX CEILING)</span>
            <span className="font-share-mono font-bold text-emerald-400 text-sm">{Math.round(product.max_price).toLocaleString()}đ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
