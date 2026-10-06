import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Wallet, Clock, History, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function UserProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'transactions'
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchTransactions();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/orders/my-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const statusColors = {
    'PENDING': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'PREPARING': 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    'READY': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'SERVED': 'text-slate-400 bg-slate-800/40 border-slate-700/50',
    'CANCELLED': 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 font-sans text-slate-100">
      
      {/* Profile Overview */}
      <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl flex flex-col md:flex-row items-center gap-8 mb-8 shadow-2xl">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-sky-500/30 to-emerald-500/30 flex items-center justify-center border-4 border-slate-800 shadow-xl shrink-0">
          <User className="h-10 w-10 text-sky-400" />
        </div>
        
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-white font-share-mono tracking-wider">{user?.full_name || user?.username}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-400 font-mono">
            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {user?.email || 'N/A'}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {user?.phone || 'N/A'}</span>
            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded uppercase font-bold">{user?.role}</span>
          </div>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8 text-center md:text-right w-full md:w-auto">
          <div className="text-xs text-slate-400 font-mono mb-1 uppercase tracking-wider flex items-center justify-center md:justify-end gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" /> Tổng Số Dư
          </div>
          <div className="font-share-mono text-4xl font-bold text-emerald-400">
            {Math.round(user?.wallet_balance || 0).toLocaleString()} <span className="text-xl">đ</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 mb-6">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-2 text-sm font-bold font-mono transition flex items-center gap-2 ${
            activeTab === 'orders' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <History className="h-4 w-4" /> LỊCH SỬ ĐẶT MÓN
        </button>
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-2 text-sm font-bold font-mono transition flex items-center gap-2 ${
            activeTab === 'transactions' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" /> BIẾN ĐỘNG SỐ DƯ
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'orders' && (
          orders.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-mono">Bạn chưa có đơn hàng nào.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => (
                <div key={order.id} className="border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm p-5 rounded-2xl space-y-4 hover:border-slate-600 transition shadow-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">MÃ ĐƠN HÀNG</div>
                      <div className="font-share-mono font-bold text-white tracking-wider">#{order.id.slice(0,8)}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold font-mono ${statusColors[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 py-3 border-y border-slate-800/60">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-300">{item.name} <span className="text-slate-500">x{item.qty}</span></span>
                        <span className="font-share-mono text-slate-400">{Math.round(item.price).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-slate-400 font-mono">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(order.created_at).toLocaleString()}
                    </span>
                    <span className="font-share-mono font-bold text-sky-400 text-lg">{Math.round(order.total_amount).toLocaleString()}đ</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'transactions' && (
          transactions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 font-mono">Chưa có giao dịch ví nào.</div>
          ) : (
            <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-slate-400 text-xs">
                    <th className="p-4 font-bold">Thời gian</th>
                    <th className="p-4 font-bold">Loại giao dịch</th>
                    <th className="p-4 font-bold text-right">Số tiền</th>
                    <th className="p-4 font-bold text-center">TxHash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                  {transactions.map(tx => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 text-xs font-mono text-slate-400">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="p-4 font-bold text-xs uppercase tracking-wider">{tx.type.replace('_', ' ')}</td>
                        <td className={`p-4 text-right font-share-mono font-bold text-base flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {Math.abs(tx.amount).toLocaleString()}đ
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-500 cursor-help" title={tx.tx_hash}>
                            {tx.tx_hash ? tx.tx_hash.slice(0, 8) + '...' : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
