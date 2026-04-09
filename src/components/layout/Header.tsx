import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Menu, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Button } from '../common/Button';
import { formatDate } from '../../utils/dateUtils';

interface HeaderProps {
  onMenuToggle: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 h-16">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-500 hover:text-gray-700 lg:hidden"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="text-xl font-bold text-blue-500">
            TaskFlow
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => {
                          if (typeof pendo !== 'undefined') {
                            pendo.track('notifications_mark_all_read', {
                              clearedCount: notifications.length,
                              unreadCount: unreadCount,
                            });
                          }
                          markAllAsRead();
                        }}
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {recentNotifications.length === 0 ? (
                      <p className="p-4 text-center text-gray-500 text-sm">
                        No notifications
                      </p>
                    ) : (
                      recentNotifications.map(notification => (
                        <div
                          key={notification.id}
                          onClick={() => {
                            markAsRead(notification.id);
                            navigate(`/tasks/${notification.taskId}`);
                            setShowNotifications(false);
                          }}
                          className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-900">
                            {notification.taskTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Add Task button */}
          <Button size="sm" onClick={() => navigate('/tasks/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>
    </header>
  );
};
