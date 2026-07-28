import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X, TrendingUp, TrendingDown, BrainCircuit } from 'lucide-react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl border border-gray-800 bg-darkCard p-6 shadow-2xl rounded-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center justify-between pr-8 mb-6">
          <div className="flex items-center gap-4">
            <img src={product.image_url} alt={product.name} className="h-16 w-16 object-cover border border-gray-700 rounded-lg" />
            <div>
              <h2 className="text-xl font-bold text-whiteShare">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-share-mono text-2xl text-neonCyan">{Math.round(product.current_price).toLocaleString()} VND</span>
                {isUp ? (
                  <span className="flex items-center text-xs text-neonGreen"><TrendingUp className="h-3 w-3 mr-1" /> TĂNG</span>
                ) : (
                  <span className="flex items-center text-xs text-neonRed"><TrendingDown className="h-3 w-3 mr-1" /> GIẢM</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Machine Learning Prediction Banner */}
        <div className="mb-6 bg-neonCyan/5 border border-neonCyan/20 p-3 rounded-lg flex items-center gap-3">
          <BrainCircuit className="h-5 w-5 text-neonCyan animate-pulse flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-neonCyan block font-mono uppercase tracking-wider">Dự báo giá bằng Machine Learning (FastAPI Model)</span>
            {predictLoading ? (
              <span className="text-gray-500 font-mono">Đang chạy mô hình hồi quy tuyến tính...</span>
            ) : prediction ? (
              <span className="text-gray-300 font-mono">
                Mức giá tiếp theo dự kiến: <strong className="text-neonCyan font-share-mono text-sm">{prediction.predicted_price?.toLocaleString()}đ</strong>
                <span className="text-[9px] text-gray-500 ml-2">({prediction.source})</span>
              </span>
            ) : (
              <span className="text-gray-500 font-mono">Không có dữ liệu dự báo.</span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Lịch sử biến động giá thực tế (Line chart)</h3>
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-500">Đang tải biểu đồ...</div>
            ) : history.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-500">Chưa có dữ liệu lịch sử giá. Đang đợi tick tiếp theo...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "#00FF66" : "#FF3366"} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={isUp ? "#00FF66" : "#FF3366"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#4A5568" fontSize={10} tickLine={false} />
                  <YAxis stroke="#4A5568" domain={['auto', 'auto']} fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151720', border: '1px solid #2D3748', borderRadius: '8px' }}
                    labelStyle={{ color: '#A0AEC0' }}
                  />
                  <Area type="monotone" dataKey="price" stroke={isUp ? "#00FF66" : "#FF3366"} strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4 text-center">
          <div>
            <div className="text-xs text-gray-500 uppercase">Giá Sàn (Floor)</div>
            <div className="font-share-mono text-sm text-gray-300 mt-1">{Math.round(product.min_price).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Giá Gốc (Base)</div>
            <div className="font-share-mono text-sm text-gray-300 mt-1">{Math.round(product.base_price).toLocaleString()} VND</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Giá Trần (Ceiling)</div>
            <div className="font-share-mono text-sm text-gray-300 mt-1">{Math.round(product.max_price).toLocaleString()} VND</div>
          </div>
        </div>
      </div>
    </div>
  );
}
