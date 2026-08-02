import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { 
  ShieldAlert, Settings, Flame, ShieldCheck, ThermometerSnowflake, Package, 
  Lightbulb, Radio, Wifi, Users, UserCheck, Shield, Wallet, Edit3, Search, RefreshCw 
} from 'lucide-react';

export default function AdminControls() {
  const [materials, setMaterials] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [kAmplifier, setKAmplifier] = useState('1.0');
  const [idleMinutes, setIdleMinutes] = useState('10');
  const [liftPanicCover, setLiftPanicCover] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { crashData } = useSocket() || {};

  useEffect(() => {
    fetchMaterials();
    fetchUsers();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/materials');
      setMaterials(res.data);
    } catch (err) {
      console.error('Fetch materials error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Đã cập nhật vai trò người dùng #${userId} sang ${newRole}!`);
      fetchUsers();
    } catch (err) {
      alert('Lỗi khi cập nhật vai trò.');
    }
  };

  const handleWalletAdjust = async (userId, currentBalance) => {
    const input = prompt(`Nhập số dư ví mới cho Trader #${userId} (VNĐ):`, currentBalance);
    if (input === null) return;
    const newBal = parseFloat(input);
    if (isNaN(newBal) || newBal < 0) {
      alert('Số tiền không hợp lệ.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/admin/users/${userId}/wallet`,
        { new_balance: newBal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Đã cập nhật số dư ví Trader #${userId} thành ${newBal.toLocaleString()}đ!`);
      fetchUsers();
    } catch (err) {
      alert('Không thể cập nhật số dư ví.');
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.patch('http://localhost:5000/api/admin/config', {
        k_factor_amplifier: kAmplifier,
        idle_cool_down_minutes: idleMinutes
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Đã lưu cấu hình thị trường thành công!');
    } catch (err) {
      alert('Không thể lưu cấu hình.');
    }
  };

  const handleTriggerCrash = async () => {
    if (!liftPanicCover) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/market/crash', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('CẢNH BÁO: Đã kích hoạt sập sàn đồ uống toàn hệ thống!');
      setLiftPanicCover(false);
    } catch (err) {
      alert('Không thể kích hoạt.');
    }
  };

  const handleStabilize = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/market/stabilize', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã bình ổn giá trị thị trường.');
    } catch (err) {
      alert('Bình ổn thất bại.');
    }
  };

  const handleImportGlobalProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/admin/products/import-global', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || 'Đã đồng bộ thành công menu thực phẩm & đồ uống quốc tế!');
    } catch (err) {
      alert('Không thể đồng bộ menu quốc tế.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-darkBg pb-16 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wider font-share-mono">BAN QUẢN TRỊ (ADMIN CONTROLLER)</h1>
            <p className="text-xs text-slate-400 font-mono">Bảng điều phối vĩ mô, quản lý người dùng & phân quyền hệ thống</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImportGlobalProducts}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 hover:from-sky-500/30 hover:to-emerald-500/30 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-bold font-mono transition shadow-md flex items-center gap-1.5"
          >
            🌐 ĐỒNG BỘ MENU QUỐC TẾ
          </button>

          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl font-mono flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>TỔNG USER: <strong className="text-emerald-400 font-share-mono">{users.length}</strong></span>
          </span>
        </div>
      </header>


      {/* Main Grid Controls */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* Left Column: Volatility & Configurations */}
        <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl space-y-6 shadow-lg">
          <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-5 w-5 text-sky-400" /> Cấu Hình Thuật Toán Định Giá
          </h2>

          <form onSubmit={handleUpdateConfig} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-2">Hệ số K-factor Amplifier: <strong className="text-sky-400">{kAmplifier}x</strong></label>
              <input 
                type="range" 
                min="0.1" 
                max="3.0" 
                step="0.1"
                value={kAmplifier}
                onChange={(e) => setKAmplifier(e.target.value)}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <span className="text-[10px] text-slate-500 font-mono block mt-1">Gia tốc biến động giá khi có order. Slider lớn → Giá nhảy nhanh hơn.</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono block mb-2">Thời gian rảnh chờ Cool-down (Phút): <strong className="text-sky-400">{idleMinutes}m</strong></label>
              <input 
                type="range" 
                min="2" 
                max="30" 
                step="1"
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(e.target.value)}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <span className="text-[10px] text-slate-500 font-mono block mt-1">Thời gian món ăn không có ai order để bắt đầu tự động giảm 1.5% giá.</span>
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold hover:bg-sky-500/35 text-xs rounded-xl transition font-mono uppercase tracking-wider shadow-md"
            >
              ÁP DỤNG CẤU HÌNH THỊ TRƯỜNG
            </button>
          </form>
        </div>

        {/* Center Column: Big Red Panic Button (Market Crash) */}
        <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl flex flex-col justify-between items-center text-center space-y-6 shadow-lg">
          <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Flame className="h-5 w-5 text-rose-500" /> Nút Khẩn Cấp - Gây Sập Sàn
          </h2>

          <div className="flex-1 flex flex-col justify-center items-center">
            {/* Protective Cover checkbox simulation */}
            <div className="flex items-center gap-2 mb-4 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
              <input 
                type="checkbox" 
                id="panic-cover" 
                checked={liftPanicCover}
                onChange={(e) => setLiftPanicCover(e.target.checked)}
                className="accent-rose-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="panic-cover" className="text-xs text-rose-400 font-bold font-mono cursor-pointer uppercase tracking-wider select-none">
                {liftPanicCover ? "🔓 MỞ LẮP BẢO VỆ" : "🔒 ĐÓNG LẮP BẢO VỆ"}
              </label>
            </div>

            {/* Simulated Heavy Launch Button */}
            <button 
              onClick={handleTriggerCrash}
              disabled={!liftPanicCover || crashData?.isCrash}
              className={`h-36 w-36 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
                crashData?.isCrash 
                  ? 'bg-rose-600 text-white border-white animate-ping' 
                  : liftPanicCover 
                    ? 'bg-rose-700 text-white border-rose-500 hover:bg-rose-600 hover:shadow-[0_0_30px_rgba(244,63,94,0.6)] cursor-pointer' 
                    : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              <Flame className="h-8 w-8 mb-1" />
              <span className="font-bold text-xs uppercase font-share-mono">PANIC NOW</span>
            </button>
          </div>

          {crashData?.isCrash ? (
            <button 
              onClick={handleStabilize}
              className="w-full py-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/35 font-bold text-xs rounded-xl flex items-center justify-center gap-2 font-mono uppercase"
            >
              <ShieldCheck className="h-4 w-4" /> BÌNH ỔN THỊ TRƯỜNG (STABILIZE)
            </button>
          ) : (
            <p className="text-[10px] text-slate-400 font-mono">Bấm PANIC để kích hoạt giảm kịch sàn toàn quán uống trong 3 phút làm hoạt náo.</p>
          )}
        </div>

        {/* Right Column: Raw Materials Inventory */}
        <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl space-y-4 shadow-lg">
          <h2 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-400" /> Tồn Kho Nguyên Liệu Vật Lý
          </h2>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {materials.map(m => {
              const isLow = m.stock_qty <= m.min_threshold;
              return (
                <div key={m.id} className={`border p-3.5 rounded-xl flex justify-between items-center ${
                  isLow ? 'bg-rose-950/20 border-rose-500/40 text-rose-300' : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <div>
                    <div className="text-sm font-bold text-white">{m.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ngưỡng tối thiểu: {m.min_threshold} {m.unit}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-share-mono text-lg font-bold text-sky-400">{m.stock_qty}</span>
                    <span className="text-xs text-slate-400 ml-1 font-mono">{m.unit}</span>
                    {isLow && (
                      <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded ml-2 font-bold uppercase tracking-wider flex items-center gap-1 mt-1 justify-end">
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

      {/* User Management & Role Permissions Section */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl">
                <Users className="h-6 w-6 text-emerald-400" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN VAI TRÒ (USER & PERMISSIONS)
                </h3>
                <p className="text-xs text-slate-400 font-mono">Xem danh sách tài khoản, điều chỉnh vai trò (Role) và cộng số dư ví trực tiếp</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Tìm theo Tên, Email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>

              <button 
                onClick={fetchUsers}
                disabled={loadingUsers}
                className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-mono text-xs transition flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 text-sky-400 ${loadingUsers ? 'animate-spin' : ''}`} /> Làm mới
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] bg-slate-950/60">
                  <th className="p-3">ID</th>
                  <th className="p-3">TÊN ĐĂNG NHẬP</th>
                  <th className="p-3">HỌ VÀ TÊN</th>
                  <th className="p-3">LIÊN HỆ (EMAIL / SĐT)</th>
                  <th className="p-3">VAI TRÒ (ROLE)</th>
                  <th className="p-3 text-right">SỐ DƯ VÍ (VNĐ)</th>
                  <th className="p-3 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500">
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 text-slate-400">#{u.id}</td>
                      <td className="p-3 font-bold text-white">{u.username}</td>
                      <td className="p-3 text-slate-300">{u.full_name || 'Chưa cập nhật'}</td>
                      <td className="p-3 text-slate-400">
                        <div>{u.email || '-'}</div>
                        <div className="text-[10px] text-slate-500">{u.phone}</div>
                      </td>
                      <td className="p-3">
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`bg-slate-950 border px-2 py-1 rounded-lg text-xs font-bold font-mono outline-none cursor-pointer ${
                            u.role === 'ADMIN' ? 'text-rose-400 border-rose-500/40' :
                            u.role === 'CASHIER' ? 'text-emerald-400 border-emerald-500/40' :
                            u.role === 'KITCHEN' ? 'text-amber-300 border-amber-500/40' :
                            'text-sky-400 border-sky-500/40'
                          }`}
                        >
                          <option value="CUSTOMER">CUSTOMER (Khách)</option>
                          <option value="CASHIER">CASHIER (Thu ngân)</option>
                          <option value="KITCHEN">KITCHEN (Đầu bếp)</option>
                          <option value="ADMIN">ADMIN (Quản trị)</option>
                        </select>
                      </td>
                      <td className="p-3 text-right font-share-mono font-bold text-emerald-400 text-sm">
                        {Math.round(u.wallet_balance).toLocaleString()} đ
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => handleWalletAdjust(u.id, u.wallet_balance)}
                          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35 border border-emerald-500/30 rounded-lg text-[10px] font-bold font-mono transition inline-flex items-center gap-1"
                        >
                          <Wallet className="h-3 w-3" /> NẠP/SỬA VÍ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* IoT Smart Bar Lighting Simulator Section */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className={`border rounded-2xl p-6 transition-all duration-500 ${
          crashData?.isCrash 
            ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.3)] animate-pulse' 
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <Lightbulb className={`h-6 w-6 ${crashData?.isCrash ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`} />
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  IoT Smart Lighting Room Simulator (Philips Hue / Tuya Integration)
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono uppercase">
                    USF-05 REAL-TIME IOT
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Giả lập đồng bộ ánh sáng RGB toàn không gian quán theo trạng thái thị trường thực tế</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Wifi className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300 font-mono">Bridge: <strong className="text-emerald-400">CONNECTED (192.168.1.104)</strong></span>
            </div>
          </div>

          {/* Simulated Lighting Floor plan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Zone 1: Main Stage */}
            <div className={`p-4 rounded-xl border text-center transition-all duration-300 ${
              crashData?.isCrash 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Radio className="h-4 w-4" />
                <span className="font-bold text-xs uppercase font-mono">Khu Vực 1: Sân Khấu Chính</span>
              </div>
              <div className="text-sm font-share-mono font-bold mt-2">
                {crashData?.isCrash ? '🔴 STROBE FLASHING RED (255, 0, 50)' : '🟡 AMBIENT GOLD (2700K)'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Cường độ sáng: {crashData?.isCrash ? '100% (High Volatility)' : '65% (Warm)'}</div>
            </div>

            {/* Zone 2: Bar Counter */}
            <div className={`p-4 rounded-xl border text-center transition-all duration-300 ${
              crashData?.isCrash 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Radio className="h-4 w-4" />
                <span className="font-bold text-xs uppercase font-mono">Khu Vực 2: Quầy Bar Pha Chế</span>
              </div>
              <div className="text-sm font-share-mono font-bold mt-2">
                {crashData?.isCrash ? '🔴 STROBE FLASHING RED (255, 0, 50)' : '🟡 NEON CYAN / WARM ACCENT'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Cường độ sáng: {crashData?.isCrash ? '100% (Market Alarm)' : '75% (Relax)'}</div>
            </div>

            {/* Zone 3: VIP Lounge */}
            <div className={`p-4 rounded-xl border text-center transition-all duration-300 ${
              crashData?.isCrash 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Radio className="h-4 w-4" />
                <span className="font-bold text-xs uppercase font-mono">Khu Vực 3: Bàn Khách VIP</span>
              </div>
              <div className="text-sm font-share-mono font-bold mt-2">
                {crashData?.isCrash ? '🔴 STROBE FLASHING RED (255, 0, 50)' : '🟡 AMBIENT GOLD (3000K)'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">Cường độ sáng: {crashData?.isCrash ? '100% (Emergency Alert)' : '50% (Mood Light)'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


