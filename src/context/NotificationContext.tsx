import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Notification as AppNotification } from '../types';
import { storage } from '../utils/storage';
import { shouldTriggerReminder, isOverdue } from '../utils/dateUtils';
import { useTasks } from './TaskContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (taskId: string, taskTitle: string, message: string, type: 'reminder' | 'overdue') => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  requestPermission: () => Promise<boolean>;
  permissionStatus: NotificationPermission | 'default';
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');
  const { tasks, markReminderTriggered } = useTasks();

  // Load notifications from localStorage
  useEffect(() => {
    const stored = storage.getNotifications();
    setNotifications(stored);

    // Check notification permission
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    storage.setNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((
    taskId: string,
    taskTitle: string,
    message: string,
    type: 'reminder' | 'overdue'
  ) => {
    const newNotification: AppNotification = {
      id: uuidv4(),
      taskId,
      taskTitle,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(taskTitle, {
        body: message,
        icon: '/vite.svg',
        tag: taskId,
      });
    }
  }, []);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    const previousPermission = Notification.permission;
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (typeof pendo !== 'undefined') {
      pendo.track('browser_notification_permission_requested', {
        permissionResult: permission,
        previousPermission: previousPermission,
      });
    }

    return permission === 'granted';
  };

  // Check for reminders every minute
  useEffect(() => {
    const checkReminders = () => {
      tasks.forEach(task => {
        if (task.status === 'pending') {
          // Check for reminder
          if (shouldTriggerReminder(task.dueDate, task.dueTime, task.reminder, task.reminderTriggered)) {
            addNotification(
              task.id,
              task.title,
              `Reminder: Task "${task.title}" is due soon!`,
              'reminder'
            );
            if (typeof pendo !== 'undefined') {
              pendo.track('reminder_triggered', {
                taskId: task.id,
                taskTitle: task.title,
                reminderType: task.reminder,
                taskPriority: task.priority,
                taskCategoryId: task.categoryId,
                notificationType: 'reminder',
              });
            }
            markReminderTriggered(task.id);
          }

          // Check for overdue (only notify once per task per session)
          if (isOverdue(task.dueDate, task.dueTime, task.status) && !task.reminderTriggered) {
            const existingOverdueNotification = notifications.find(
              n => n.taskId === task.id && n.type === 'overdue'
            );
            if (!existingOverdueNotification) {
              addNotification(
                task.id,
                task.title,
                `Task "${task.title}" is overdue!`,
                'overdue'
              );
              if (typeof pendo !== 'undefined') {
                pendo.track('overdue_notification_generated', {
                  taskId: task.id,
                  taskTitle: task.title,
                  taskPriority: task.priority,
                  taskCategoryId: task.categoryId,
                  dueDate: task.dueDate,
                });
              }
            }
          }
        }
      });
    };

    // Check immediately
    checkReminders();

    // Check every minute
    const interval = setInterval(checkReminders, 60000);

    return () => clearInterval(interval);
  }, [tasks, addNotification, markReminderTriggered, notifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        requestPermission,
        permissionStatus,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
