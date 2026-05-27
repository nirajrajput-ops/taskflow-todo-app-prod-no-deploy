import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { StatCard } from '../components/common/Card';
import { TaskList } from '../components/tasks/TaskList';
import { ConfirmModal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { isOverdue } from '../utils/dateUtils';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, categories, toggleTaskStatus, deleteTask, addTask } = useTasks();
  const { showToast } = useToast();
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const overdueTasks = tasks.filter(
    t => t.status === 'pending' && isOverdue(t.dueDate, t.dueTime, t.status)
  ).length;

  // Get recent tasks (last 5 pending tasks)
  const recentTasks = tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    addTask({
      title: quickTaskTitle.trim(),
      description: '',
      status: 'pending',
      priority: 'medium',
      categoryId: categories[0]?.id || 'other',
      dueDate: null,
      dueTime: null,
      reminder: 'none',
      subtasks: [],
    });

    if (typeof pendo !== 'undefined') {
      pendo.track('quick_task_created', {
        title: quickTaskTitle.trim(),
        defaultCategoryId: categories[0]?.id || 'other',
      });
    }
    setQuickTaskTitle('');
    showToast('Task created successfully!', 'success');
  };

  const handleToggleStatus = (taskId: string) => {
    toggleTaskStatus(taskId);
    const task = tasks.find(t => t.id === taskId);
    if (task?.status === 'pending') {
      showToast('Task completed!', 'success');
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteTaskId) {
      deleteTask(deleteTaskId);
      showToast('Task deleted', 'success');
      setDeleteTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's your task overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          icon={<ListTodo className="h-6 w-6" />}
          color="blue"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          title="Completed"
          value={completedTasks}
          icon={<CheckCircle className="h-6 w-6" />}
          color="green"
          onClick={() => navigate('/tasks?status=completed')}
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={<Clock className="h-6 w-6" />}
          color="yellow"
          onClick={() => navigate('/tasks?status=pending')}
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="red"
          onClick={() => navigate('/tasks?status=overdue')}
        />
      </div>

      {/* Quick Add Task */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Add Task</h2>
        <form onSubmit={handleQuickAdd} className="flex gap-3">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={e => setQuickTaskTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!quickTaskTitle.trim()}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-5 w-5 mr-1" />
            Add
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Press Enter to add a task quickly. Use the full form for more options.
        </p>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Tasks</h2>
          <button
            onClick={() => navigate('/tasks')}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            View all
          </button>
        </div>
        <TaskList
          tasks={recentTasks}
          onToggleStatus={handleToggleStatus}
          onDelete={setDeleteTaskId}
          emptyMessage="No pending tasks. Add your first task above!"
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTaskId}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
