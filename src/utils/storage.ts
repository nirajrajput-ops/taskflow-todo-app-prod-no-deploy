import { Task, Category, Notification, TaskTemplate, UserMeta } from '../types';

const TASKS_KEY = 'todo_app_tasks';
const CATEGORIES_KEY = 'todo_app_categories';
const NOTIFICATIONS_KEY = 'todo_app_notifications';
const TEMPLATES_KEY = 'todo_app_templates';
const USER_META_KEY = 'todo_app_user_meta';

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

  getTemplates: (): TaskTemplate[] => {
    const data = localStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  },

  setTemplates: (templates: TaskTemplate[]): void => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  },

  getUserMeta: (): UserMeta => {
    const data = localStorage.getItem(USER_META_KEY);
    return data ? JSON.parse(data) : {
      totalTemplatesCreated: 0,
      hasUsedTemplates: false,
      lastTemplateUsedAt: null,
    };
  },

  setUserMeta: (meta: UserMeta): void => {
    localStorage.setItem(USER_META_KEY, JSON.stringify(meta));
  },
};
