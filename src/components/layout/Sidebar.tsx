import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderOpen, Copy } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { isOverdue } from '../../utils/dateUtils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { tasks, categories, templates } = useTasks();

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const overdueCount = tasks.filter(t =>
    t.status === 'pending' && isOverdue(t.dueDate, t.dueTime, t.status)
  ).length;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/tasks', label: 'All Tasks', icon: CheckSquare, count: pendingCount },
    { path: '/templates', label: 'Templates', icon: Copy, count: templates.length },
    { path: '/categories', label: 'Categories', icon: FolderOpen, count: categories.length },
  ];

  const NavItem: React.FC<{
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = ({ path, label, icon: Icon, count }) => {
    const isActive = location.pathname === path;

    return (
      <NavLink
        to={path}
        onClick={() => onClose()}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
          ${isActive
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          pt-16 lg:pt-0
        `}
      >
        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        {/* Stats */}
        <div className="px-4 mt-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Tasks</span>
                <span className="font-medium text-gray-900">{tasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pending</span>
                <span className="font-medium text-yellow-600">{pendingCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </span>
              </div>
              {overdueCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Overdue</span>
                  <span className="font-medium text-red-600">{overdueCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categories quick links */}
        <div className="px-4 mt-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
            Categories
          </h4>
          <div className="space-y-1">
            {categories.slice(0, 5).map(category => {
              const categoryTaskCount = tasks.filter(
                t => t.categoryId === category.id && t.status === 'pending'
              ).length;

              return (
                <NavLink
                  key={category.id}
                  to={`/tasks?category=${category.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                  {categoryTaskCount > 0 && (
                    <span className="ml-auto text-xs text-gray-400">
                      {categoryTaskCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};
