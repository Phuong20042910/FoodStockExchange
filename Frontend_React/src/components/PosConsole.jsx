import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, Search, UserPlus, CreditCard } from 'lucide-react';
import { parseApiError } from '../utils/apiErrorHandler';
import { useToast } from '../context/ToastContext';

export default function PosConsole() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [topupAmount, setTopupAmount] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users');
      // Filter out non-customers if needed, or list all
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!topupAmount || parseFloat(topupAmount) <= 0) {
      addToast('Vui lòng nhập số tiền nạp hợp lệ.', 'error');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/wallet/topup', {
        user_id: selectedUser.id,
        amount: parseFloat(topupAmount)
      });
      addToast(`Nạp tiền thành công! Số dư mới: ${res.data.new_balance.toLocaleString()} VND`, 'success');
      setTopupAmount('');
      fetchUsers();
      // Update selected user info in modal
      setSelectedUser(prev => ({ ...prev, wallet_balance: res.data.new_balance }));
    } catch (err) {
      addToast(parseApiError(err), 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-darkBg pb-12">
      <header className="border-b border-gray-800 bg-darkCard/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-neonGreen" />
          <div>
            <h1 className="text-xl font-bold text-whiteShare">POS Cashier Console</h1>
            <p className="text-xs text-gray-500 font-mono">Bàn nạp tiền ví điện tử & đối soát thu ngân</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        
        {/* Left Column: Users Search and Select */}
        <div className="md:col-span-2 border border-gray-850 bg-darkCard/40 p-6 rounded-xl space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4.5 w-4.5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm Trader (Tên người dùng, vai trò)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-gray-850 pl-10 pr-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:border-neonGreen"
            />
          </div>

          <div className="overflow-x-auto border border-gray-850 rounded-lg">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-850 bg-black/40 text-gray-400 font-mono text-xs uppercase">
                  <th className="p-3">Tên Trader</th>
                  <th className="p-3">Vai Trò</th>
                  <th className="p-3 text-right">Số Dư Ví</th>
                  <th className="p-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-850 hover:bg-white/5 transition">
                    <td className="p-3 font-semibold text-white">{u.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        u.role === 'ADMIN' ? 'text-neonRed bg-neonRed/10 border-neonRed/20' : 
                        u.role === 'CASHIER' ? 'text-neonGreen bg-neonGreen/10 border-neonGreen/20' : 'text-neonCyan bg-neonCyan/10 border-neonCyan/20'
                      }`}>{u.role}</span>
                    </td>
                    <td className="p-3 font-share-mono text-right font-bold text-neonCyan">{Math.round(u.wallet_balance).toLocaleString()}đ</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="text-xs bg-neonGreen/20 hover:bg-neonGreen/35 text-neonGreen border border-neonGreen/30 px-3 py-1.5 rounded-lg font-bold"
                      >
                        NẠP TIỀN VÍ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Topup Processing Modal View */}
        <div className="border border-gray-850 bg-darkCard/40 p-6 rounded-xl">
          <h2 className="text-md font-bold text-gray-300 font-mono uppercase tracking-wider mb-6 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-neonGreen" /> Giao Dịch Nạp Tiền
          </h2>

          {selectedUser ? (
            <form onSubmit={handleTopup} className="space-y-6">
              <div className="bg-black/35 p-4 border border-gray-850 rounded-lg">
                <div className="text-xs text-gray-500 font-mono uppercase">Trader Đang Chọn</div>
                <div className="text-lg font-bold text-white mt-1">{selectedUser.username}</div>
                <div className="text-xs text-gray-400 mt-0.5">ID: {selectedUser.id}</div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-850">
                  <span className="text-xs text-gray-500 font-mono uppercase">Số Dư Hiện Tại</span>
                  <span className="font-share-mono text-lg font-bold text-neonCyan">{Math.round(selectedUser.wallet_balance).toLocaleString()} VND</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-mono uppercase mb-2 block">Số Tiền Nạp (VND)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 font-share-mono text-neonGreen">đ</span>
                  <input 
                    type="number" 
                    min="1000"
                    required
                    placeholder="Nhập số tiền nạp..."
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full bg-black border border-gray-850 pl-8 pr-4 py-3 rounded-lg text-lg text-white font-share-mono focus:outline-none focus:border-neonGreen"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setTopupAmount('100000')} className="flex-1 py-1 text-xs border border-gray-800 rounded bg-gray-900 text-gray-400 hover:text-white font-mono">+100k</button>
                  <button type="button" onClick={() => setTopupAmount('200000')} className="flex-1 py-1 text-xs border border-gray-800 rounded bg-gray-900 text-gray-400 hover:text-white font-mono">+200k</button>
                  <button type="button" onClick={() => setTopupAmount('500000')} className="flex-1 py-1 text-xs border border-gray-800 rounded bg-gray-900 text-gray-400 hover:text-white font-mono">+500k</button>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setSelectedUser(null)} 
                  className="flex-1 py-3 border border-gray-800 rounded-lg text-xs hover:bg-gray-800/50"
                >
                  HỦY BỎ
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-neonGreen/20 text-neonGreen border border-neonGreen/30 font-bold rounded-lg text-xs hover:bg-neonGreen/35"
                >
                  XÁC NHẬN NẠP
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500 text-center py-12">Chọn một tài khoản Trader bên trái để thực hiện giao dịch nạp tiền.</p>
          )}
        </div>

      </div>
    </div>
  );
}
