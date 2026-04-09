import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Edit, Trash2, Play, FileText } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Subtask } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

interface Template {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  categoryId: string;
  reminder: 'none' | '15min' | '1hour' | '1day';
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  categoryId: string;
  reminder: 'none' | '15min' | '1hour' | '1day';
  subtasks: Subtask[];
}

const TEMPLATES_KEY = 'todo_app_templates';

const getTemplates = (): Template[] => {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
};

const saveTemplates = (templates: Template[]): void => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
};

const addTemplate = (data: TemplateFormData): Template => {
  const now = new Date().toISOString();
  const newTemplate: Template = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  const templates = getTemplates();
  templates.unshift(newTemplate);
  saveTemplates(templates);
  return newTemplate;
};

const updateTemplate = (id: string, data: TemplateFormData): Template => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Template not found');
  const updated: Template = {
    ...templates[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  templates[index] = updated;
  saveTemplates(templates);
  return updated;
};

const deleteTemplate = (id: string): void => {
  const templates = getTemplates().filter(t => t.id !== id);
  saveTemplates(templates);
};

const createTaskFromTemplate = (templateId: string, title: string): { templateId: string; title: string } => {
  return { templateId, title };
};

export const TemplatesPage: React.FC = () => {
  const { categories, addTask, getCategoryById } = useTasks();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<Template[]>(getTemplates());
  const [showFormModal, setShowFormModal] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null);
  const [useTemplateTitle, setUseTemplateTitle] = useState('');

  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    priority: 'medium',
    categoryId: categories[0]?.id || '',
    reminder: 'none',
    subtasks: [],
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      categoryId: categories[0]?.id || '',
      reminder: 'none',
      subtasks: [],
    });
    setNewSubtaskTitle('');
  };

  const openCreateModal = () => {
    resetForm();
    setEditTemplate(null);
    setShowFormModal(true);
  };

  const openEditModal = (template: Template) => {
    setEditTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      priority: template.priority,
      categoryId: template.categoryId,
      reminder: template.reminder,
      subtasks: [...template.subtasks],
    });
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditTemplate(null);
    resetForm();
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: uuidv4(), title: newSubtaskTitle.trim(), completed: false }],
    }));
    setNewSubtaskTitle('');
  };

  const removeSubtask = (id: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(s => s.id !== id),
    }));
  };

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    const data = { ...formData, name: formData.name.trim(), description: formData.description.trim() };
    const created = addTemplate(data);
    if (typeof pendo !== 'undefined') {
      pendo.track('template_created', {
        templateId: created.id,
        priority: data.priority,
        categoryId: data.categoryId,
        reminder: data.reminder,
        subtaskCount: data.subtasks.length,
        hasDescription: !!data.description,
      });
    }
    setTemplates(getTemplates());
    showToast('Template created successfully!', 'success');
    closeFormModal();
  };

  const handleUpdate = () => {
    if (!editTemplate || !formData.name.trim()) return;
    const data = { ...formData, name: formData.name.trim(), description: formData.description.trim() };
    updateTemplate(editTemplate.id, data);
    if (typeof pendo !== 'undefined') {
      pendo.track('template_updated', {
        templateId: editTemplate.id,
        priority: data.priority,
        categoryId: data.categoryId,
        reminder: data.reminder,
        subtaskCount: data.subtasks.length,
      });
    }
    setTemplates(getTemplates());
    showToast('Template updated successfully!', 'success');
    closeFormModal();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTemplate(deleteId);
    if (typeof pendo !== 'undefined') {
      pendo.track('template_deleted', {
        templateId: deleteId,
      });
    }
    setTemplates(getTemplates());
    showToast('Template deleted', 'success');
    setDeleteId(null);
  };

  const handleUseTemplate = () => {
    if (!useTemplateId || !useTemplateTitle.trim()) return;
    const title = useTemplateTitle.trim();
    createTaskFromTemplate(useTemplateId, title);
    const template = templates.find(t => t.id === useTemplateId);
    if (template) {
      addTask({
        title,
        description: template.description,
        status: 'pending',
        priority: template.priority,
        categoryId: template.categoryId,
        dueDate: null,
        dueTime: null,
        reminder: template.reminder,
        subtasks: template.subtasks.map(s => ({ ...s, id: uuidv4(), completed: false })),
      });
      if (typeof pendo !== 'undefined') {
        pendo.track('task_created_from_template', {
          templateId: useTemplateId,
          templateName: template.name,
          priority: template.priority,
          categoryId: template.categoryId,
          reminder: template.reminder,
          subtaskCount: template.subtasks.length,
        });
      }
    }
    showToast('Task created from template!', 'success');
    setUseTemplateId(null);
    setUseTemplateTitle('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-gray-500 mt-1">
            Create reusable task templates to speed up your workflow
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No templates yet</h3>
          <p className="text-gray-500 mb-4">Create your first template to get started.</p>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-1" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => {
            const category = getCategoryById(template.categoryId);
            return (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate flex-1">{template.name}</h3>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setUseTemplateId(template.id)}
                      className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition-colors"
                      title="Use template"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit template"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(template.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full capitalize ${getPriorityColor(template.priority)}`}>
                    {template.priority}
                  </span>
                  {category && (
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${category.color}20`, color: category.color }}
                    >
                      {category.name}
                    </span>
                  )}
                  {template.subtasks.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {template.subtasks.length} subtask{template.subtasks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={closeFormModal}
        title={editTemplate ? 'Edit Template' : 'Create Template'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeFormModal}>
              Cancel
            </Button>
            <Button onClick={editTemplate ? handleUpdate : handleCreate}>
              {editTemplate ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Template Name"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter template name"
            maxLength={50}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TemplateFormData['priority'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder</label>
            <select
              value={formData.reminder}
              onChange={e => setFormData(prev => ({ ...prev, reminder: e.target.value as TemplateFormData['reminder'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No reminder</option>
              <option value="15min">15 minutes before</option>
              <option value="1hour">1 hour before</option>
              <option value="1day">1 day before</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subtasks</label>
            <div className="space-y-2">
              {formData.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-gray-700 truncate">{subtask.title}</span>
                  <button
                    onClick={() => removeSubtask(subtask.id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add subtask"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                />
                <Button variant="secondary" onClick={addSubtask}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Template"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to delete this template? This action cannot be undone.
        </p>
      </Modal>

      {/* Use Template Modal */}
      <Modal
        isOpen={!!useTemplateId}
        onClose={() => { setUseTemplateId(null); setUseTemplateTitle(''); }}
        title="Create Task from Template"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setUseTemplateId(null); setUseTemplateTitle(''); }}>
              Cancel
            </Button>
            <Button onClick={handleUseTemplate}>Create Task</Button>
          </div>
        }
      >
        <Input
          label="Task Title"
          value={useTemplateTitle}
          onChange={e => setUseTemplateTitle(e.target.value)}
          placeholder="Enter task title"
          maxLength={100}
        />
      </Modal>
    </div>
  );
};
