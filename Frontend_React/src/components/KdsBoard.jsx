import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { ChefHat, Play, Check, Flame } from 'lucide-react';

// Sub-component riêng cho thẻ đơn hàng tại bếp
const KdsCard = React.memo(({ order, onUpdateStatus }) => {
  const [slaInfo, setSlaInfo] = useState({ colorClass: 'text-slate-400 bg-slate-950 border-slate-800', label: '0 phút', isAlert: false });

  useEffect(() => {
    const calculateSLA = () => {
      const elapsedMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
      
      let colorClass = 'text-slate-400 bg-slate-950 border-slate-800';
      let label = `${Math.round(elapsedMinutes)} phút`;
      let isAlert = false;

      if (elapsedMinutes >= 15) {
        colorClass = 'text-rose-400 bg-rose-950/50 border-rose-500 animate-pulse';
        label = `CẢNH BÁO TRỄ: ${Math.round(elapsedMinutes)} phút`;
        isAlert = true;
      } else if (elapsedMinutes >= 10) {
        colorClass = 'text-amber-300 bg-amber-950/40 border-amber-500';
        label = `CẦN LÀM GẤP: ${Math.round(elapsedMinutes)} phút`;
      }

      setSlaInfo({ colorClass, label, isAlert });
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 5000); // Cập nhật SLA mỗi 5 giây

    return () => clearInterval(interval);
  }, [order.created_at]);

  return (
    <div className={`border p-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl relative space-y-3 transition-all duration-300 shadow-lg ${slaInfo.isAlert ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'border-slate-800'}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-lg font-bold text-white font-share-mono">BÀN {order.table_number}</span>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">MÃ ĐƠN: #{order.id.slice(0, 8)}</div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border transition-colors duration-500 ${slaInfo.colorClass}`}>{slaInfo.label}</span>
      </div>

      <div className="space-y-2 border-t border-b border-slate-800/80 py-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-slate-200 font-bold">
            <span>{item.name}</span>
            <span className="text-sky-400 font-share-mono text-base">x{item.qty}</span>
          </div>
        ))}
      </div>

      {order.status === 'PENDING' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'PREPARING')}
          className="w-full py-2.5 bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/40 rounded-xl flex items-center justify-center gap-2 font-bold text-xs font-mono transition shadow-md shadow-sky-500/10"
        >
          <Play className="h-4 w-4" /> BẮT ĐẦU NẤU
        </button>
      )}

      {order.status === 'PREPARING' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'READY')}
          className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2 font-bold text-xs font-mono transition shadow-md shadow-emerald-500/10"
        >
          <Check className="h-4 w-4" /> HOÀN THÀNH MÓN
        </button>
      )}

      {order.status === 'READY' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'SERVED')}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-2 font-bold text-xs font-mono transition border border-slate-700"
        >
          <Flame className="h-4 w-4 text-amber-400" /> XÁC NHẬN ĐÃ PHỤ VỤ
        </button>
      )}
    </div>
  );
});


export default function KdsBoard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const { socket } = useSocket() || {};
  const { addToast } = useToast();

  useEffect(() => {
    fetchPendingOrders();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('KITCHEN_NEW_ORDER', (newOrder) => {
      setOrders(prev => {
        if (prev.some(o => o.id === newOrder.order_id)) return prev;
        return [...prev, {
          id: newOrder.order_id,
          table_number: newOrder.table_number,
          total_amount: newOrder.total_amount,
          created_at: newOrder.created_at,
          status: 'PENDING',
          items: newOrder.items
        }];
      });
    });

    socket.on('KITCHEN_CANCEL_ORDER', (data) => {
      setOrders(prev => prev.filter(o => o.id !== data.order_id));
    });

    socket.on('ORDER_STATUS_CHANGED', (data) => {
      setOrders(prev => prev.map(o => o.id === data.order_id ? { ...o, status: data.status } : o));
    });

    socket.on('PRODUCT_TRADING_TOGGLED', (updatedProd) => {
      setProducts(prev => prev.map(p => p.id === updatedProd.id ? { ...p, is_trading: updatedProd.is_trading } : p));
    });

    return () => {
      socket.off('KITCHEN_NEW_ORDER');
      socket.off('KITCHEN_CANCEL_ORDER');
      socket.off('ORDER_STATUS_CHANGED');
      socket.off('PRODUCT_TRADING_TOGGLED');
    };
  }, [socket]);

  const fetchPendingOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/orders/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/products'); // Có thể public hoặc cần token tùy backend
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const handleToggleProductTrading = async (prodId, currentName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.patch(`http://localhost:5000/api/products/${prodId}/toggle-trading`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      addToast(res.data.message, 'success');
      fetchProducts();
    } catch (err) {
      addToast('Lỗi khi thay đổi trạng thái bán món.', 'error');
    }
  };

  const handleUpdateStatus = useCallback(async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast('Cập nhật trạng thái đơn thành công!', 'success');
      fetchPendingOrders();
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Không thể cập nhật trạng thái đơn.';
      addToast(errMsg, 'error');
    }
  }, [addToast]);

  const pendingList = orders.filter(o => o.status === 'PENDING');
  const preparingList = orders.filter(o => o.status === 'PREPARING');
  const readyList = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-darkBg pb-16 font-sans">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <ChefHat className="h-6 w-6 text-amber-400" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wider font-share-mono">MÀN HÌNH BẾP (KITCHEN DISPLAY SYSTEM)</h1>
            <p className="text-xs text-slate-400 font-mono">Bảng điều phối order real-time & quản lý trạng thái kho nguyên liệu thô (BOM)</p>
          </div>
        </div>
      </header>

      {/* Raw Material BOM Out of Stock Control Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" /> ĐIỀU TIẾT TRẠNG THÁI MÓN BẾP (BÁO HẾT NGUYÊN LIỆU PHỤC VỤ)
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {products.map(p => (
              <div key={p.id} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl shrink-0 flex items-center gap-3">
                <div>
                  <div className="text-xs font-bold text-white max-w-[140px] truncate">{p.name}</div>
                  <div className="text-[9px] font-mono text-slate-400">{p.is_trading ? '🟢 ĐANG MỞ BÁN' : '🔴 TẠM DỪNG (HẾT)'}</div>
                </div>
                <button
                  onClick={() => handleToggleProductTrading(p.id, p.name)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                    p.is_trading 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/35' 
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/35'
                  }`}
                >
                  {p.is_trading ? 'BÁO HẾT' : 'MỞ BÁN'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        
        {/* Column 1: PENDING */}
        <div className="border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>CHỜ CHẾ BIẾN (PENDING)</span>
            <span className="bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-lg text-xs font-share-mono">{pendingList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {pendingList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">Chưa có order chờ.</div>
            ) : (
              pendingList.map(order => (
                <KdsCard 
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: PREPARING */}
        <div className="border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>ĐANG CHẾ BIẾN (PREPARING)</span>
            <span className="bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 rounded-lg text-xs font-share-mono">{preparingList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {preparingList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">Không có món đang nấu.</div>
            ) : (
              preparingList.map(order => (
                <KdsCard 
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="border border-slate-800 bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl space-y-4">
          <h2 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider border-b border-slate-800 pb-2 flex justify-between items-center">
            <span>CHỜ RA BÀN (READY)</span>
            <span className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-xs font-share-mono">{readyList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            {readyList.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">Chưa có món sẵn sàng.</div>
            ) : (
              readyList.map(order => (
                <KdsCard 
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

