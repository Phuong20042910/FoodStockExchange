import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useSocket } from './SocketContext';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket() || {};

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  // Listen to realtime wallet updates for the logged in user
  useEffect(() => {
    if (!socket || !user) return;

    const eventName = `WALLET_UPDATE_${user.id}`;
    socket.on(eventName, (data) => {
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          wallet_balance: data.balance
        };
      });
      // Optional: alert topup
      alert(`Đã nhận ${data.amount.toLocaleString()} VND vào ví! Số dư mới: ${data.balance.toLocaleString()} VND`);
    });

    return () => {
      socket.off(eventName);
    };
  }, [socket, user]);

  const fetchUserProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Fetch profile failed:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (username, password, fullName, phone, email, role) => {
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { 
        username, 
        password, 
        full_name: fullName, 
        phone, 
        email,
        role
      });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
