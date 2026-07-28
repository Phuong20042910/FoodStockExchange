import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [priceUpdates, setPriceUpdates] = useState({});
  const [crashData, setCrashData] = useState({ isCrash: false, remaining: 0 });
  const [haltedProducts, setHaltedProducts] = useState({});
  const [p2pUpdates, setP2pUpdates] = useState(null);

  useEffect(() => {
    const socketUrl = 'http://localhost:5000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('PRICE_UPDATE', (updates) => {
      setPriceUpdates(prev => {
        const next = { ...prev };
        updates.forEach(u => {
          next[u.product_id] = {
            price: u.new_price,
            trend: u.trend,
            timestamp: Date.now()
          };
        });
        return next;
      });
    });

    newSocket.on('market_crash_start', (data) => {
      setCrashData({ isCrash: true, remaining: data.duration_seconds });
    });

    newSocket.on('market_crash_end', () => {
      setCrashData({ isCrash: false, remaining: 0 });
    });

    newSocket.on('trading_halt', (data) => {
      setHaltedProducts(prev => ({
        ...prev,
        [data.product_id]: { halted: true, reason: data.reason, resume_at: data.resume_at }
      }));
    });

    newSocket.on('trading_resume', (data) => {
      setHaltedProducts(prev => {
        const next = { ...prev };
        delete next[data.product_id];
        return next;
      });
    });

    // Listen for P2P Marketplace shifts
    newSocket.on('P2P_MARKET_UPDATE', (data) => {
      setP2pUpdates(data);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!crashData.isCrash || crashData.remaining <= 0) return;

    const timer = setInterval(() => {
      setCrashData(prev => {
        if (prev.remaining <= 1) {
          clearInterval(timer);
          return { isCrash: false, remaining: 0 };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [crashData.isCrash, crashData.remaining]);

  return (
    <SocketContext.Provider value={{ socket, priceUpdates, crashData, haltedProducts, p2pUpdates }}>
      {children}
    </SocketContext.Provider>
  );
};
