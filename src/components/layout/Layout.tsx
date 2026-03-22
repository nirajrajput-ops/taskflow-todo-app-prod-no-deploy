import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { AgentChat } from '../agent/AgentChat';
import { useNotifications } from '../../context/NotificationContext';

export const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { requestPermission, permissionStatus } = useNotifications();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Request notification permission on mount
  useEffect(() => {
    if (permissionStatus === 'default') {
      requestPermission();
    }
  }, [permissionStatus, requestPermission]);

  const handleMenuToggle = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} />

      <div className="flex">
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-4rem)]">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <AgentChat />
    </div>
  );
};
