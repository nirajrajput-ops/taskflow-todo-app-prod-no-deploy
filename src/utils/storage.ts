import { Task, Category, Notification } from '../types';

const TASKS_KEY = 'todo_app_tasks';
const CATEGORIES_KEY = 'todo_app_categories';
const NOTIFICATIONS_KEY = 'todo_app_notifications';
const USER_META_KEY = 'todo_app_user_meta';

export interface UserMeta {
  totalTemplatesCreated: number;
  hasUsedTemplates: boolean;
  lastTemplateUsedAt: string | null;
}

export const storage = {
  getTasks: (): Task[] => {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setTasks: (tasks: Task[]): void => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  getCategories: (): Category[] => {
    const data = localStorage.getItem(CATEGORIES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // Return default categories
    const defaultCategories: Category[] = [
      { id: 'work', name: 'Work', color: '#3B82F6', isDefault: true },
      { id: 'personal', name: 'Personal', color: '#10B981', isDefault: true },
      { id: 'shopping', name: 'Shopping', color: '#F59E0B', isDefault: true },
      { id: 'health', name: 'Health', color: '#EF4444', isDefault: true },
      { id: 'other', name: 'Other', color: '#6B7280', isDefault: true },
    ];
    storage.setCategories(defaultCategories);
    return defaultCategories;
  },

  setCategories: (categories: Category[]): void => {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  },

  getNotifications: (): Notification[] => {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setNotifications: (notifications: Notification[]): void => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  },

  getUserMeta: (): UserMeta | null => {
    const data = localStorage.getItem(USER_META_KEY);
    return data ? JSON.parse(data) : null;
  },
};
