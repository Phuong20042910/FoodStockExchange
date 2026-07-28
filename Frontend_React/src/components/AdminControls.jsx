import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { ShieldAlert, Settings, Flame, ShieldCheck, ThermometerSnowflake, Package } from 'lucide-react';

export default function AdminControls() {
  const [materials, setMaterials] = useState([]);
  const [kAmplifier, setKAmplifier] = useState('1.0');
  const [idleMinutes, setIdleMinutes] = useState('10');
  const [liftPanicCover, setLiftPanicCover] = useState(false);

  const { crashData } = useSocket() || {};

  useEffect(() => {
    fetchMaterials();
    // Pre-fill configs (optional, mock defaults or API)
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error('Fetch materials error:', err);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.patch('http://localhost:5000/api/admin/config', {
        k_factor_amplifier: kAmplifier,
        idle_cool_down_minutes: idleMinutes
      });
      alert('Đã lưu cấu hình thị trường thành công!');
    } catch (err) {
      alert('Không thể lưu cấu hình.');
    }
  };

  const handleTriggerCrash = async () => {
    if (!liftPanicCover) return;
    try {
      await axios.post('http://localhost:5000/api/admin/market/crash');
      alert('CẢNH BÁO: Đã kích hoạt sập sàn đồ uống toàn hệ thống!');
      setLiftPanicCover(false);
    } catch (err) {
      alert('Không thể kích hoạt.');
    }
  };

  const handleStabilize = async () => {
    try {
      await axios.post('http://localhost:5000/api/admin/market/stabilize');
      alert('Đã bình ổn giá trị thị trường.');
    } catch (err) {
      alert('Bình ổn thất bại.');
    }
  };

  return (
    <div className="min-h-screen bg-darkBg pb-12">
      <header className="border-b border-gray-800 bg-darkCard/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-neonRed" />
          <div>
            <h1 className="text-xl font-bold text-whiteShare">Market Admin Controller</h1>
            <p className="text-xs text-gray-500 font-mono">Bảng điều phối thông số vĩ mô & kho hàng thô</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* Left Column: Volatility & Configurations */}
        <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-6">
          <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-5 w-5 text-neonCyan" /> Cấu Hình Thuật Toán Định Giá
          </h2>

          <form onSubmit={handleUpdateConfig} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 font-mono block mb-2">Hệ số K-factor Amplifier: {kAmplifier}x</label>
              <input 
                type="range" 
                min="0.1" 
                max="3.0" 
                step="0.1"
                value={kAmplifier}
                onChange={(e) => setKAmplifier(e.target.value)}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neonCyan"
              />
              <span className="text-[10px] text-gray-500 font-mono block mt-1">Gia tốc biến động giá khi có order. Slider lớn → Giá nhảy nhanh hơn.</span>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-mono block mb-2">Thời gian rảnh chờ Cool-down (Phút): {idleMinutes}m</label>
              <input 
                type="range" 
                min="2" 
                max="30" 
                step="1"
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(e.target.value)}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neonCyan"
              />
              <span className="text-[10px] text-gray-500 font-mono block mt-1">Thời gian món ăn không có ai order để bắt đầu tự động giảm 1.5% giá.</span>
            </div>

            <button 
              type="submit"
              className="w-full py-2.5 bg-neonCyan/20 text-neonCyan border border-neonCyan/30 font-bold hover:bg-neonCyan/35 text-xs rounded-lg transition"
            >
              ÁP DỤNG CẤU HÌNH DÂN SỐ
            </button>
          </form>
        </div>

        {/* Center Column: Big Red Panic Button (Market Crash) */}
        <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl flex flex-col justify-between items-center text-center space-y-6">
          <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Flame className="h-5 w-5 text-neonRed" /> Nút Khẩn Cấp - Gây Sập Sàn
          </h2>

          <div className="flex-1 flex flex-col justify-center items-center">
            {/* Protective Cover checkbox simulation */}
            <div className="flex items-center gap-2 mb-4 bg-black/40 border border-gray-850 px-4 py-2 rounded-lg">
              <input 
                type="checkbox" 
                id="panic-cover" 
                checked={liftPanicCover}
                onChange={(e) => setLiftPanicCover(e.target.checked)}
                className="accent-neonRed cursor-pointer h-4 w-4"
              />
              <label htmlFor="panic-cover" className="text-xs text-neonRed font-bold font-mono cursor-pointer uppercase tracking-wider select-none">
                {liftPanicCover ? "🔓 MỞ LẮP BẢO VỆ" : "🔒 ĐÓNG LẮP BẢO VỆ"}
              </label>
            </div>

            {/* Simulated Heavy Launch Button */}
            <button 
              onClick={handleTriggerCrash}
              disabled={!liftPanicCover || crashData.isCrash}
              className={`h-36 w-36 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
                crashData.isCrash 
                  ? 'bg-neonRed text-white border-white animate-ping' 
                  : liftPanicCover 
                    ? 'bg-red-700 text-white border-neonRed hover:bg-neonRed hover:shadow-[0_0_30px_rgba(255,51,102,0.6)] cursor-pointer' 
                    : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
              }`}
            >
              <Flame className="h-8 w-8 mb-1" />
              <span className="font-bold text-xs uppercase font-share-mono">PANIC NOW</span>
            </button>
          </div>

          {crashData.isCrash ? (
            <button 
              onClick={handleStabilize}
              className="w-full py-2.5 bg-neonGreen/20 text-neonGreen border border-neonGreen/30 hover:bg-neonGreen/35 font-bold text-xs rounded-lg flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> BÌNH ỔN THỊ TRƯỜNG (STABILIZE)
            </button>
          ) : (
            <p className="text-[10px] text-gray-500 font-mono">Bấm PANIC để kích hoạt giảm kịch sàn toàn quán uống trong 3 phút làm hoạt náo.</p>
          )}
        </div>

        {/* Right Column: Raw Materials Inventory */}
        <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-4">
          <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <Package className="h-5 w-5 text-neonYellow" /> Tồn Kho Nguyên Liệu Vật Lý
          </h2>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {materials.map(m => {
              const isLow = m.stock_qty <= m.min_threshold;
              return (
                <div key={m.id} className={`border p-3 rounded-lg flex justify-between items-center ${
                  isLow ? 'bg-red-950/20 border-neonRed/35 text-neonRed' : 'bg-black/35 border-gray-850'
                }`}>
                  <div>
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">Mức tối thiểu: {m.min_threshold} {m.unit}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-share-mono text-lg font-bold">{m.stock_qty}</span>
                    <span className="text-xs text-gray-500 ml-1 font-mono">{m.unit}</span>
                    {isLow && (
                      <span className="text-[9px] bg-neonRed/20 border border-neonRed/30 px-1 py-0.5 rounded ml-2 font-bold uppercase tracking-wider flex items-center gap-1 mt-1 justify-end">
                        <ThermometerSnowflake className="h-2.5 w-2.5" /> Khan Hiếm
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
