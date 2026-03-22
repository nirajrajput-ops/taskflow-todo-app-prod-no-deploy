import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Task } from '../types';
import { TaskForm } from '../components/tasks/TaskForm';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';

export const TaskFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTaskById, categories, addTask, updateTask } = useTasks();
  const { showToast } = useToast();

  const isEdit = !!id;
  const existingTask = id ? getTaskById(id) : undefined;

  // If editing but task not found
  if (isEdit && !existingTask) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h1>
        <p className="text-gray-500 mb-4">
          The task you're trying to edit doesn't exist or has been deleted.
        </p>
        <button
          onClick={() => navigate('/tasks')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Go to Tasks
        </button>
      </div>
    );
  }

  const handleSubmit = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'reminderTriggered'>
  ) => {
    if (isEdit && existingTask) {
      updateTask({
        ...existingTask,
        ...taskData,
        updatedAt: new Date().toISOString(),
      });
      if (typeof pendo !== 'undefined') {
        pendo.track('task_updated', {
          taskId: existingTask.id,
          priority: taskData.priority,
          categoryId: taskData.categoryId,
          hasDueDate: !!taskData.dueDate,
          hasDueTime: !!taskData.dueTime,
          reminderType: taskData.reminder,
          subtaskCount: taskData.subtasks?.length || 0,
          hasDescription: !!taskData.description,
        });
      }
      showToast('Task updated successfully!', 'success');
      navigate(`/tasks/${existingTask.id}`);
    } else {
      addTask(taskData);
      if (typeof pendo !== 'undefined') {
        pendo.track('task_created', {
          priority: taskData.priority,
          categoryId: taskData.categoryId,
          hasDueDate: !!taskData.dueDate,
          hasDueTime: !!taskData.dueTime,
          reminderType: taskData.reminder,
          subtaskCount: taskData.subtasks?.length || 0,
          hasDescription: !!taskData.description,
          source: 'full_form',
        });
      }
      showToast('Task created successfully!', 'success');
      navigate('/tasks');
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Task' : 'Create New Task'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEdit
              ? 'Update the task details below'
              : 'Fill in the details to create a new task'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <TaskForm
          initialData={existingTask}
          categories={categories}
          onSubmit={handleSubmit}
          isEdit={isEdit}
        />
      </Card>
    </div>
  );
};
