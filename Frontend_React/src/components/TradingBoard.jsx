import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import ProductDetailModal from './ProductDetailModal';
import { 
  AlertOctagon, TrendingUp, TrendingDown, Clock, ShoppingCart, 
  Trash2, ShieldAlert, BrainCircuit, Landmark, BarChart3, MapPin,
  Sparkles, CheckCircle2, Zap, Tag
} from 'lucide-react';

// Modern Glassmorphic Product Card
const ProductCard = React.memo(({ product, isHalted, flash, onSelect, onAdd }) => {
  let flashClass = '';
  if (flash === 'up') flashClass = 'animate-green-glow border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
  if (flash === 'down') flashClass = 'animate-red-glow border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]';

  const pctChange = ((product.current_price - product.base_price) / product.base_price) * 100;
  const isUp = pctChange > 0;
  const isDown = pctChange < 0;
  const changeText = `${isUp ? '▲ +' : isDown ? '▼ ' : ''}${pctChange.toFixed(1)}%`;
  const changeColor = isUp 
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
    : isDown 
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
      : 'text-slate-400 bg-slate-800/40 border-slate-700/50';

  return (
    <div className={`border border-slate-800/90 bg-slate-900/80 backdrop-blur-xl p-4 relative rounded-2xl hover:border-sky-500/50 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300 flex flex-col justify-between ${flashClass} ${isHalted ? 'opacity-50' : ''}`}>
      {isHalted && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 rounded-2xl p-4 text-center backdrop-blur-md">
          <ShieldAlert className="h-9 w-9 text-rose-500 mb-2 animate-bounce" />
          <span className="text-rose-400 text-sm font-bold font-mono tracking-wider">TRADING HALTED</span>
          <span className="text-xs text-slate-400 mt-1">Biến động giá vượt 40% (Circuit Breaker)</span>
        </div>
      )}

      <div>
        <div className="flex justify-between items-start mb-2 gap-2">
          <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800 font-mono uppercase font-bold">
            {product.category}
          </span>

          {product.linked_asset && (
            <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider font-bold animate-pulse flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> LINKED TO {product.linked_asset}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3.5 my-2">
          <img 
            src={product.image_url} 
            alt={product.name} 
            onClick={() => onSelect(product)}
            className="h-16 w-16 object-cover border border-slate-700/80 cursor-pointer hover:scale-105 transition rounded-xl shadow-lg shrink-0" 
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm cursor-pointer hover:text-sky-400 transition truncate" onClick={() => onSelect(product)}>{product.name}</h3>
            
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-share-mono text-2xl font-bold text-sky-400">{Math.round(product.current_price).toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-mono">VND</span>
            </div>
            
            <div className="mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border font-bold inline-block ${changeColor}`}>{changeText}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/80">
        <button 
          onClick={() => onSelect(product)}
          className="flex-1 text-center py-2 text-xs border border-slate-700/80 rounded-xl hover:bg-slate-800/80 hover:text-white transition font-mono font-bold text-slate-300"
        >
          XEM BIỂU ĐỒ
        </button>
        <button 
          onClick={() => onAdd(product)}
          className="flex-1 text-center py-2 text-xs bg-gradient-to-r from-sky-500/20 to-emerald-500/20 text-sky-300 border border-sky-500/40 rounded-xl hover:bg-sky-500/30 transition font-mono font-bold flex items-center justify-center gap-1 shadow-md shadow-sky-500/10"
        >
          <ShoppingCart className="h-3.5 w-3.5" /> MUA NGAY
        </button>
      </div>
    </div>
  );
});

// Modern Order Card
const OrderCard = React.memo(({ order, onCancel }) => {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const checkCountdown = () => {
      const created = new Date(order.created_at).getTime();
      const diff = (Date.now() - created) / 1000;
      const remaining = 30 - diff;
      setCountdown(remaining > 0 ? Math.round(remaining) : 0);
    };

    checkCountdown();
    const interval = setInterval(checkCountdown, 1000);

    return () => clearInterval(interval);
  }, [order.created_at]);

  const statusColors = {
    'PENDING': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'PREPARING': 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    'READY': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'SERVED': 'text-slate-400 bg-slate-800/40 border-slate-700/50',
    'CANCELLED': 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  };

  return (
    <div className="border border-slate-800/90 bg-slate-950/60 p-3.5 rounded-xl text-xs space-y-2.5">
      <div className="flex justify-between items-center">
        <span className="font-share-mono text-slate-400 font-bold">MÃ ĐƠN: #{order.id.slice(0, 8)}</span>
        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold font-mono ${statusColors[order.status]}`}>{order.status}</span>
      </div>
      
      <div className="space-y-1 pl-2 border-l-2 border-slate-800">
        {order.items?.map((item, idx) => (
          <div key={idx} className="text-slate-200 font-semibold text-xs">
            {item.name} <span className="text-slate-400 font-mono font-normal">({item.qty} × {Math.round(item.price).toLocaleString()}đ)</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
        <span className="font-share-mono font-bold text-sky-400 text-sm">{Math.round(order.total_amount).toLocaleString()} VND</span>
        {order.status === 'PENDING' && countdown > 0 ? (
          <button 
            onClick={() => onCancel(order.id)}
            className="bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] font-mono transition"
          >
            HỦY ĐƠN (PHẠT 5%) [{countdown}s]
          </button>
        ) : null}
      </div>
    </div>
  );
});


export default function TradingBoard() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [tableNumber, setTableNumber] = useState('09');
  const [cart, setCart] = useState([]);

  // Sub-navigation tabs
  const [activeSubTab, setActiveSubTab] = useState('menu');

  // Limit Order States
  const [limitProduct, setLimitProduct] = useState('');
  const [limitQty, setLimitQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [myLimits, setMyLimits] = useState([]);

  // P2P States
  const [p2pListings, setP2pListings] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [p2pResalePrice, setP2pResalePrice] = useState({});
  const [p2pActiveSubTab, setP2pActiveSubTab] = useState('market');

  // AI Broker Chat States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiBudget, setAiBudget] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Delivery quotes states
  const [isDelivery, setIsDelivery] = useState(false);
  const [destLong, setDestLong] = useState('106.712000');
  const [destLat, setDestLat] = useState('10.801000');
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const { priceUpdates, crashData, haltedProducts, p2pUpdates, socket } = useSocket() || {};
  const { user, setUser, logout } = useAuth();

  const [flashStates, setFlashStates] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchMyOrders();
    fetchMyLimits();
    fetchP2PListings();
    fetchMyTickets();
  }, []);

  useEffect(() => {
    if (!p2pUpdates) return;
    fetchP2PListings();
    fetchMyTickets();
  }, [p2pUpdates]);

  useEffect(() => {
    if (!priceUpdates || Object.keys(priceUpdates).length === 0) return;

    setProducts(prev => {
      const next = [...prev];
      let hasChanges = false;

      Object.keys(priceUpdates).forEach(id => {
        const update = priceUpdates[id];
        const index = next.findIndex(p => p.id === parseInt(id));
        if (index !== -1 && next[index].current_price !== update.price) {
          next[index] = {
            ...next[index],
            current_price: update.price
          };
          hasChanges = true;

          setFlashStates(prevFlash => ({
            ...prevFlash,
            [id]: update.trend === 'up' ? 'up' : 'down'
          }));

          setTimeout(() => {
            setFlashStates(prevFlash => {
              const copy = { ...prevFlash };
              delete copy[id];
              return copy;
            });
          }, 1000);
        }
      });
      return hasChanges ? next : prev;
    });
  }, [priceUpdates]);

  useEffect(() => {
    if (!socket || !user) return;

    const eventName = `LIMIT_ORDER_FILLED_${user.id}`;
    socket.on(eventName, (data) => {
      alert(`🔔 LỆNH CHỜ KHỚP THÀNH CÔNG!\nĐã tự động mua ${data.qty} ${data.product_name} tại giá ${data.executed_price.toLocaleString()}đ.`);
      fetchMyLimits();
      fetchMyOrders();
      fetchMyTickets();
      axios.get('http://localhost:5000/api/auth/me').then(res => setUser(res.data));
    });

    return () => {
      socket.off(eventName);
    };
  }, [socket, user, setUser]);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data);
      if (res.data.length > 0 && !limitProduct) {
        setLimitProduct(res.data[0].id);
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/my-orders');
      setMyOrders(res.data);
    } catch (err) {
      console.error('Fetch my orders error:', err);
    }
  };

  const fetchMyLimits = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/limit/my-limits');
      setMyLimits(res.data);
    } catch (err) {
      console.error('Fetch my limits error:', err);
    }
  };

  const fetchP2PListings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/p2p/listings');
      setP2pListings(res.data);
    } catch (err) {
      console.error('Fetch listings error:', err);
    }
  };

  const fetchMyTickets = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/my-tickets');
      setMyTickets(res.data);
    } catch (err) {
      console.error('Fetch my tickets error:', err);
    }
  };

  const addToCart = useCallback((product) => {
    if (haltedProducts[product.id]) return;
    setCart(prev => {
      const index = prev.findIndex(item => item.product_id === product.id);
      if (index !== -1) {
        const next = [...prev];
        next[index].quantity += 1;
        return next;
      }
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, expected_price: product.current_price }];
    });
  }, [haltedProducts]);

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  }, []);

  // Calculate delivery fee
  const handleCalculateDelivery = async () => {
    setDeliveryLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/delivery/quote', {
        dest_longitude: parseFloat(destLong),
        dest_latitude: parseFloat(destLat)
      });
      setDeliveryQuote(res.data);
    } catch (err) {
      alert('Không thể tính toán phí giao hàng.');
    } finally {
      setDeliveryLoading(false);
    }
  };

  const cartTotal = useMemo(() => {
    let itemsSum = cart.reduce((sum, item) => sum + (item.expected_price * item.quantity), 0);
    if (isDelivery && deliveryQuote) {
      itemsSum += deliveryQuote.shipping_fee;
    }
    return itemsSum;
  }, [cart, isDelivery, deliveryQuote]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      // In a real app we might pass shipping cost details, here we keep logic consistent with /place
      const res = await axios.post('http://localhost:5000/api/orders/place', {
        table_number: isDelivery ? 'DELIVERY' : tableNumber,
        items: cart
      });
      alert('Đặt lệnh thành công!');
      setCart([]);
      setDeliveryQuote(null);
      setIsDelivery(false);
      fetchMyOrders();
      fetchMyTickets();
      if (user) {
        setUser(prev => ({ ...prev, wallet_balance: res.data.new_balance }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể đặt món. Vui lòng thử lại.');
    }
  };

  const handleCancelOrder = useCallback(async (orderId) => {
    if (!window.confirm('Hủy lệnh trong vòng 30s sẽ chịu mức phạt 5% phí. Bạn có chắc muốn hủy?')) return;
    try {
      const res = await axios.post(`http://localhost:5000/api/orders/${orderId}/cancel`);
      alert(`Đã hủy thành công. Đã hoàn trả lại ${res.data.refund_amount.toLocaleString()} VND`);
      fetchMyOrders();
      fetchMyTickets();
      if (user) {
        const meRes = await axios.get('http://localhost:5000/api/auth/me');
        setUser(meRes.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy đơn thất bại.');
    }
  }, [user, setUser]);

  const handlePlaceLimitOrder = async (e) => {
    e.preventDefault();
    if (!limitProduct || !limitQty || !limitPrice) return;
    try {
      await axios.post('http://localhost:5000/api/orders/limit', {
        product_id: parseInt(limitProduct),
        quantity: parseInt(limitQty),
        target_price: parseFloat(limitPrice)
      });
      alert('Đã thiết lập Lệnh Chờ Tự Động!');
      setLimitPrice('');
      fetchMyLimits();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi đặt lệnh chờ.');
    }
  };

  const handleCancelLimit = async (limitId) => {
    try {
      await axios.post(`http://localhost:5000/api/orders/limit/${limitId}/cancel`);
      alert('Đã hủy lệnh chờ.');
      fetchMyLimits();
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy lệnh chờ thất bại.');
    }
  };

  const handleListP2P = async (orderItemId) => {
    const price = p2pResalePrice[orderItemId];
    if (!price || parseFloat(price) <= 0) {
      alert('Vui lòng nhập giá treo bán hợp lệ.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/p2p/list', {
        order_item_id: parseInt(orderItemId),
        price: parseFloat(price)
      });
      alert('Đã treo bán vé đồ uống lên chợ thứ cấp!');
      fetchMyTickets();
      fetchP2PListings();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể treo bán.');
    }
  };

  const handleBuyP2P = async (listingId) => {
    if (!window.confirm('Xác nhận mua lại vé đồ uống này?')) return;
    try {
      const res = await axios.post('http://localhost:5000/api/p2p/buy', { listing_id: listingId });
      alert(`Đã mua lại thành công!`);
      fetchP2PListings();
      fetchMyTickets();
      if (user) {
        setUser(prev => ({ ...prev, wallet_balance: res.data.new_balance }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể mua lại vé.');
    }
  };

  const handleCancelP2P = async (listingId) => {
    try {
      await axios.post(`http://localhost:5000/api/p2p/listing/${listingId}/cancel`);
      alert('Đã hủy treo bán.');
      fetchP2PListings();
      fetchMyTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy thất bại.');
    }
  };

  const handleConsultAI = async (e) => {
    e.preventDefault();
    if (!aiBudget) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await axios.post('http://localhost:5000/api/ai/advise', {
        budget: parseFloat(aiBudget)
      });
      setAiResponse(res.data.advice);
    } catch (err) {
      setAiResponse('Hệ thống AI Broker đang bận. Vui lòng thử lại sau.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectProduct = useCallback((product) => {
    setSelectedProduct(product);
  }, []);

  const handlePresetCoords = (lng, lat) => {
    setDestLong(lng);
    setDestLat(lat);
    setDeliveryQuote(null);
  };

  return (
    <div className={`min-h-screen pb-12 transition-all duration-300 ${crashData.isCrash ? 'panic-mode-active border-neonRed bg-red-950/20' : ''}`}>
      {crashData.isCrash && (
        <div className="bg-neonRed text-white font-bold p-3 text-center flex items-center justify-center gap-4 animate-pulse">
          <AlertOctagon className="h-6 w-6" />
          <span>SẬP SÀN THỊ TRƯỜNG! GIÁ ĐỒ UỐNG CHẠM ĐÁY TRONG {crashData.remaining} GIÂY NỮA!</span>
          <AlertOctagon className="h-6 w-6" />
        </div>
      )}



      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6 flex gap-4 border-b border-gray-850 pb-2">
        <button 
          onClick={() => setActiveSubTab('menu')}
          className={`pb-2 px-1 text-sm font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'menu' ? 'text-neonCyan border-b-2 border-neonCyan' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> BẢNG GIÁ MENU
        </button>
        <button 
          onClick={() => setActiveSubTab('limit_order')}
          className={`pb-2 px-1 text-sm font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'limit_order' ? 'text-neonYellow border-b-2 border-neonYellow' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Clock className="h-4 w-4" /> LỆNH CHỜ TỰ ĐỘNG (LIMIT)
        </button>
        <button 
          onClick={() => setActiveSubTab('p2p')}
          className={`pb-2 px-1 text-sm font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'p2p' ? 'text-neonGreen border-b-2 border-neonGreen' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Landmark className="h-4 w-4" /> CHỢ THỨ CẤP P2P
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          {activeSubTab === 'menu' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-bold text-gray-400 font-mono uppercase tracking-wider">Trading Menu Board</h2>
                <span className="text-xs text-gray-500">Giá cập nhật sau mỗi 10 giây</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map(p => (
                  <ProductCard 
                    key={p.id}
                    product={p}
                    isHalted={haltedProducts[p.id]?.halted}
                    flash={flashStates[p.id]}
                    onSelect={handleSelectProduct}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'limit_order' && (
            <div className="space-y-6">
              <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl">
                <h2 className="text-md font-bold text-neonYellow font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Thiết Lập Mua Tự Động (Limit Order)
                </h2>
                <form onSubmit={handlePlaceLimitOrder} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-xs text-gray-500 font-mono block mb-1">Mặt hàng</label>
                    <select 
                      value={limitProduct} 
                      onChange={(e) => setLimitProduct(e.target.value)}
                      className="w-full bg-black border border-gray-850 p-2.5 rounded-lg text-sm focus:outline-none"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Giá hiện tại: {Math.round(p.current_price).toLocaleString()}đ)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono block mb-1">Số lượng</label>
                    <input 
                      type="number" 
                      min="1"
                      value={limitQty}
                      onChange={(e) => setLimitQty(e.target.value)}
                      className="w-full bg-black border border-gray-850 p-2.5 rounded-lg text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-mono block mb-1">Mức giá mua kích hoạt (VND)</label>
                    <input 
                      type="number" 
                      placeholder="VD: 25000"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      className="w-full bg-black border border-gray-850 p-2.5 rounded-lg text-sm text-neonYellow font-share-mono focus:outline-none"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full py-2.5 bg-neonYellow/20 text-neonYellow border border-neonYellow/30 font-bold text-xs rounded-lg hover:bg-neonYellow/35 md:col-span-3 transition"
                  >
                    KÍCH HOẠT LỆNH MUA TỰ ĐỘNG
                  </button>
                </form>
              </div>

              <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl">
                <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-4">Các Lệnh Chờ Của Tôi</h2>
                {myLimits.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">Bạn chưa cấu hình lệnh chờ nào.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-850 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-850 bg-black/40 text-gray-400 font-mono">
                          <th className="p-3">Sản phẩm</th>
                          <th className="p-3 text-center">Số lượng</th>
                          <th className="p-3 text-right">Giá chờ mua</th>
                          <th className="p-3 text-center">Trạng thái</th>
                          <th className="p-3 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myLimits.map(limit => (
                          <tr key={limit.id} className="border-b border-gray-850 hover:bg-white/5">
                            <td className="p-3 font-semibold text-white">{limit.product_name}</td>
                            <td className="p-3 text-center">{limit.quantity}</td>
                            <td className="p-3 text-right font-share-mono text-neonYellow">{Math.round(limit.target_price).toLocaleString()}đ</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                limit.status === 'PENDING' ? 'text-neonYellow bg-neonYellow/10 border-neonYellow/20' :
                                limit.status === 'FILLED' ? 'text-neonGreen bg-neonGreen/10 border-neonGreen/20' : 'text-gray-500 border-gray-800'
                              }`}>{limit.status}</span>
                            </td>
                            <td className="p-3 text-center">
                              {limit.status === 'PENDING' && (
                                <button 
                                  onClick={() => handleCancelLimit(limit.id)}
                                  className="text-[10px] bg-neonRed/20 hover:bg-neonRed/35 text-neonRed border border-neonRed/30 px-2 py-1 rounded transition"
                                >
                                  HỦY LỆNH
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'p2p' && (
            <div className="space-y-6">
              <div className="flex gap-4 border-b border-gray-850 pb-1">
                <button 
                  onClick={() => setP2pActiveSubTab('market')}
                  className={`pb-1 text-xs font-bold font-mono transition ${
                    p2pActiveSubTab === 'market' ? 'text-neonGreen border-b border-neonGreen' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  MUA LẠI VÉ ĐỒ UỐNG (BUY LISTINGS)
                </button>
                <button 
                  onClick={() => setP2pActiveSubTab('inventory')}
                  className={`pb-1 text-xs font-bold font-mono transition ${
                    p2pActiveSubTab === 'inventory' ? 'text-neonGreen border-b border-neonGreen' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  VÉ SỞ HỮU CHƯA DÙNG (SELL TICKETS)
                </button>
              </div>

              {p2pActiveSubTab === 'market' && (
                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl">
                  <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-4">Danh Sách Vé Đang Rao Bán Chợ Thứ Cấp</h2>
                  {p2pListings.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-12">Chợ P2P đang trống. Chưa có ai đăng tin bán lại vé nước uống.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {p2pListings.map(list => (
                        <div key={list.listing_id} className="border border-gray-850 bg-black/35 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={list.image_url} alt={list.product_name} className="h-12 w-12 object-cover border border-gray-800 rounded-lg" />
                            <div>
                              <div className="font-bold text-white text-sm">{list.product_name}</div>
                              <div className="text-[10px] text-gray-500 font-mono">Người bán: {list.seller_name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">Số lượng: {list.quantity} ly</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-share-mono text-neonGreen font-bold text-lg">{Math.round(list.price).toLocaleString()}đ</div>
                            <button 
                              onClick={() => handleBuyP2P(list.listing_id)}
                              className="text-[10px] bg-neonGreen/20 hover:bg-neonGreen/35 text-neonGreen border border-neonGreen/30 px-3 py-1.5 rounded-lg mt-2 font-bold transition"
                            >
                              MUA VÉ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {p2pActiveSubTab === 'inventory' && (
                <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl">
                  <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-4">Các Vé Nước Uống Tôi Sở Hữu (Chưa phục vụ)</h2>
                  {myTickets.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-12">Bạn chưa mua hoặc chưa sở hữu vé đồ uống chưa dùng nào để rao bán.</p>
                  ) : (
                    <div className="space-y-4">
                      {myTickets.map(ticket => (
                        <div key={ticket.order_item_id} className="border border-gray-850 bg-black/35 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img src={ticket.image_url} alt={ticket.product_name} className="h-12 w-12 object-cover border border-gray-800 rounded-lg" />
                            <div>
                              <div className="font-bold text-white text-sm">{ticket.product_name}</div>
                              <div className="text-xs text-gray-500">Giá mua trước đó: {Math.round(ticket.price_at_purchase).toLocaleString()}đ</div>
                              <div className="text-xs text-gray-400 mt-0.5">Số lượng: {ticket.quantity} ly</div>
                            </div>
                          </div>
                          
                          <div className="flex items-end gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 font-mono block mb-1">Mức giá treo bán (đ)</label>
                              <input 
                                type="number" 
                                placeholder="Nhập giá..."
                                value={p2pResalePrice[ticket.order_item_id] || ''}
                                onChange={(e) => setP2pResalePrice(prev => ({ ...prev, [ticket.order_item_id]: e.target.value }))}
                                className="bg-black border border-gray-850 p-1.5 rounded w-28 text-sm font-share-mono text-neonGreen focus:outline-none"
                              />
                            </div>
                            <button 
                              onClick={() => handleListP2P(ticket.order_item_id)}
                              className="text-[10px] bg-neonGreen/20 hover:bg-neonGreen/35 text-neonGreen border border-neonGreen/30 px-3 py-2 rounded-lg font-bold transition"
                            >
                              ĐĂNG BÁN P2P
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Cart & Orders */}
        <div className="space-y-6">
          <div className="border border-gray-880 bg-darkCard/40 p-4 rounded-xl space-y-4">
            <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-gray-850 pb-2">
              <ShoppingCart className="h-5 w-5 text-neonCyan" /> Lệnh Chờ Gửi
            </h2>

            {cart.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 font-mono text-xs">Chưa có món ăn được chọn.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex justify-between items-center text-sm border-b border-gray-850 pb-2">
                      <div>
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-gray-500 font-share-mono">Số lượng: {item.quantity} × {Math.round(item.expected_price).toLocaleString()}đ</div>
                      </div>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-gray-500 hover:text-neonRed transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Delivery check box */}
                <div className="border-t border-gray-850 pt-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="check-delivery"
                      checked={isDelivery}
                      onChange={(e) => {
                        setIsDelivery(e.target.checked);
                        if(!e.target.checked) setDeliveryQuote(null);
                      }}
                      className="accent-neonCyan cursor-pointer h-4 w-4"
                    />
                    <label htmlFor="check-delivery" className="text-xs text-gray-300 font-mono select-none cursor-pointer flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-neonCyan" /> GIAO HÀNG TẬN NƠI (DELIVERY)
                    </label>
                  </div>

                  {isDelivery && (
                    <div className="mt-3 bg-black/40 p-3 rounded-lg border border-gray-850 space-y-3">
                      <div className="text-[10px] text-gray-500 font-mono uppercase">Tọa độ đích giao hàng</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-0.5">Kinh độ (Long)</label>
                          <input 
                            type="text" 
                            value={destLong}
                            onChange={(e) => { setDestLong(e.target.value); setDeliveryQuote(null); }}
                            className="w-full bg-black border border-gray-800 text-xs px-2 py-1 rounded text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 block mb-0.5">Vĩ độ (Lat)</label>
                          <input 
                            type="text" 
                            value={destLat}
                            onChange={(e) => { setDestLat(e.target.value); setDeliveryQuote(null); }}
                            className="w-full bg-black border border-gray-800 text-xs px-2 py-1 rounded text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Coordinates presets */}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handlePresetCoords('106.712000', '10.801000')} className="flex-1 py-0.5 border border-gray-800 bg-gray-900 text-[9px] text-gray-400 rounded font-mono">Bình Thạnh</button>
                        <button type="button" onClick={() => handlePresetCoords('106.700000', '10.772000')} className="flex-1 py-0.5 border border-gray-800 bg-gray-900 text-[9px] text-gray-400 rounded font-mono">Quận 1</button>
                        <button type="button" onClick={() => handlePresetCoords('106.725000', '10.729000')} className="flex-1 py-0.5 border border-gray-800 bg-gray-900 text-[9px] text-gray-400 rounded font-mono">Quận 7</button>
                      </div>

                      <button 
                        type="button"
                        onClick={handleCalculateDelivery}
                        disabled={deliveryLoading}
                        className="w-full py-1.5 bg-neonCyan/20 text-neonCyan border border-neonCyan/30 text-[10px] font-bold rounded hover:bg-neonCyan/35 transition"
                      >
                        {deliveryLoading ? "ĐANG TÍNH PHÍ..." : "TÍNH PHÍ & QUÃNG ĐƯỜNG (ORS)"}
                      </button>

                      {deliveryQuote && (
                        <div className="border-t border-gray-850 pt-2 space-y-1 text-[11px] font-mono text-gray-300">
                          <div className="flex justify-between">
                            <span>Quãng đường:</span>
                            <span className="text-white">{deliveryQuote.distance_km} km</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Thời gian:</span>
                            <span className="text-white">~{deliveryQuote.estimated_duration_minutes} phút</span>
                          </div>
                          <div className="flex justify-between text-neonCyan font-bold">
                            <span>Phí Ship động:</span>
                            <span>{deliveryQuote.shipping_fee.toLocaleString()}đ</span>
                          </div>
                          <div className="text-[8px] text-gray-600 text-right mt-1">({deliveryQuote.source})</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-gray-850 pt-4">
                  <span className="text-xs text-gray-500 font-mono">TỔNG KHỚP LỆNH:</span>
                  <span className="font-share-mono text-2xl font-bold text-neonCyan">{Math.round(cartTotal).toLocaleString()}đ</span>
                </div>

                <button 
                  onClick={handlePlaceOrder}
                  disabled={isDelivery && !deliveryQuote}
                  className={`w-full text-center py-3 font-bold rounded-lg transition ${
                    isDelivery && !deliveryQuote 
                      ? 'bg-gray-800 text-gray-600 border border-gray-850 cursor-not-allowed' 
                      : 'bg-neonGreen/20 text-neonGreen border border-neonGreen/30 hover:bg-neonGreen/30'
                  }`}
                >
                  KHỚP LỆNH MUA (ORDER)
                </button>
              </div>
            )}
          </div>

          {/* Active Orders */}
          <div className="border border-gray-880 bg-darkCard/40 p-4 rounded-xl">
            <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-neonYellow" /> Lịch sử & Trạng thái Đơn
            </h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {myOrders.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6">Chưa có giao dịch nào.</p>
              ) : (
                myOrders.map(order => (
                  <OrderCard 
                    key={order.id}
                    order={order}
                    onCancel={handleCancelOrder}
                  />
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Floating AI Broker Widget */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="bg-neonCyan text-black p-4 rounded-full shadow-2xl hover:scale-105 transition flex items-center justify-center border-2 border-black hover:bg-white"
        >
          <BrainCircuit className="h-6 w-6 animate-pulse" />
        </button>
      </div>

      {/* AI Broker Consultation Chat Drawer */}
      {isAiOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm border border-gray-850 bg-darkCard p-5 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center border-b border-gray-850 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-neonCyan" />
              <div>
                <h3 className="font-bold text-sm text-white">AI Broker Advisor</h3>
                <span className="text-[9px] text-neonGreen font-mono uppercase">Live Trading Analysis</span>
              </div>
            </div>
            <button onClick={() => setIsAiOpen(false)} className="text-xs text-gray-500 hover:text-white">ĐÓNG</button>
          </div>

          <form onSubmit={handleConsultAI} className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase block mb-1">Nhập ngân sách của bạn (VND)</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="VD: 150000"
                  value={aiBudget}
                  onChange={(e) => setAiBudget(e.target.value)}
                  className="flex-1 bg-black border border-gray-850 px-3 py-2 rounded-lg text-sm text-neonCyan font-share-mono focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={aiLoading}
                  className="bg-neonCyan/20 text-neonCyan border border-neonCyan/30 px-4 py-2 text-xs font-bold rounded-lg hover:bg-neonCyan/35 transition"
                >
                  {aiLoading ? "ĐANG PHÂN TÍCH..." : "TƯ VẤN"}
                </button>
              </div>
              <button 
                type="button" 
                onClick={() => user && setAiBudget(Math.round(user.wallet_balance).toString())}
                className="text-[9px] text-neonCyan hover:underline font-mono mt-1.5 block"
              >
                Lấy số dư hiện tại trong ví
              </button>
            </div>
          </form>

          {/* AI Message Reply Window */}
          {(aiLoading || aiResponse) && (
            <div className="mt-4 bg-black/40 border border-gray-850 p-3.5 rounded-lg text-xs max-h-64 overflow-y-auto pr-1">
              {aiLoading ? (
                <div className="text-gray-500 font-mono flex items-center justify-center gap-2 py-4">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-neonCyan border-t-transparent rounded-full"></span>
                  AI Broker đang soi chart...
                </div>
              ) : (
                <div className="text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
