import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';
import { Sparkles, X, Target } from 'lucide-react';

export default function CopyTradeAlert() {
  const { socket } = useSocket() || {};
  const { user } = useAuth();
  const { addToast } = useToast();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!socket || !user) return;

    const eventName = `COPY_TRADE_ALERT_${user.id}`;
    const handleAlert = (data) => {
      // Add the alert with a unique ID for rendering
      const newAlert = { ...data, alertId: Date.now().toString() };
      setAlerts(prev => [...prev, newAlert]);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        removeAlert(newAlert.alertId);
      }, 10000);
    };

    socket.on(eventName, handleAlert);
    return () => socket.off(eventName, handleAlert);
  }, [socket, user]);

  const removeAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  };

  const handleCopyTrade = async (alertInfo) => {
    try {
      await axios.post('http://localhost:5000/api/orders/place', {
        table_number: 'COPY_TRADE',
        items: [{
          product_id: alertInfo.product_id,
          quantity: alertInfo.quantity,
          expected_price: alertInfo.price
        }]
      });
      addToast(`Đã sao chép giao dịch! Mua thành công ${alertInfo.quantity} ${alertInfo.product_name}.`, 'success');
      removeAlert(alertInfo.alertId);
    } catch (err) {
      addToast(err.response?.data?.message || 'Không thể sao chép giao dịch này. Giá có thể đã thay đổi.', 'error');
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
      {alerts.map(alertItem => (
        <div key={alertItem.alertId} className="w-[320px] bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl p-4 animate-in slide-in-from-right fade-in duration-300 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 right-0 p-2">
            <button onClick={() => removeAlert(alertItem.alertId)} className="text-slate-500 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Tín Hiệu Copy-Trade</h4>
          </div>

          <p className="text-sm text-slate-300 font-medium mb-3 leading-snug">
            {alertItem.message}
          </p>

          <button 
            onClick={() => handleCopyTrade(alertItem)}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" /> MUA THEO {alertItem.master_name.toUpperCase()} (1-TAP)
          </button>
        </div>
      ))}
    </div>
  );
}
