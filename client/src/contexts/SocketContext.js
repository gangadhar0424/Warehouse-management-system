import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket connection
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          userId: user.id,
          role: user.role
        }
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected');
        
        // Join role-specific room
        newSocket.emit('join_room', user.role);
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Socket disconnected');
      });

      // Listen for various events
      newSocket.on('vehicle_entry', (data) => {
        addNotification({
          type: 'info',
          title: 'Vehicle Entry',
          message: data.message,
          timestamp: new Date()
        });
      });

      newSocket.on('vehicle_weighed', (data) => {
        addNotification({
          type: 'success',
          title: 'Vehicle Weighed',
          message: data.message,
          timestamp: new Date()
        });
      });

      newSocket.on('vehicle_exit', (data) => {
        addNotification({
          type: 'info',
          title: 'Vehicle Exit',
          message: data.message,
          timestamp: new Date()
        });
      });

      newSocket.on('payment_received', (data) => {
        addNotification({
          type: 'success',
          title: 'Payment Received',
          message: data.message,
          timestamp: new Date()
        });
      });

      newSocket.on('storage_allocated', (data) => {
        addNotification({
          type: 'success',
          title: 'Storage Allocated',
          message: data.message,
          timestamp: new Date()
        });
      });

      newSocket.on('storage_expired', (data) => {
        addNotification({
          type: 'warning',
          title: 'Storage Expired',
          message: data.message,
          timestamp: new Date()
        });
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const addNotification = (notification) => {
    const id = Date.now();
    setNotifications(prev => [
      { ...notification, id },
      ...prev.slice(0, 9) // Keep only last 10 notifications
    ]);

    // Auto remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Emit events
  const emitEvent = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const value = {
    socket,
    connected,
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    emitEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};