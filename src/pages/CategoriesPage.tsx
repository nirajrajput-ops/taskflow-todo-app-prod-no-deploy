import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Category } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { validateCategoryName } from '../utils/validators';

export const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, tasks, addCategory, updateCategory, deleteCategory } = useTasks();
  const { showToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState<Category | null>(null);
  const [reassignCategoryId, setReassignCategoryId] = useState<string>('other');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');
  const [formError, setFormError] = useState<string | null>(null);

  const colorOptions = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6B7280', // Gray
  ];

  const getCategoryTaskCount = (categoryId: string) => {
    return tasks.filter(t => t.categoryId === categoryId).length;
  };

  const handleAddCategory = () => {
    const errors = validateCategoryName(
      newCategoryName,
      categories.map(c => c.name)
    );

    if (errors.length > 0) {
      setFormError(errors[0].message);
      return;
    }

    addCategory(newCategoryName.trim(), newCategoryColor);
    if (typeof pendo !== 'undefined') {
      pendo.track('category_created', {
        categoryName: newCategoryName.trim(),
        categoryColor: newCategoryColor,
        totalCategoriesCount: categories.length + 1,
      });
    }
    showToast('Category created successfully!', 'success');
    resetForm();
    setShowAddModal(false);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;

    const otherCategories = categories.filter(c => c.id !== editingCategory.id);
    const errors = validateCategoryName(
      newCategoryName,
      otherCategories.map(c => c.name)
    );

    if (errors.length > 0) {
      setFormError(errors[0].message);
      return;
    }

    updateCategory({
      ...editingCategory,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });
    if (typeof pendo !== 'undefined') {
      pendo.track('category_updated', {
        categoryId: editingCategory.id,
        newName: newCategoryName.trim(),
        newColor: newCategoryColor,
        taskCountInCategory: getCategoryTaskCount(editingCategory.id),
      });
    }
    showToast('Category updated successfully!', 'success');
    resetForm();
    setEditingCategory(null);
  };

  const handleDeleteCategory = () => {
    if (!deleteModalCategory) return;

    const taskCount = getCategoryTaskCount(deleteModalCategory.id);
    const reassignCategory = categories.find(c => c.id === reassignCategoryId);
    if (typeof pendo !== 'undefined') {
      pendo.track('category_deleted', {
        categoryId: deleteModalCategory.id,
        categoryName: deleteModalCategory.name,
        taskCountReassigned: taskCount,
        reassignedToCategoryId: reassignCategoryId,
        reassignedToCategoryName: reassignCategory?.name || '',
      });
    }
    deleteCategory(deleteModalCategory.id, reassignCategoryId);
    showToast('Category deleted', 'success');
    setDeleteModalCategory(null);
    setReassignCategoryId('other');
  };

  const resetForm = () => {
    setNewCategoryName('');
    setNewCategoryColor('#3B82F6');
    setFormError(null);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setFormError(null);
  };

  const closeEditModal = () => {
    setEditingCategory(null);
    resetForm();
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">
            Manage your task categories to stay organized
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Category
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const taskCount = getCategoryTaskCount(category.id);

          return (
            <Card key={category.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <FolderOpen
                      className="h-5 w-5"
                      style={{ color: category.color }}
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {taskCount} task{taskCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {!category.isDefault && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(category)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                      title="Edit category"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteModalCategory(category)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {category.isDefault && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Default
                  </span>
                )}
              </div>

              <button
                onClick={() => navigate(`/tasks?category=${category.id}`)}
                className="mt-3 w-full text-sm text-blue-500 hover:text-blue-600 font-medium text-left"
              >
                View tasks →
              </button>
            </Card>
          );
        })}
      </div>

      {/* Add Category Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={closeAddModal}
        title="Create Category"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={e => {
              setNewCategoryName(e.target.value);
              setFormError(null);
            }}
            placeholder="Enter category name"
            error={formError || undefined}
            maxLength={30}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newCategoryColor === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={closeEditModal}
        title="Edit Category"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={e => {
              setNewCategoryName(e.target.value);
              setFormError(null);
            }}
            placeholder="Enter category name"
            error={formError || undefined}
            maxLength={30}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newCategoryColor === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        isOpen={!!deleteModalCategory}
        onClose={() => setDeleteModalCategory(null)}
        title="Delete Category"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteModalCategory(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCategory}>
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the category "
            <strong>{deleteModalCategory?.name}</strong>"?
          </p>

          {deleteModalCategory && getCategoryTaskCount(deleteModalCategory.id) > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700 mb-2">
                This category has {getCategoryTaskCount(deleteModalCategory.id)} task(s).
                Please select a category to reassign them to:
              </p>
              <select
                value={reassignCategoryId}
                onChange={e => setReassignCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories
                  .filter(c => c.id !== deleteModalCategory.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <p className="text-sm text-gray-500">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
};
