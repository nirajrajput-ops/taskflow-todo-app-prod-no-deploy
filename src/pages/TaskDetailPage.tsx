import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Flag,
  Bell,
  CheckCircle,
  Circle,
  Clock,
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/Modal';
import { SubtaskItem } from '../components/tasks/SubtaskItem';
import { useToast } from '../components/common/Toast';
import { formatDate, isOverdue, getRelativeDueDate } from '../utils/dateUtils';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTaskById, getCategoryById, toggleTaskStatus, toggleSubtask, deleteTask } = useTasks();
  const { showToast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const task = getTaskById(id!);
  const category = task ? getCategoryById(task.categoryId) : undefined;

  if (!task) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h1>
        <p className="text-gray-500 mb-4">
          The task you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => navigate('/tasks')}>Go to Tasks</Button>
      </div>
    );
  }

  const overdue = isOverdue(task.dueDate, task.dueTime, task.status);

  const priorityStyles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700',
  };

  const reminderLabels = {
    none: 'No reminder',
    '15min': '15 minutes before',
    '1hour': '1 hour before',
    '1day': '1 day before',
  };

  const handleToggleStatus = () => {
    if (typeof pendo !== 'undefined') {
      if (task.status === 'pending') {
        pendo.track('task_completed', {
          taskId: task.id,
          priority: task.priority,
          categoryId: task.categoryId,
          hadDueDate: !!task.dueDate,
          wasOverdue: overdue,
          subtaskCount: task.subtasks.length,
          completedSubtaskCount: completedSubtasks,
          source: 'detail_page',
        });
      } else {
        pendo.track('task_reopened', {
          taskId: task.id,
          priority: task.priority,
          categoryId: task.categoryId,
          source: 'detail_page',
        });
      }
    }
    toggleTaskStatus(task.id);
    showToast(
      task.status === 'pending' ? 'Task completed!' : 'Task marked as pending',
      'success'
    );
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const subtask = task.subtasks.find(s => s.id === subtaskId);
    const newCompleted = subtask && !subtask.completed;
    const currentCompleted = completedSubtasks + (newCompleted ? 1 : -1);
    if (typeof pendo !== 'undefined') {
      pendo.track('subtask_toggled', {
        taskId: task.id,
        subtaskId: subtaskId,
        newStatus: newCompleted ? 'completed' : 'pending',
        completedSubtaskCount: currentCompleted,
        totalSubtaskCount: task.subtasks.length,
        subtaskProgress: task.subtasks.length > 0 ? Math.round((currentCompleted / task.subtasks.length) * 100) : 0,
        source: 'detail_page',
      });
    }
    toggleSubtask(task.id, subtaskId);
  };

  const handleDelete = () => {
    deleteTask(task.id);
    showToast('Task deleted', 'success');
    navigate('/tasks');
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const subtaskProgress =
    task.subtasks.length > 0
      ? Math.round((completedSubtasks / task.subtasks.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate(`/tasks/${task.id}/edit`)}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="p-6">
        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleToggleStatus}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
              transition-colors cursor-pointer
              ${task.status === 'completed'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : overdue
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }
            `}
          >
            {task.status === 'completed' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            {task.status === 'completed' ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
          </button>

          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${priorityStyles[task.priority]}`}>
            <Flag className="h-3 w-3 inline mr-1" />
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
          </span>

          {category && (
            <span
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${category.color}20`,
                color: category.color,
              }}
            >
              {category.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-xl font-semibold ${
            task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {task.title}
        </h2>

        {/* Description */}
        {task.description && (
          <p className="mt-3 text-gray-600 whitespace-pre-wrap">{task.description}</p>
        )}

        {/* Meta Info Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Due Date */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className={`h-5 w-5 ${overdue ? 'text-red-500' : 'text-gray-400'}`} />
            <div>
              <p className="text-xs text-gray-500">Due Date</p>
              <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                {task.dueDate
                  ? getRelativeDueDate(task.dueDate, task.dueTime, task.status)
                  : 'No due date'}
              </p>
            </div>
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Bell className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Reminder</p>
              <p className="text-sm font-medium text-gray-900">
                {reminderLabels[task.reminder]}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(task.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {task.subtasks.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Subtasks</h3>
              <span className="text-sm text-gray-500">
                {completedSubtasks}/{task.subtasks.length} completed
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div
                className="h-2 bg-green-500 rounded-full transition-all"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>

            <div className="space-y-2">
              {task.subtasks.map(subtask => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onToggle={() => handleToggleSubtask(subtask.id)}
                  onRemove={() => {}}
                  disabled={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completion Info */}
        {task.status === 'completed' && task.completedAt && (
          <div className="mt-6 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <CheckCircle className="h-4 w-4 inline mr-2" />
              Completed on {formatDate(task.completedAt)}
            </p>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone and all subtasks will also be deleted."
        confirmText="Delete Task"
        variant="danger"
      />
    </div>
  );
};
