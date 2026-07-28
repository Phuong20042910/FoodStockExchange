import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { ChefHat, Play, Check, Flame } from 'lucide-react';

// Sub-component riêng cho thẻ đơn hàng tại bếp
// Quản lý riêng bộ đếm SLA 5s, không render lại toàn bộ KdsBoard
const KdsCard = React.memo(({ order, onUpdateStatus }) => {
  const [slaInfo, setSlaInfo] = useState({ colorClass: 'text-gray-400 bg-gray-900 border-gray-800', label: '0 phút', isAlert: false });

  useEffect(() => {
    const calculateSLA = () => {
      const elapsedMinutes = (Date.now() - new Date(order.created_at).getTime()) / 60000;
      
      let colorClass = 'text-gray-400 bg-gray-900 border-gray-800';
      let label = `${Math.round(elapsedMinutes)} phút`;
      let isAlert = false;

      if (elapsedMinutes >= 15) {
        colorClass = 'text-neonRed bg-red-950/40 border-neonRed animate-pulse';
        label = `CẢNH BÁO TRỄ: ${Math.round(elapsedMinutes)} phút`;
        isAlert = true;
      } else if (elapsedMinutes >= 10) {
        colorClass = 'text-neonYellow bg-yellow-950/20 border-neonYellow';
        label = `CẦN CHUẨN BỊ GẤP: ${Math.round(elapsedMinutes)} phút`;
      }

      setSlaInfo({ colorClass, label, isAlert });
    };

    calculateSLA();
    const interval = setInterval(calculateSLA, 5000); // Cập nhật SLA mỗi 5 giây

    return () => clearInterval(interval);
  }, [order.created_at]);

  return (
    <div className={`border p-4 rounded-xl bg-darkCard/50 relative space-y-3 transition-all duration-300 ${slaInfo.isAlert ? 'border-neonRed' : 'border-gray-850'}`}>
      <div className="flex justify-between items-start">
        <div>
          <span className="text-lg font-bold text-white font-share-mono">BÀN {order.table_number}</span>
          <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {order.id.slice(0, 8)}</div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors duration-500 ${slaInfo.colorClass}`}>{slaInfo.label}</span>
      </div>

      <div className="space-y-2 border-t border-b border-gray-850 py-3">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm text-gray-300 font-semibold">
            <span>{item.name}</span>
            <span className="text-neonCyan font-share-mono">x{item.qty}</span>
          </div>
        ))}
      </div>

      {order.status === 'PENDING' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'PREPARING')}
          className="w-full py-2 bg-neonCyan/20 hover:bg-neonCyan/35 text-neonCyan border border-neonCyan/30 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition"
        >
          <Play className="h-3.5 w-3.5" /> BẮT ĐẦU NẤU
        </button>
      )}

      {order.status === 'PREPARING' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'READY')}
          className="w-full py-2 bg-neonGreen/20 hover:bg-neonGreen/35 text-neonGreen border border-neonGreen/30 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition"
        >
          <Check className="h-3.5 w-3.5" /> HOÀN THÀNH MÓN
        </button>
      )}

      {order.status === 'READY' && (
        <button 
          onClick={() => onUpdateStatus(order.id, 'SERVED')}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition"
        >
          <Flame className="h-3.5 w-3.5 text-neonYellow" /> XÁC NHẬN ĐÃ PHỤ VỤ
        </button>
      )}
    </div>
  );
});

export default function KdsBoard() {
  const [orders, setOrders] = useState([]);
  const { socket } = useSocket() || {};

  useEffect(() => {
    fetchPendingOrders();
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

    return () => {
      socket.off('KITCHEN_NEW_ORDER');
      socket.off('KITCHEN_CANCEL_ORDER');
      socket.off('ORDER_STATUS_CHANGED');
    };
  }, [socket]);

  const fetchPendingOrders = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/orders/pending');
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching pending orders:', err);
    }
  };

  const handleUpdateStatus = useCallback(async (orderId, newStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status: newStatus });
      fetchPendingOrders();
    } catch (err) {
      alert('Không thể cập nhật trạng thái đơn.');
    }
  }, []);

  const pendingList = orders.filter(o => o.status === 'PENDING');
  const preparingList = orders.filter(o => o.status === 'PREPARING');
  const readyList = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-darkBg pb-12">
      <header className="border-b border-gray-800 bg-darkCard/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-neonCyan" />
          <div>
            <h1 className="text-xl font-bold text-whiteShare">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-gray-500 font-mono">Bảng điều phối món bếp thời gian thực</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        
        {/* Column 1: PENDING */}
        <div className="border border-gray-850 bg-darkCard/20 p-4 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-neonYellow font-mono uppercase tracking-wider border-b border-gray-850 pb-2 flex justify-between items-center">
            <span>CHỜ CHẾ BIẾN (PENDING)</span>
            <span className="bg-neonYellow/10 px-2 py-0.5 rounded text-xs font-share-mono">{pendingList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {pendingList.map(order => (
              <KdsCard 
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        </div>

        {/* Column 2: PREPARING */}
        <div className="border border-gray-850 bg-darkCard/20 p-4 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-neonCyan font-mono uppercase tracking-wider border-b border-gray-850 pb-2 flex justify-between items-center">
            <span>ĐANG CHẾ BIẾN (PREPARING)</span>
            <span className="bg-neonCyan/10 px-2 py-0.5 rounded text-xs font-share-mono">{preparingList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {preparingList.map(order => (
              <KdsCard 
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="border border-gray-850 bg-darkCard/20 p-4 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-neonGreen font-mono uppercase tracking-wider border-b border-gray-850 pb-2 flex justify-between items-center">
            <span>CHỜ RA BÀN (READY)</span>
            <span className="bg-neonGreen/10 px-2 py-0.5 rounded text-xs font-share-mono">{readyList.length}</span>
          </h2>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {readyList.map(order => (
              <KdsCard 
                key={order.id}
                order={order}
                onUpdateStatus={handleUpdateStatus}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
