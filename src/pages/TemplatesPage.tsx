import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Copy, X } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskTemplate, Subtask } from '../types';
import { Button } from '../components/common/Button';
import { Input, Textarea, Select } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { Modal, ConfirmModal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

// Template Form Modal
const TemplateFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: TaskTemplate;
  categories: { id: string; name: string; color: string }[];
}> = ({ isOpen, onClose, onSubmit, initialData, categories }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || 'other');
  const [reminder, setReminder] = useState(initialData?.reminder || 'none');
  const [subtasks, setSubtasks] = useState<Omit<Subtask, 'id'>[]>(initialData?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      priority: priority as 'high' | 'medium' | 'low',
      categoryId,
      reminder: reminder as 'none' | '15min' | '1hour' | '1day',
      subtasks,
    });
    onClose();
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks(prev => [...prev, { title: newSubtask.trim(), completed: false }]);
      setNewSubtask('');
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const priorityOptions = [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' },
  ];

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name,
  }));

  const reminderOptions = [
    { value: 'none', label: 'No Reminder' },
    { value: '15min', label: '15 minutes before' },
    { value: '1hour', label: '1 hour before' },
    { value: '1day', label: '1 day before' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Template' : 'Create Template'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Template Name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="e.g., Weekly Report, Bug Fix..."
          error={error}
          required
          maxLength={100}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Default description for tasks created from this template..."
          rows={2}
          maxLength={500}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Default Priority"
            value={priority}
            onChange={e => setPriority(e.target.value as 'high' | 'medium' | 'low')}
            options={priorityOptions}
          />
          <Select
            label="Default Category"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            options={categoryOptions}
          />
        </div>

        <Select
          label="Default Reminder"
          value={reminder}
          onChange={e => setReminder(e.target.value as 'none' | '15min' | '1hour' | '1day')}
          options={reminderOptions}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Subtasks
          </label>
          <div className="space-y-2">
            {subtasks.map((st, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                <span className="flex-1 text-sm text-gray-700">{st.title}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubtask(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                placeholder="Add a subtask..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSubtask}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {initialData ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Use Template Modal
const UseTemplateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => void;
  templateName: string;
}> = ({ isOpen, onClose, onSubmit, templateName }) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    onSubmit(title.trim());
    setTitle('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Task from Template" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-500">
          Creating a task using the <strong>{templateName}</strong> template.
        </p>
        <Input
          label="Task Title"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
          placeholder="Enter a title for the new task..."
          error={error}
          required
          maxLength={100}
          autoFocus
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Task</Button>
        </div>
      </form>
    </Modal>
  );
};

export const TemplatesPage: React.FC = () => {
  const { templates, categories, addTemplate, updateTemplate, deleteTemplate, createTaskFromTemplate } = useTasks();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);

  const handleCreate = (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    addTemplate(data);
    showToast('Template created!', 'success');
  };

  const handleUpdate = (data: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editTemplate) {
      updateTemplate({
        ...editTemplate,
        ...data,
        updatedAt: new Date().toISOString(),
      });
      showToast('Template updated!', 'success');
      setEditTemplate(undefined);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTemplate(deleteId);
      showToast('Template deleted', 'success');
      setDeleteId(null);
    }
  };

  const handleUseTemplate = (title: string) => {
    if (useTemplateId) {
      createTaskFromTemplate(useTemplateId, title);
      showToast('Task created from template!', 'success');
      setUseTemplateId(null);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.color || '#6B7280';
  };

  const priorityColors = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-green-600 bg-green-50',
  };

  const useTemplate = templates.find(t => t.id === useTemplateId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Templates</h1>
          <p className="text-gray-500 mt-1">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <Copy className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
          <p className="text-gray-500 mb-4">
            Create reusable templates to quickly add tasks with pre-filled settings.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create Your First Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 truncate flex-1">
                  {template.name}
                </h3>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => { setEditTemplate(template); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(template.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {template.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[template.priority]}`}>
                  {template.priority}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    backgroundColor: getCategoryColor(template.categoryId) + '20',
                    color: getCategoryColor(template.categoryId),
                  }}
                >
                  {getCategoryName(template.categoryId)}
                </span>
                {template.subtasks.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {template.subtasks.length} subtask{template.subtasks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="mt-auto pt-3 border-t">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => setUseTemplateId(template.id)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Use Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {showForm && (
        <TemplateFormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditTemplate(undefined); }}
          onSubmit={editTemplate ? handleUpdate : handleCreate}
          initialData={editTemplate}
          categories={categories}
        />
      )}

      {/* Use Template Modal */}
      {useTemplate && (
        <UseTemplateModal
          isOpen={!!useTemplateId}
          onClose={() => setUseTemplateId(null)}
          onSubmit={handleUseTemplate}
          templateName={useTemplate.name}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};
