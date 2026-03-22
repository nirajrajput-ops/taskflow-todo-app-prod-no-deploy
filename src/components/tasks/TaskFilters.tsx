import React from 'react';
import { Search, X } from 'lucide-react';
import { TaskFilter, TaskSort, Category } from '../../types';
import { Select } from '../common/Input';
import { Button } from '../common/Button';

interface TaskFiltersProps {
  filter: TaskFilter;
  sort: TaskSort;
  categories: Category[];
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
  onClearFilters: () => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filter,
  sort,
  categories,
  onFilterChange,
  onSortChange,
  onClearFilters,
}) => {
  const hasActiveFilters =
    filter.status !== 'all' ||
    filter.priority !== 'all' ||
    filter.categoryId !== 'all' ||
    filter.search !== '';

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(cat => ({ value: cat.id, label: cat.name })),
  ];

  const sortOptions = [
    { value: 'dueDate', label: 'Due Date' },
    { value: 'priority', label: 'Priority' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'title', label: 'Alphabetical' },
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={filter.search}
          onChange={e => onFilterChange({ ...filter, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[140px]">
          <Select
            options={statusOptions}
            value={filter.status}
            onChange={e => {
              const newFilter = { ...filter, status: e.target.value as TaskFilter['status'] };
              onFilterChange(newFilter);
              if (typeof pendo !== 'undefined') {
                pendo.track('task_filters_applied', {
                  statusFilter: newFilter.status,
                  priorityFilter: newFilter.priority,
                  categoryFilter: newFilter.categoryId,
                  sortBy: sort,
                });
              }
            }}
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <Select
            options={priorityOptions}
            value={filter.priority}
            onChange={e => {
              const newFilter = { ...filter, priority: e.target.value as TaskFilter['priority'] };
              onFilterChange(newFilter);
              if (typeof pendo !== 'undefined') {
                pendo.track('task_filters_applied', {
                  statusFilter: newFilter.status,
                  priorityFilter: newFilter.priority,
                  categoryFilter: newFilter.categoryId,
                  sortBy: sort,
                });
              }
            }}
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <Select
            options={categoryOptions}
            value={filter.categoryId}
            onChange={e => {
              const newFilter = { ...filter, categoryId: e.target.value };
              onFilterChange(newFilter);
              if (typeof pendo !== 'undefined') {
                pendo.track('task_filters_applied', {
                  statusFilter: newFilter.status,
                  priorityFilter: newFilter.priority,
                  categoryFilter: newFilter.categoryId,
                  sortBy: sort,
                });
              }
            }}
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <Select
            options={sortOptions}
            value={sort}
            onChange={e => onSortChange(e.target.value as TaskSort)}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
};
