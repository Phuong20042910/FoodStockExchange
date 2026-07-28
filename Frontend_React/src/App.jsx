import React, { useState } from 'react';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import TradingBoard from './components/TradingBoard';
import KdsBoard from './components/KdsBoard';
import PosConsole from './components/PosConsole';
import AdminControls from './components/AdminControls';
import { 
  Shield, LayoutDashboard, UtensilsCrossed, Landmark, User, Lock, Award, 
  Phone, Mail, Users, TrendingUp, TrendingDown, BrainCircuit, Activity 
} from 'lucide-react';

function MainLayout() {
  const { user, token, loading, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState('trading'); // trading, kds, pos, admin
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration additional states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestTab, setGuestTab] = useState('home'); // home, features, stats

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-darkBg text-gray-500 font-mono text-lg">
        Đang tải hồ sơ bảo mật Trader...
      </div>
    );
  }

  // Login view if not authenticated
  if (!token || !user) {
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isRegister) {
        if (password !== confirmPassword) {
          alert("Mật khẩu xác nhận không khớp!");
          return;
        }
        const res = await register(username, password, fullName, phone, email, role);
        if (!res.success) {
          alert(res.message);
        } else {
          setShowAuthModal(false);
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          alert(res.message);
        } else {
          setShowAuthModal(false);
        }
      }
    };

    return (
      <div className="min-h-screen bg-darkBg text-gray-100 flex flex-col font-sans">
        {/* Navbar */}
        <nav className="border-b border-gray-850 bg-black/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-block p-2 bg-neonCyan/10 border border-neonCyan/25 text-neonCyan rounded-lg">
              <Activity className="h-5 w-5 animate-pulse" />
            </span>
            <span className="text-xl font-extrabold text-white tracking-widest font-share-mono cursor-pointer" onClick={() => setGuestTab('home')}>
              FOOD <span className="text-neonCyan">STOCK</span> EXCHANGE
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-mono tracking-wider">
            <button 
              onClick={() => setGuestTab('home')} 
              className={`transition uppercase font-bold focus:outline-none ${guestTab === 'home' ? 'text-neonCyan border-b-2 border-neonCyan pb-1' : 'text-gray-400 hover:text-neonCyan pb-1'}`}
            >
              TRANG CHỦ
            </button>
            <button 
              onClick={() => setGuestTab('features')} 
              className={`transition uppercase font-bold focus:outline-none ${guestTab === 'features' ? 'text-neonCyan border-b-2 border-neonCyan pb-1' : 'text-gray-400 hover:text-neonCyan pb-1'}`}
            >
              TÍNH NĂNG
            </button>
            <button 
              onClick={() => setGuestTab('stats')} 
              className={`transition uppercase font-bold focus:outline-none ${guestTab === 'stats' ? 'text-neonCyan border-b-2 border-neonCyan pb-1' : 'text-gray-400 hover:text-neonCyan pb-1'}`}
            >
              THỊ TRƯỜNG
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setIsRegister(false);
                setShowAuthModal(true);
              }}
              className="text-xs font-bold font-mono tracking-wider hover:text-neonCyan transition uppercase"
            >
              ĐĂNG NHẬP
            </button>
            <button 
              onClick={() => {
                setIsRegister(true);
                setShowAuthModal(true);
              }}
              className="bg-neonCyan/10 text-neonCyan border border-neonCyan/30 hover:bg-neonCyan/20 px-4 py-2 rounded-lg text-xs font-bold font-mono tracking-wider transition uppercase"
            >
              ĐĂNG KÝ
            </button>
          </div>
        </nav>

        {/* Dynamic Guest Page Content Area */}
        <main className="flex-1 flex flex-col justify-center">
          {guestTab === 'home' && (
            <div id="hero" className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-16 items-center w-full">
              {/* Left Column: Hero Text */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neonCyan/10 border border-neonCyan/20 text-xs text-neonCyan font-mono">
                  <span className="h-2 w-2 rounded-full bg-neonGreen animate-ping"></span>
                  SÀN GIAO DỊCH ĐẦU TIÊN TẠI VIỆT NAM
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                  Bắt Đáy Món Ngon <br />
                  <span className="bg-gradient-to-r from-neonCyan to-neonGreen bg-clip-text text-transparent">
                    Chốt Lời Ẩm Thực
                  </span>
                </h1>

                <p className="text-gray-400 text-sm md:text-base leading-relaxed max-w-xl">
                  Nơi giá menu đồ uống và món ăn biến động liên tục cứ mỗi 10 giây dựa trên lực mua thực tế.
                  Hãy sử dụng phân tích kỹ thuật, bắt đáy các lệnh xả hàng P2P và tham vấn AI Broker của bạn để tối ưu hóa chi tiêu trong đêm nay!
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setIsRegister(false);
                      setShowAuthModal(true);
                    }}
                    className="bg-neonCyan/20 text-neonCyan border border-neonCyan/40 hover:bg-neonCyan/35 px-6 py-3 rounded-lg text-xs font-bold font-mono tracking-wider transition uppercase"
                  >
                    GIAO DỊCH NGAY
                  </button>
                  <button
                    onClick={() => setGuestTab('features')}
                    className="border border-gray-850 bg-darkCard/20 hover:bg-gray-800/30 px-6 py-3 rounded-lg text-xs font-bold font-mono tracking-wider transition uppercase flex items-center justify-center"
                  >
                    TÌM HIỂU THÊM
                  </button>
                </div>
              </div>

              {/* Right Column: Cyberpunk Trading Ticker Preview */}
              <div className="lg:col-span-5 w-full space-y-4">
                <div className="border border-gray-850 bg-darkCard/40 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] text-gray-550 font-mono tracking-wider">LIVE TICKER BOARD</span>
                    <span className="h-2 w-2 rounded-full bg-neonGreen animate-pulse"></span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Product 1 */}
                    <div className="border border-gray-850 bg-black/45 p-3 rounded-lg flex items-center justify-between hover:border-neonCyan/35 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=150" className="h-10 w-10 object-cover rounded border border-gray-850" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Neon Whiskey Sour</div>
                          <div className="text-[9px] text-gray-500 font-mono">COCKTAIL</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-neonCyan font-bold">55,000 đ</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border font-semibold text-neonGreen bg-neonGreen/10 border-neonGreen/20">▲ +14.2%</span>
                      </div>
                    </div>

                    {/* Product 2 */}
                    <div className="border border-gray-850 bg-black/45 p-3 rounded-lg flex items-center justify-between hover:border-neonCyan/35 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150" className="h-10 w-10 object-cover rounded border border-gray-850" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Double Cheese Burger</div>
                          <div className="text-[9px] text-gray-500 font-mono">FAST FOOD</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-neonCyan font-bold">69,000 đ</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border font-semibold text-neonRed bg-neonRed/10 border-neonRed/20">▼ -4.5%</span>
                      </div>
                    </div>

                    {/* Product 3 */}
                    <div className="border border-gray-850 bg-black/45 p-3 rounded-lg flex items-center justify-between hover:border-neonCyan/35 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=150" className="h-10 w-10 object-cover rounded border border-gray-850" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Matcha Latte Cream</div>
                          <div className="text-[9px] text-gray-500 font-mono">TEA & COFFEE</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-neonCyan font-bold">39,000 đ</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono border font-semibold text-neonGreen bg-neonGreen/10 border-neonGreen/20">▲ +2.1%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Live Chart Mockup card */}
                <div className="border border-gray-850 bg-darkCard/40 p-4 rounded-xl text-center space-y-2">
                  <button 
                    onClick={() => {
                      setIsRegister(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full py-3 bg-neonCyan/10 text-neonCyan border border-neonCyan/30 rounded-lg hover:bg-neonCyan/20 text-xs font-bold font-mono tracking-wider transition uppercase"
                  >
                    MỞ PHÒNG GIAO DỊCH NGAY
                  </button>
                </div>
              </div>
            </div>
          )}

          {guestTab === 'features' && (
            <section id="features" className="py-16 w-full max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-white font-share-mono uppercase tracking-widest">TÍNH NĂNG ĐỘT PHÁ</h2>
                <p className="text-xs text-neonCyan font-mono mt-2 uppercase tracking-wider">Hệ sinh thái công nghệ tài chính ẩm thực khép kín</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-3 hover:border-neonCyan/30 transition duration-300">
                  <span className="inline-block p-3 bg-neonCyan/10 border border-neonCyan/20 text-neonCyan rounded-lg">
                    <Activity className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Dynamic Pricing</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Giá món ăn và thức uống thay đổi tự động mỗi 10 giây dựa trên quy luật cung cầu thực tế. Quán càng đông khách mua món nào, giá món đó tự tăng, món ít người mua giá tự giảm để kích cầu.
                  </p>
                </div>

                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-3 hover:border-neonGreen/30 transition duration-300">
                  <span className="inline-block p-3 bg-neonGreen/10 border border-neonGreen/20 text-neonGreen rounded-lg">
                    <BrainCircuit className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">AI Broker Advisor</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Tích hợp trợ lý AI thông minh chạy microservice Python FastAPI. AI tự động đánh giá biến động giá sàn, gợi ý combo đồ uống hời nhất tối ưu hóa ngân sách của Trader.
                  </p>
                </div>

                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-3 hover:border-neonYellow/30 transition duration-300">
                  <span className="inline-block p-3 bg-neonYellow/10 border border-neonYellow/20 text-neonYellow rounded-lg">
                    <TrendingUp className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Chợ Thứ Cấp P2P</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Hệ thống cho phép khách hàng hủy đơn hàng trong 30 giây đầu (phí phạt 5%). Đặc biệt, Trader có thể rao bán lại voucher món ăn đã mua rẻ lên Chợ P2P cho khách khác để ăn chênh lệch giá!
                  </p>
                </div>

                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-3 hover:border-neonRed/30 transition duration-300">
                  <span className="inline-block p-3 bg-neonRed/10 border border-neonRed/20 text-neonRed rounded-lg">
                    <Shield className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Panic Mode Crash</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Sự kiện ngẫu nhiên kích hoạt bởi quản trị viên. Toàn hệ thống chớp đỏ báo động, còi hú vang dội và toàn bộ bảng giá menu giảm sâu chạm đáy sàn (Min Price) trong đúng 3 phút để kích thích mua sắm.
                  </p>
                </div>
              </div>
            </section>
          )}

          {guestTab === 'stats' && (
            <section id="stats" className="py-16 w-full max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-white font-share-mono uppercase tracking-widest">TÌNH HÌNH THỊ TRƯỜNG</h2>
                <p className="text-xs text-neonGreen font-mono mt-2 uppercase tracking-wider">Thông số tổng hợp thực tế từ sàn giao dịch</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="border border-gray-850 bg-darkCard/50 p-6 rounded-xl text-center space-y-1">
                  <div className="text-xs text-gray-500 font-mono">BEER INDEX (VOLUME)</div>
                  <div className="font-share-mono text-2xl text-neonGreen font-bold">12,450 đ/giây</div>
                  <div className="text-[10px] text-gray-400">+14.2% vs hôm qua</div>
                </div>
                <div className="border border-gray-850 bg-darkCard/50 p-6 rounded-xl text-center space-y-1">
                  <div className="text-xs text-gray-500 font-mono">MATCHA COIN VALUE</div>
                  <div className="font-share-mono text-2xl text-neonRed font-bold">29,000 đ</div>
                  <div className="text-[10px] text-gray-400">-3.0% vùng hỗ trợ</div>
                </div>
                <div className="border border-gray-850 bg-darkCard/50 p-6 rounded-xl text-center space-y-1">
                  <div className="text-xs text-gray-500 font-mono">ACTIVE TRADERS</div>
                  <div className="font-share-mono text-2xl text-neonCyan font-bold">1,842 Users</div>
                  <div className="text-[10px] text-gray-400">Đang trực tuyến trong quán</div>
                </div>
                <div className="border border-gray-850 bg-darkCard/50 p-6 rounded-xl text-center space-y-1">
                  <div className="text-xs text-gray-500 font-mono">VÀO PHÒNG GIAO DỊCH</div>
                  <div className="font-share-mono text-2xl text-neonYellow font-bold">READY TO PLAY</div>
                  <button 
                    onClick={() => {
                      setIsRegister(false);
                      setShowAuthModal(true);
                    }}
                    className="text-[10px] text-neonYellow hover:underline font-mono uppercase font-bold"
                  >
                    Click để kết nối ví
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Live Market Ticker Banner */}
        <div className="border-t border-gray-850 bg-black/40 py-4 overflow-hidden mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center gap-6 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neonGreen animate-pulse"></span> THỊ TRƯỜNG HOẠT ĐỘNG TRƠN TRU</div>
            <div className="flex items-center gap-2">🔥 BEER INDEX: <span className="text-neonGreen font-share-mono font-bold text-sm">45,000đ (▲ +14%)</span></div>
            <div className="flex items-center gap-2">🍵 MATCHA COIN: <span className="text-neonRed font-share-mono font-bold text-sm">29,000đ (▼ -3%)</span></div>
            <div className="flex items-center gap-2">🍔 BURGER INDEX: <span className="text-neonGreen font-share-mono font-bold text-sm">55,000đ (▲ +5%)</span></div>
            <div className="flex items-center gap-2">👥 TRADERS ONLINE: <span className="text-neonCyan font-share-mono font-bold text-sm">184</span></div>
          </div>
        </div>

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="w-full max-w-md border border-gray-850 bg-darkCard/95 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
              
              {/* Glow light effect */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-neonCyan/10 rounded-full blur-3xl"></div>
              
              <div className="text-center mb-8 relative z-10">
                <span className="inline-block p-2 bg-neonCyan/15 border border-neonCyan/20 text-neonCyan rounded-full mb-2">
                  <Award className="h-6 w-6" />
                </span>
                <h2 className="text-xl font-extrabold text-white font-share-mono tracking-wider uppercase">
                  {isRegister ? "MỞ TÀI KHOẢN TRADER" : "PHÒNG GIAO DỊCH"}
                </h2>
                <p className="text-[10px] text-gray-550 font-mono mt-1">
                  {isRegister ? "Đăng ký nhận ngay 100.000đ trải nghiệm" : "Đăng nhập để vào bảng điện tử đặt món"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Tên đăng nhập (Username)..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                  />
                </div>

                {isRegister && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Họ và tên..."
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                      <input 
                        type="tel" 
                        placeholder="Số điện thoại..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                      <input 
                        type="email" 
                        placeholder="Địa chỉ Email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                      />
                    </div>
                    <div className="relative text-gray-550">
                      <Users className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                      <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                        className="w-full bg-black border border-gray-850 pl-10 pr-10 py-3 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-neonCyan font-mono appearance-none"
                      >
                        <option value="CUSTOMER">Vai trò: Khách hàng (CUSTOMER)</option>
                        <option value="CASHIER">Vai trò: Thu ngân (CASHIER)</option>
                        <option value="KITCHEN">Vai trò: Nhân viên Bếp (KITCHEN)</option>
                        <option value="ADMIN">Vai trò: Quản trị viên (ADMIN)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                      </div>
                    </div>
                  </>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                  <input 
                    type="password" 
                    placeholder="Mật mã (Password)..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                  />
                </div>

                {isRegister && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
                    <input 
                      type="password" 
                      placeholder="Xác nhận mật mã..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonCyan font-mono"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-neonCyan/20 text-neonCyan border border-neonCyan/30 font-bold hover:bg-neonCyan/35 text-sm rounded-lg tracking-wider font-mono uppercase transition duration-300"
                >
                  {isRegister ? "ĐĂNG KÝ TRADER MỚI" : "BẮT ĐẦU ĐĂNG NHẬP"}
                </button>
              </form>

              <div className="text-center mt-6 relative z-10">
                <button 
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setFullName('');
                    setPhone('');
                    setEmail('');
                    setRole('CUSTOMER');
                    setConfirmPassword('');
                  }} 
                  className="text-xs text-neonCyan hover:underline font-mono"
                >
                  {isRegister ? "Đã có tài khoản? Đăng nhập ngay" : "Chưa có ví? Đăng ký mở tài khoản (Tặng 100k)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Portal based on roles and navigation tab
  return (
    <div className="flex flex-col min-h-screen bg-darkBg text-gray-100">
      {/* Role Navigation Hub */}
      <div className="bg-black/60 border-b border-gray-850 px-6 py-2 flex items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <span className="text-gray-500">DANH MỤC TRUY CẬP:</span>
          
          <button 
            onClick={() => setActiveTab('trading')}
            className={`flex items-center gap-1.5 px-3 py-1 border rounded transition ${
              activeTab === 'trading' ? 'text-neonCyan border-neonCyan/40 bg-neonCyan/5' : 'text-gray-500 border-transparent hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" /> BẢNG GIAO DỊCH
          </button>

          {(user.role === 'ADMIN' || user.role === 'KITCHEN') && (
            <button 
              onClick={() => setActiveTab('kds')}
              className={`flex items-center gap-1.5 px-3 py-1 border rounded transition ${
                activeTab === 'kds' ? 'text-neonYellow border-neonYellow/40 bg-neonYellow/5' : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" /> MÀN HÌNH BẾP (KDS)
            </button>
          )}

          {(user.role === 'ADMIN' || user.role === 'CASHIER') && (
            <button 
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3 py-1 border rounded transition ${
                activeTab === 'pos' ? 'text-neonGreen border-neonGreen/40 bg-neonGreen/5' : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              <Landmark className="h-3.5 w-3.5" /> THU NGÂN (POS)
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-1 border rounded transition ${
                activeTab === 'admin' ? 'text-neonRed border-neonRed/40 bg-neonRed/5' : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              <Shield className="h-3.5 w-3.5" /> BAN QUẢN TRỊ (ADMIN)
            </button>
          )}
        </div>
        <div className="text-gray-500 font-mono text-[10px] hidden sm:block">
          IP SECURED CLOUD CONNECTIONS: ACTIVE
        </div>
      </div>

      <main className="flex-1">
        {activeTab === 'trading' && <TradingBoard />}
        {activeTab === 'kds' && <KdsBoard />}
        {activeTab === 'pos' && <PosConsole />}
        {activeTab === 'admin' && <AdminControls />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </SocketProvider>
  );
}
