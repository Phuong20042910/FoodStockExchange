import React, { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import TradingBoard from './components/TradingBoard';
import KdsBoard from './components/KdsBoard';
import PosConsole from './components/PosConsole';
import AdminControls from './components/AdminControls';
import AiChatWidget from './components/AiChatWidget';
import CopyTradeAlert from './components/CopyTradeAlert';
import UserProfile from './components/UserProfile';
import { 
  Shield, LayoutDashboard, UtensilsCrossed, Landmark, User, Lock, Award, 
  Phone, Mail, Users, TrendingUp, TrendingDown, BrainCircuit, Activity,
  Sparkles, CheckCircle2, XCircle, ArrowRight, Wallet, LogOut, RefreshCw
} from 'lucide-react';


// Live Scrolling Ticker Tape Header Component
const MarketTickerTape = () => {
  return (
    <div className="bg-slate-950/90 border-b border-slate-800/80 py-1.5 px-4 overflow-hidden text-[11px] font-mono select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-400 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-bold text-slate-200 uppercase tracking-wider">LIVE MARKET:</span>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">BIA HEINEKEN</span>
            <span className="text-emerald-400 font-bold font-mono">48,500đ ▲+12.4%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">NEON WHISKEY SOUR</span>
            <span className="text-emerald-400 font-bold font-mono">65,000đ ▲+8.1%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">DOUBLE CHEESEBURGER</span>
            <span className="text-rose-400 font-bold font-mono">59,000đ ▼-3.5%</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sky-400">EUR/VND</span>
            <span className="text-sky-300 font-mono">27,450đ</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-amber-400">BTC/USD</span>
            <span className="text-amber-300 font-mono">$65,420</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-400 shrink-0 text-[10px]">
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">LATENCY: 18ms</span>
        </div>
      </div>
    </div>
  );
};

function MainLayout() {
  const { user, token, loading, login, register, logout } = useAuth();
  const { addToast } = useToast();
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
  const [guestTab, setGuestTab] = useState('home'); // home, features, comparison, stats

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-darkBg text-slate-400 font-mono text-base">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 text-sky-400 animate-spin" />
          <span>Đang tải hồ sơ bảo mật Trader & Kết nối máy chủ...</span>
        </div>
      </div>
    );
  }

  // Login view if not authenticated
  if (!token || !user) {
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isRegister) {
        if (password !== confirmPassword) {
          addToast("Mật khẩu xác nhận không khớp!", 'error');
          return;
        }
        const res = await register(username, password, fullName, phone, email, role);
        if (!res.success) {
          addToast(res.message, 'error');
        } else {
          addToast("Đăng ký thành công! Chào mừng Trader mới.", 'success');
          setShowAuthModal(false);
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          addToast(res.message, 'error');
        } else {
          addToast("Đăng nhập thành công!", 'success');
          setShowAuthModal(false);
        }
      }
    };

    return (
      <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col font-sans">
        {/* Ticker Tape */}
        <MarketTickerTape />

        {/* Commercial Navbar */}
        <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex p-2 bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-400 rounded-xl shadow-lg shadow-sky-500/10">
              <Activity className="h-5 w-5 animate-pulse text-sky-400" />
            </span>
            <span 
              className="text-xl font-extrabold text-white tracking-wider font-share-mono cursor-pointer flex items-center gap-1.5"
              onClick={() => setGuestTab('home')}
            >
              FOOD <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">STOCK</span> EXCHANGE
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-mono tracking-wider">
            <button 
              onClick={() => setGuestTab('home')} 
              className={`transition uppercase font-bold focus:outline-none py-1.5 ${guestTab === 'home' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              TRANG CHỦ
            </button>
            <button 
              onClick={() => setGuestTab('features')} 
              className={`transition uppercase font-bold focus:outline-none py-1.5 ${guestTab === 'features' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              TÍNH NĂNG
            </button>
            <button 
              onClick={() => setGuestTab('comparison')} 
              className={`transition uppercase font-bold focus:outline-none py-1.5 ${guestTab === 'comparison' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              SO SÁNH ĐỐI THỦ
            </button>
            <button 
              onClick={() => setGuestTab('stats')} 
              className={`transition uppercase font-bold focus:outline-none py-1.5 ${guestTab === 'stats' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
            >
              THỊ TRƯỜNG
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsRegister(false);
                setShowAuthModal(true);
              }}
              className="text-xs font-bold font-mono tracking-wider text-slate-300 hover:text-white transition uppercase px-3 py-2"
            >
              ĐĂNG NHẬP
            </button>
            <button 
              onClick={() => {
                setIsRegister(true);
                setShowAuthModal(true);
              }}
              className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold hover:brightness-110 px-4 py-2 rounded-lg text-xs font-mono tracking-wider shadow-lg shadow-sky-500/20 transition uppercase"
            >
              MỞ VÍ NGAY
            </button>
          </div>
        </nav>

        {/* Dynamic Guest Landing Page */}
        <main className="flex-1 flex flex-col justify-center">
          {guestTab === 'home' && (
            <div id="hero" className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 py-16 items-center w-full">
              {/* Left Column: Hero Showcase */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs text-sky-400 font-mono">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                  SÀN GIAO DỊCH ẨM THỰC ĐẦU TIÊN TẠI VIỆT NAM
                </div>
                
                <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
                  Bắt Đáy Món Ngon <br />
                  <span className="bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
                    Chốt Lời Đêm Nay
                  </span>
                </h1>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                  Nơi giá menu đồ uống và ẩm thực thay đổi linh hoạt theo từng 10 giây dựa trên lực mua thực tế.
                  Khám phá cảm giác hồi hộp phân tích biểu đồ, đặt lệnh bắt đáy P2P và tham vấn trợ lý AI Broker độc quyền!
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => {
                      setIsRegister(false);
                      setShowAuthModal(true);
                    }}
                    className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold hover:brightness-110 px-8 py-3.5 rounded-xl text-sm font-mono tracking-wider shadow-xl shadow-sky-500/25 transition uppercase flex items-center gap-2"
                  >
                    VÀO PHÒNG GIAO DỊCH <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setGuestTab('features')}
                    className="border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 px-6 py-3.5 rounded-xl text-sm font-bold font-mono tracking-wider transition uppercase"
                  >
                    KHÁM PHÁ TÍNH NĂNG
                  </button>
                </div>

                {/* Trust stats */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800/80">
                  <div>
                    <div className="text-2xl font-black font-share-mono text-sky-400">10S</div>
                    <div className="text-[11px] text-slate-400 font-mono">Tốc Độ Cập Nhật Giá</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black font-share-mono text-emerald-400">&lt;150ms</div>
                    <div className="text-[11px] text-slate-400 font-mono">Độ Trễ WebSocket</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black font-share-mono text-amber-400">100%</div>
                    <div className="text-[11px] text-slate-400 font-mono">Minh Bạch Sổ Cái Hash</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Trading Preview Card */}
              <div className="lg:col-span-5 w-full space-y-4">
                <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">LIVE MARKET BOARD</span>
                    </div>
                    <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded font-mono">DYNAMIC PRICING</span>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Item 1 */}
                    <div className="border border-slate-800/80 bg-slate-950/60 p-3 rounded-xl flex items-center justify-between hover:border-sky-500/40 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=150" className="h-11 w-11 object-cover rounded-lg border border-slate-800" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Neon Whiskey Sour</div>
                          <div className="text-[9px] text-slate-400 font-mono">LINKED TO EUR/VND</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-sky-400 font-bold">55,000 đ</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">▲ +14.2%</span>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="border border-slate-800/80 bg-slate-950/60 p-3 rounded-xl flex items-center justify-between hover:border-sky-500/40 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150" className="h-11 w-11 object-cover rounded-lg border border-slate-800" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Double Cheese Burger</div>
                          <div className="text-[9px] text-slate-400 font-mono">COOL-DOWN DISCOUNT</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-sky-400 font-bold">69,000 đ</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border font-semibold text-rose-400 bg-rose-500/10 border-rose-500/20">▼ -4.5%</span>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="border border-slate-800/80 bg-slate-950/60 p-3 rounded-xl flex items-center justify-between hover:border-sky-500/40 transition">
                      <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=150" className="h-11 w-11 object-cover rounded-lg border border-slate-800" alt="" />
                        <div>
                          <div className="text-xs font-bold text-white">Matcha Latte Cream</div>
                          <div className="text-[9px] text-slate-400 font-mono">LINKED TO BTC</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-share-mono text-sm text-sky-400 font-bold">39,000 đ</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border font-semibold text-emerald-400 bg-emerald-500/10 border-emerald-500/20">▲ +2.1%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <button 
                      onClick={() => {
                        setIsRegister(false);
                        setShowAuthModal(true);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 text-sky-300 border border-sky-500/30 rounded-xl hover:bg-sky-500/30 text-xs font-bold font-mono tracking-wider transition uppercase"
                    >
                      BẮT ĐẦU TRẢI NGHIỆM GIAO DỊCH
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {guestTab === 'features' && (
            <section className="py-16 w-full max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-white font-share-mono uppercase tracking-wider">TÍNH NĂNG ĐỘT PHÁ</h2>
                <p className="text-xs text-sky-400 font-mono mt-2 uppercase tracking-wider">Hệ sinh thái công nghệ tài chính ẩm thực khép kín</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl space-y-4 hover:border-sky-500/40 transition">
                  <span className="inline-flex p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl">
                    <Activity className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Dynamic Pricing Engine</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Giá món ăn thay đổi tự động mỗi 10s theo lực mua thực tế. Quán càng đông khách order món nào, giá tự tăng; món rảnh không ai order tự động giảm giá cool-down để kích cầu.
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl space-y-4 hover:border-emerald-500/40 transition">
                  <span className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <BrainCircuit className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">AI Broker Advisor</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Trợ lý AI Python FastAPI thông minh tư vấn bắt đáy món hời nhất, dự báo xu hướng giá và thiết lập combo ăn uống tối ưu ngân sách cho khách hàng.
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl space-y-4 hover:border-amber-500/40 transition">
                  <span className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Chợ Thứ Cấp P2P</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Cho phép các bàn ăn trao đổi, niêm yết bán lại đồ uống cho nhau để ăn chênh lệch giá. Hỗ trợ cửa sổ hủy đơn 30 giây phạt 5% giao dịch.
                  </p>
                </div>

                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl space-y-4 hover:border-rose-500/40 transition">
                  <span className="inline-flex p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                    <Shield className="h-6 w-6" />
                  </span>
                  <h3 className="text-lg font-bold text-white font-share-mono uppercase">Market Crash Panic Mode</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sự kiện sập sàn kích hoạt báo động toàn hệ thống. Màn hình chớp đỏ, còi hú vang dội và toàn bộ đồ uống đồng loạt rớt giá trần về giá sàn trong 3 phút.
                  </p>
                </div>
              </div>
            </section>
          )}

          {guestTab === 'comparison' && (
            <section className="py-16 w-full max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-white font-share-mono uppercase tracking-wider">MA TRẬN CẠNH TRANH THỊ TRƯỜNG</h2>
                <p className="text-xs text-sky-400 font-mono mt-2 uppercase tracking-wider">So sánh tính năng khác biệt vượt trội so với các phần mềm nhà hàng truyền thống</p>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-slate-300">
                      <th className="p-4 font-bold">Tính Năng / Đặc Điểm</th>
                      <th className="p-4 font-bold text-sky-400 text-center bg-sky-500/10">Food Stock Exchange</th>
                      <th className="p-4 font-bold text-slate-400 text-center">KiotViet F&B</th>
                      <th className="p-4 font-bold text-slate-400 text-center">Sapo F&B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Định giá động theo Cung - Cầu Realtime</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Bảng Điện Tử Giao Dịch Chớp Xanh/Đỏ 60fps</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Trợ Lý AI Broker Tư Vấn Mua Món Hời</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Chợ Thứ Cấp P2P Chuyển Nhượng Món</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Sự Kiện Sập Sàn (Market Crash Panic Mode)</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                    <tr className="hover:bg-slate-800/30">
                      <td className="p-4 font-bold text-white">Bảo Mật Sổ Cái Mã Băm SHA-256 Nguyên Khối</td>
                      <td className="p-4 text-center bg-sky-500/5 text-emerald-400 font-bold"><CheckCircle2 className="h-5 w-5 mx-auto" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                      <td className="p-4 text-center text-slate-500"><XCircle className="h-5 w-5 mx-auto text-slate-600" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {guestTab === 'stats' && (
            <section className="py-16 w-full max-w-7xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-extrabold text-white font-share-mono uppercase tracking-wider">TÌNH HÌNH THỊ TRƯỜNG</h2>
                <p className="text-xs text-emerald-400 font-mono mt-2 uppercase tracking-wider">Thông số tổng hợp thực tế từ máy chủ giao dịch</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl text-center space-y-2">
                  <div className="text-xs text-slate-400 font-mono">BEER INDEX (VOLUME)</div>
                  <div className="font-share-mono text-3xl text-emerald-400 font-bold">12,450 đ/s</div>
                  <div className="text-[10px] text-slate-400">+14.2% vs hôm qua</div>
                </div>
                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl text-center space-y-2">
                  <div className="text-xs text-slate-400 font-mono">MATCHA COIN VALUE</div>
                  <div className="font-share-mono text-3xl text-rose-400 font-bold">29,000 đ</div>
                  <div className="text-[10px] text-slate-400">-3.0% vùng hỗ trợ</div>
                </div>
                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl text-center space-y-2">
                  <div className="text-xs text-slate-400 font-mono">ACTIVE TRADERS</div>
                  <div className="font-share-mono text-3xl text-sky-400 font-bold">1,842 Users</div>
                  <div className="text-[10px] text-slate-400">Đang kết nối WebSocket</div>
                </div>
                <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-2xl text-center space-y-2">
                  <div className="text-xs text-slate-400 font-mono">VÀO PHÒNG GIAO DỊCH</div>
                  <div className="font-share-mono text-3xl text-amber-400 font-bold">READY TO PLAY</div>
                  <button 
                    onClick={() => {
                      setIsRegister(false);
                      setShowAuthModal(true);
                    }}
                    className="text-[11px] text-amber-400 hover:underline font-mono uppercase font-bold"
                  >
                    Click để mở ví giao dịch
                  </button>
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Auth Modal Overlay */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md px-4">
            <div className="w-full max-w-md border border-slate-800 bg-slate-900/95 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
              
              <div className="text-center mb-8 relative z-10">
                <span className="inline-flex p-3 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-2xl mb-3">
                  <Award className="h-6 w-6" />
                </span>
                <h2 className="text-xl font-extrabold text-white font-share-mono tracking-wider uppercase">
                  {isRegister ? "MỞ TÀI KHOẢN TRADER" : "PHÒNG GIAO DỊCH"}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {isRegister ? "Đăng ký nhận ngay 100.000đ trải nghiệm" : "Đăng nhập để vào bảng điện tử đặt món"}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Tên đăng nhập (Username)..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                {isRegister && (
                  <>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Họ và tên..."
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input 
                        type="tel" 
                        placeholder="Số điện thoại..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="Địa chỉ Email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                      />
                    </div>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <select 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 pl-10 pr-10 py-3 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-sky-400 font-mono appearance-none"
                      >
                        <option value="CUSTOMER">Vai trò: Khách hàng (CUSTOMER)</option>
                        <option value="CASHIER">Vai trò: Thu ngân (CASHIER)</option>
                        <option value="KITCHEN">Vai trò: Nhân viên Bếp (KITCHEN)</option>
                        <option value="ADMIN">Vai trò: Quản trị viên (ADMIN)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input 
                    type="password" 
                    placeholder="Mật mã (Password)..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="6"
                    className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                  />
                </div>

                {isRegister && (
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input 
                      type="password" 
                      placeholder="Xác nhận mật mã..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength="6"
                      className="w-full bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold hover:brightness-110 text-sm rounded-xl tracking-wider font-mono uppercase shadow-lg shadow-sky-500/20 transition duration-300"
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
                  className="text-xs text-sky-400 hover:underline font-mono"
                >
                  {isRegister ? "Đã có tài khoản? Đăng nhập ngay" : "Chưa có ví? Đăng ký mở tài khoản (Tặng 100k)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Broker Chat Widget */}
        <AiChatWidget />
      </div>
    );
  }


  // Render Logged-in Trader Portal
  return (
    <div className="flex flex-col min-h-screen bg-darkBg text-slate-100 font-sans">
      {/* Ticker Tape Header */}
      <MarketTickerTape />

      {/* Main Glassmorphism Navbar */}
      <header className="bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl sticky top-0 z-40 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/30 text-sky-400 rounded-xl">
            <Activity className="h-5 w-5 animate-pulse text-sky-400" />
          </span>
          <span className="text-lg font-extrabold text-white tracking-wider font-share-mono flex items-center gap-1">
            FOOD <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">STOCK</span> EXCHANGE
          </span>
        </div>

        {/* Tab Navigation Hub */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/80 p-1 border border-slate-800 rounded-xl text-xs font-mono">
          <button 
            onClick={() => setActiveTab('trading')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'trading' 
                ? 'bg-gradient-to-r from-sky-500/20 to-emerald-500/20 text-sky-300 border border-sky-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> BẢNG GIAO DỊCH
          </button>

          {(user.role === 'ADMIN' || user.role === 'KITCHEN') && (
            <button 
              onClick={() => setActiveTab('kds')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                activeTab === 'kds' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4" /> MÀN HÌNH BẾP (KDS)
            </button>
          )}

          {(user.role === 'ADMIN' || user.role === 'CASHIER') && (
            <button 
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                activeTab === 'pos' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Landmark className="h-4 w-4" /> THU NGÂN (POS)
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
                activeTab === 'admin' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="h-4 w-4" /> BAN QUẢN TRỊ (ADMIN)
            </button>
          )}

          {/* New Profile Tab */}
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${
              activeTab === 'profile' 
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="h-4 w-4" /> TÀI KHOẢN & LỊCH SỬ
          </button>
        </div>

        {/* User Balance & Profile Hub */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-mono">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="text-[9px] text-slate-400 uppercase">SỐ DƯ VÍ</div>
              <div className="font-share-mono font-bold text-emerald-400 text-sm">{Math.round(user.wallet_balance || 0).toLocaleString()} đ</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white font-mono">{user.username}</div>
              <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded font-mono uppercase">{user.role}</span>
            </div>
            <button 
              onClick={logout}
              title="Đăng xuất"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-800 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1">
        {activeTab === 'trading' && <TradingBoard />}
        {activeTab === 'kds' && <KdsBoard />}
        {activeTab === 'pos' && <PosConsole />}
        {activeTab === 'admin' && <AdminControls />}
        {activeTab === 'profile' && <UserProfile />}
      </main>

      {/* Floating AI Broker Chat Widget */}
      <AiChatWidget />
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

