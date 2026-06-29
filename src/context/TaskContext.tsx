import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Task, Category } from '../types';
import { storage } from '../utils/storage';
import { isOverdue } from '../utils/dateUtils';

interface TaskState {
  tasks: Task[];
  categories: Category[];
}

type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK_STATUS'; payload: string }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  | { type: 'MARK_REMINDER_TRIGGERED'; payload: string }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: { categoryId: string; reassignTo: string } };

const taskReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };

    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] };

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        ),
      };

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };

    case 'TOGGLE_TASK_STATUS': {
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id === action.payload) {
            const newStatus = task.status === 'pending' ? 'completed' : 'pending';
            return {
              ...task,
              status: newStatus,
              completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        }),
      };
    }

    case 'TOGGLE_SUBTASK': {
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id === action.payload.taskId) {
            return {
              ...task,
              subtasks: task.subtasks.map(subtask =>
                subtask.id === action.payload.subtaskId
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              ),
              updatedAt: new Date().toISOString(),
            };
          }
          return task;
        }),
      };
    }

    case 'MARK_REMINDER_TRIGGERED':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload
            ? { ...task, reminderTriggered: true, updatedAt: new Date().toISOString() }
            : task
        ),
      };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };

    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map(cat =>
          cat.id === action.payload.id ? action.payload : cat
        ),
      };

    case 'DELETE_CATEGORY': {
      const { categoryId, reassignTo } = action.payload;
      return {
        ...state,
        categories: state.categories.filter(cat => cat.id !== categoryId),
        tasks: state.tasks.map(task =>
          task.categoryId === categoryId ? { ...task, categoryId: reassignTo } : task
        ),
      };
    }

    default:
      return state;
  }
};

interface TaskContextValue {
  tasks: Task[];
  categories: Category[];
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'reminderTriggered'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  markReminderTriggered: (taskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  addCategory: (name: string, color: string) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string, reassignTo: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
}

const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Initialize state from localStorage
const getInitialState = (): TaskState => {
  return {
    tasks: storage.getTasks(),
    categories: storage.getCategories(),
  };
};

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(taskReducer, null, getInitialState);
  const isFirstRender = useRef(true);

  // Save tasks to localStorage whenever they change (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    storage.setTasks(state.tasks);
  }, [state.tasks]);

  // Save categories to localStorage whenever they change
  useEffect(() => {
    storage.setCategories(state.categories);
  }, [state.categories]);

  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'reminderTriggered'>) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      reminderTriggered: false,
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
  };

  const updateTask = (task: Task) => {
    const updatedTask = { ...task, updatedAt: new Date().toISOString() };
    dispatch({ type: 'UPDATE_TASK', payload: updatedTask });
  };

  const deleteTask = (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task && typeof pendo !== 'undefined') {
      pendo.track('task_deleted', {
        taskId: task.id,
        title: task.title,
        taskStatus: task.status,
        priority: task.priority,
        categoryId: task.categoryId,
        subtaskCount: task.subtasks.length,
        hadDueDate: !!task.dueDate,
        daysSinceCreation: Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000),
      });
    }
    dispatch({ type: 'DELETE_TASK', payload: taskId });
  };

  const toggleTaskStatus = (taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (task && typeof pendo !== 'undefined') {
      if (task.status === 'pending') {
        const completedSubs = task.subtasks.filter(s => s.completed).length;
        pendo.track('task_completed', {
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          categoryId: task.categoryId,
          hasDueDate: !!task.dueDate,
          wasOverdue: !!task.dueDate && isOverdue(task.dueDate, task.dueTime, task.status),
          subtaskCount: task.subtasks.length,
          completedSubtaskCount: completedSubs,
          daysSinceCreation: Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000),
        });
      } else {
        pendo.track('task_reopened', {
          taskId: task.id,
          title: task.title,
          priority: task.priority,
          categoryId: task.categoryId,
          daysSinceCompletion: task.completedAt
            ? Math.floor((Date.now() - new Date(task.completedAt).getTime()) / 86400000)
            : 0,
        });
      }
    }
    dispatch({ type: 'TOGGLE_TASK_STATUS', payload: taskId });
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId, subtaskId } });
  };

  const markReminderTriggered = (taskId: string) => {
    dispatch({ type: 'MARK_REMINDER_TRIGGERED', payload: taskId });
  };

  const getTaskById = (taskId: string) => {
    return state.tasks.find(task => task.id === taskId);
  };

  const addCategory = (name: string, color: string) => {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      color,
      isDefault: false,
    };
    dispatch({ type: 'ADD_CATEGORY', payload: newCategory });
  };

  const updateCategory = (category: Category) => {
    dispatch({ type: 'UPDATE_CATEGORY', payload: category });
  };

  const deleteCategory = (categoryId: string, reassignTo: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: { categoryId, reassignTo } });
  };

  const getCategoryById = (categoryId: string) => {
    return state.categories.find(cat => cat.id === categoryId);
  };

  return (
    <TaskContext.Provider
      value={{
        tasks: state.tasks,
        categories: state.categories,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        toggleSubtask,
        markReminderTriggered,
        getTaskById,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoryById,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextValue => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
