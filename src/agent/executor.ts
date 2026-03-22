import { Task, Category } from '../types';
import { ParsedCommand, ConversationContext } from './types';
import { isOverdue, isDueToday, formatDate, formatTime } from '../utils/dateUtils';
import { v4 as uuidv4 } from 'uuid';

interface TaskActions {
  tasks: Task[];
  categories: Category[];
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'reminderTriggered'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskStatus: (taskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  getTaskById: (taskId: string) => Task | undefined;
  addCategory: (name: string, color: string) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (categoryId: string, reassignTo: string) => void;
  getCategoryById: (categoryId: string) => Category | undefined;
}

// Find task by title (fuzzy match)
const findTaskByTitle = (tasks: Task[], title: string): Task | undefined => {
  const lower = title.toLowerCase();
  // Exact match first
  const exact = tasks.find(t => t.title.toLowerCase() === lower);
  if (exact) return exact;
  // Starts with
  const startsWith = tasks.find(t => t.title.toLowerCase().startsWith(lower));
  if (startsWith) return startsWith;
  // Contains
  const contains = tasks.find(t => t.title.toLowerCase().includes(lower));
  if (contains) return contains;
  return undefined;
};

// Find category by name (fuzzy match)
const findCategoryByName = (categories: Category[], name: string): Category | undefined => {
  const lower = name.toLowerCase();
  const exact = categories.find(c => c.name.toLowerCase() === lower);
  if (exact) return exact;
  const startsWith = categories.find(c => c.name.toLowerCase().startsWith(lower));
  if (startsWith) return startsWith;
  const contains = categories.find(c => c.name.toLowerCase().includes(lower));
  return contains;
};

const formatTaskSummary = (task: Task, categories: Category[]): string => {
  const cat = categories.find(c => c.id === task.categoryId);
  const parts = [
    `**${task.title}**`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    `Category: ${cat?.name || 'Unknown'}`,
  ];
  if (task.dueDate) {
    parts.push(`Due: ${formatDate(task.dueDate)}${task.dueTime ? ` at ${formatTime(task.dueTime)}` : ''}`);
  }
  if (task.description) {
    parts.push(`Description: ${task.description}`);
  }
  if (task.subtasks.length > 0) {
    const completed = task.subtasks.filter(s => s.completed).length;
    parts.push(`Subtasks: ${completed}/${task.subtasks.length} completed`);
  }
  return parts.join('\n');
};

// Check if user input contains a reference to something from previous context
const hasContextReference = (raw: string): boolean => {
  const lower = raw.toLowerCase();
  return /\b(it|that|this|that one|this one|the same|same one)\b/.test(lower)
    || /\b(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\b/.test(lower)
    || /^#?\d+\s*$/.test(lower.trim())
    || /\b(last|previous)\s+(task|one)\b/.test(lower)
    || /\bnumber\s+\d+\b/.test(lower);
};

// Resolve a positional reference like "the first one", "#2", "3" from the last listed tasks
const resolvePositionalRef = (raw: string, lastListed: string[]): string | null => {
  if (lastListed.length === 0) return null;

  const lower = raw.toLowerCase().trim();

  // Direct number: "3", "#3"
  const numMatch = lower.match(/^#?(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1]) - 1;
    if (idx >= 0 && idx < lastListed.length) return lastListed[idx];
  }

  // "number 3"
  const numWord = lower.match(/\bnumber\s+(\d+)\b/);
  if (numWord) {
    const idx = parseInt(numWord[1]) - 1;
    if (idx >= 0 && idx < lastListed.length) return lastListed[idx];
  }

  // Ordinal words
  const ordinals: Record<string, number> = {
    first: 0, second: 1, third: 2, fourth: 3, fifth: 4,
    '1st': 0, '2nd': 1, '3rd': 2, '4th': 3, '5th': 4,
    last: lastListed.length - 1,
  };
  for (const [word, idx] of Object.entries(ordinals)) {
    if (lower.includes(word) && idx < lastListed.length) {
      return lastListed[idx];
    }
  }

  return null;
};

// Resolve task title from context when the parser couldn't extract one
const resolveTaskTitle = (
  entities: ParsedCommand['entities'],
  raw: string,
  ctx: ConversationContext,
  tasks: Task[]
): string | undefined => {
  // If parser already found a title, validate it exists; if not, try context
  if (entities.title) {
    const found = findTaskByTitle(tasks, entities.title);
    if (found) return entities.title;
    // Title was extracted but doesn't match any task — might be a bad parse.
    // Still return it so the executor can give a "not found" message.
    return entities.title;
  }

  // Try positional reference from last listed tasks
  const positional = resolvePositionalRef(raw, ctx.lastListedTasks);
  if (positional) return positional;

  // "it", "that", "this one", etc. → use last mentioned task
  if (hasContextReference(raw) && ctx.lastMentionedTaskTitle) {
    return ctx.lastMentionedTaskTitle;
  }

  // For any intent with no explicit title and a prior context, assume they mean the last mentioned task.
  // This covers: "delete it", "complete it", "set priority to high", "change category to Work", etc.
  if (ctx.lastMentionedTaskTitle) {
    return ctx.lastMentionedTaskTitle;
  }

  return undefined;
};

// Resolve category name from context
const resolveCategoryName = (
  entities: ParsedCommand['entities'],
  raw: string,
  ctx: ConversationContext
): string | undefined => {
  if (entities.categoryName) return entities.categoryName;

  if (hasContextReference(raw) && ctx.lastMentionedCategoryName) {
    return ctx.lastMentionedCategoryName;
  }

  return undefined;
};

export const createEmptyContext = (): ConversationContext => ({
  lastMentionedTaskTitle: null,
  lastListedTasks: [],
  lastMentionedCategoryName: null,
  lastIntent: null,
});

export const executeCommand = (
  command: ParsedCommand,
  actions: TaskActions,
  ctx: ConversationContext
): { response: string; newCtx: ConversationContext } => {
  const { intent, entities, raw } = command;
  const { tasks, categories } = actions;

  // Start with a copy of context that we'll update
  const newCtx: ConversationContext = { ...ctx, lastIntent: intent };

  const result = (response: string) => ({ response, newCtx });

  switch (intent) {
    case 'HELP': {
      return result(`Here's what I can do:\n
**Tasks:**
• Create a task: "Create task 'Buy groceries' with high priority in category Shopping due tomorrow"
• Update a task: "Update task 'Buy groceries' set priority to low"
• Delete a task: "Delete task 'Buy groceries'"
• Complete a task: "Complete task 'Buy groceries'"
• Reopen a task: "Mark task 'Buy groceries' as pending"
• Show task details: "Show task 'Buy groceries'"
• List tasks: "Show all tasks", "Show overdue tasks", "Show high priority tasks"

**Subtasks:**
• Add subtask: "Add subtask 'Buy milk' to task 'Buy groceries'"
• Complete subtask: "Complete subtask 'Buy milk' in task 'Buy groceries'"

**Categories:**
• Create: "Create category 'Finance' with blue color"
• Rename: "Rename category 'Finance' to 'Budget'"
• Delete: "Delete category 'Finance' reassign to Work"
• List: "Show categories"

**Dashboard:**
• "Show stats" or "Show summary"

**Context-aware:**
• After listing tasks, use "#1", "the first one", "the second one" to refer to them
• After any task action, say "delete it", "complete it", "show it" to act on the same task

Tip: Use quotes around names for accuracy!`);
    }

    case 'CREATE_TASK': {
      if (!entities.title) {
        return result('Please provide a task title. Example: Create task "Buy groceries" with high priority');
      }

      const resolvedCat = resolveCategoryName(entities, raw, ctx);
      const categoryId = resolvedCat
        ? findCategoryByName(categories, resolvedCat)?.id || categories[0]?.id
        : categories[0]?.id;

      actions.addTask({
        title: entities.title,
        description: entities.description || '',
        status: 'pending',
        priority: entities.priority || 'medium',
        categoryId: categoryId || 'other',
        dueDate: entities.dueDate || null,
        dueTime: entities.dueTime || null,
        reminder: entities.reminder || 'none',
        subtasks: [],
      });

      newCtx.lastMentionedTaskTitle = entities.title;

      const parts = [`Task "${entities.title}" created successfully!`];
      parts.push(`Priority: ${entities.priority || 'medium'}`);
      if (resolvedCat) {
        const cat = findCategoryByName(categories, resolvedCat);
        parts.push(`Category: ${cat ? cat.name : `${resolvedCat} (not found, used default)`}`);
      }
      if (entities.dueDate) parts.push(`Due: ${formatDate(entities.dueDate)}${entities.dueTime ? ` at ${formatTime(entities.dueTime)}` : ''}`);
      if (entities.reminder && entities.reminder !== 'none') parts.push(`Reminder: ${entities.reminder}`);
      return result(parts.join('\n'));
    }

    case 'UPDATE_TASK': {
      const title = resolveTaskTitle(entities, raw, ctx, tasks);
      if (!title) {
        return result('Please specify which task to update. Example: Update task "Buy groceries" set priority to high');
      }

      const task = findTaskByTitle(tasks, title);
      if (!task) {
        return result(`Task "${title}" not found. Use "show tasks" to see available tasks.`);
      }

      const updated = { ...task };
      const changes: string[] = [];

      if (entities.newTitle) {
        updated.title = entities.newTitle;
        changes.push(`Title → "${entities.newTitle}"`);
      }
      if (entities.description !== undefined) {
        updated.description = entities.description;
        changes.push(`Description updated`);
      }
      if (entities.priority) {
        updated.priority = entities.priority;
        changes.push(`Priority → ${entities.priority}`);
      }
      const resolvedCat = resolveCategoryName(entities, raw, ctx);
      if (resolvedCat) {
        const cat = findCategoryByName(categories, resolvedCat);
        if (cat) {
          updated.categoryId = cat.id;
          changes.push(`Category → ${cat.name}`);
        } else {
          return result(`Category "${resolvedCat}" not found. Use "show categories" to see available categories.`);
        }
      }
      if (entities.dueDate) {
        updated.dueDate = entities.dueDate;
        changes.push(`Due date → ${formatDate(entities.dueDate)}`);
      }
      if (entities.dueTime) {
        updated.dueTime = entities.dueTime;
        changes.push(`Due time → ${formatTime(entities.dueTime)}`);
      }
      if (entities.reminder) {
        updated.reminder = entities.reminder;
        changes.push(`Reminder → ${entities.reminder}`);
      }

      if (changes.length === 0) {
        return result(`No changes specified for task "${task.title}". You can set: title, description, priority, category, due date, due time, reminder.`);
      }

      actions.updateTask(updated);
      newCtx.lastMentionedTaskTitle = entities.newTitle || task.title;
      return result(`Task "${task.title}" updated:\n${changes.map(c => `• ${c}`).join('\n')}`);
    }

    case 'DELETE_TASK': {
      const title = resolveTaskTitle(entities, raw, ctx, tasks);
      if (!title) {
        return result('Please specify which task to delete. Example: Delete task "Buy groceries"');
      }

      const task = findTaskByTitle(tasks, title);
      if (!task) {
        return result(`Task "${title}" not found. Use "show tasks" to see available tasks.`);
      }

      actions.deleteTask(task.id);
      newCtx.lastMentionedTaskTitle = null;
      // Remove from listed tasks if present
      newCtx.lastListedTasks = ctx.lastListedTasks.filter(t => t !== task.title);
      return result(`Task "${task.title}" has been deleted.`);
    }

    case 'COMPLETE_TASK': {
      const title = resolveTaskTitle(entities, raw, ctx, tasks);
      if (!title) {
        return result('Please specify which task to complete. Example: Complete task "Buy groceries"');
      }

      const task = findTaskByTitle(tasks, title);
      if (!task) {
        return result(`Task "${title}" not found. Use "show tasks" to see available tasks.`);
      }

      if (task.status === 'completed') {
        return result(`Task "${task.title}" is already completed.`);
      }

      actions.toggleTaskStatus(task.id);
      newCtx.lastMentionedTaskTitle = task.title;
      return result(`Task "${task.title}" marked as completed!`);
    }

    case 'UNCOMPLETE_TASK': {
      const title = resolveTaskTitle(entities, raw, ctx, tasks);
      if (!title) {
        return result('Please specify which task to reopen. Example: Mark task "Buy groceries" as pending');
      }

      const task = findTaskByTitle(tasks, title);
      if (!task) {
        return result(`Task "${title}" not found. Use "show tasks" to see available tasks.`);
      }

      if (task.status === 'pending') {
        return result(`Task "${task.title}" is already pending.`);
      }

      actions.toggleTaskStatus(task.id);
      newCtx.lastMentionedTaskTitle = task.title;
      return result(`Task "${task.title}" marked as pending.`);
    }

    case 'SHOW_TASK': {
      const title = resolveTaskTitle(entities, raw, ctx, tasks);
      if (!title) {
        return result('Please specify which task to show. Example: Show task "Buy groceries"');
      }

      const task = findTaskByTitle(tasks, title);
      if (!task) {
        return result(`Task "${title}" not found. Use "show tasks" to see available tasks.`);
      }

      newCtx.lastMentionedTaskTitle = task.title;

      let res = formatTaskSummary(task, categories);
      if (task.subtasks.length > 0) {
        res += '\n\nSubtasks:';
        task.subtasks.forEach(s => {
          res += `\n${s.completed ? '☑' : '☐'} ${s.title}`;
        });
      }
      return result(res);
    }

    case 'LIST_TASKS': {
      let filtered = [...tasks];

      // Status filter
      if (entities.status === 'overdue') {
        filtered = filtered.filter(t => isOverdue(t.dueDate, t.dueTime, t.status));
      } else if (entities.status === 'completed') {
        filtered = filtered.filter(t => t.status === 'completed');
      } else if (entities.status === 'pending') {
        filtered = filtered.filter(t => t.status === 'pending');
      }

      // Today filter
      if (raw.toLowerCase().includes('today')) {
        filtered = filtered.filter(t => isDueToday(t.dueDate));
      }

      // Priority filter
      if (entities.priority) {
        filtered = filtered.filter(t => t.priority === entities.priority);
      }

      // Category filter
      const resolvedCat = resolveCategoryName(entities, raw, ctx);
      if (resolvedCat) {
        const cat = findCategoryByName(categories, resolvedCat);
        if (cat) {
          filtered = filtered.filter(t => t.categoryId === cat.id);
          newCtx.lastMentionedCategoryName = cat.name;
        }
      }

      // Search
      if (entities.searchQuery) {
        const q = entities.searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
          t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        );
      }

      if (filtered.length === 0) {
        newCtx.lastListedTasks = [];
        return result('No tasks found matching your criteria.');
      }

      const displayed = filtered.slice(0, 15);

      // Save listed task titles for positional references
      newCtx.lastListedTasks = displayed.map(t => t.title);

      const lines = displayed.map((t, i) => {
        const cat = categories.find(c => c.id === t.categoryId);
        const overdueTag = isOverdue(t.dueDate, t.dueTime, t.status) ? ' ⚠️ OVERDUE' : '';
        const status = t.status === 'completed' ? '✓' : '○';
        const due = t.dueDate ? ` | Due: ${formatDate(t.dueDate)}` : '';
        return `${i + 1}. ${status} **${t.title}** [${t.priority}] ${cat?.name || ''}${due}${overdueTag}`;
      });

      let res = `Found ${filtered.length} task(s):\n\n${lines.join('\n')}`;
      if (filtered.length > 15) {
        res += `\n\n...and ${filtered.length - 15} more.`;
      }
      res += '\n\nTip: Use "#1", "#2", etc. to refer to a task from this list.';
      return result(res);
    }

    case 'TOGGLE_SUBTASK': {
      const taskTitle = entities.taskTitle || entities.title || resolveTaskTitle({ title: undefined }, raw, ctx, tasks);
      if (!taskTitle || !entities.subtaskTitle) {
        return result('Please specify both the task and subtask. Example: Complete subtask "Buy milk" in task "Buy groceries"');
      }

      const task = findTaskByTitle(tasks, taskTitle);
      if (!task) {
        return result(`Task "${taskTitle}" not found.`);
      }

      const subtask = task.subtasks.find(s =>
        s.title.toLowerCase().includes(entities.subtaskTitle!.toLowerCase())
      );
      if (!subtask) {
        return result(`Subtask "${entities.subtaskTitle}" not found in task "${task.title}".`);
      }

      actions.toggleSubtask(task.id, subtask.id);
      newCtx.lastMentionedTaskTitle = task.title;
      const newState = subtask.completed ? 'pending' : 'completed';
      return result(`Subtask "${subtask.title}" in task "${task.title}" marked as ${newState}.`);
    }

    case 'ADD_SUBTASK': {
      const taskTitle = entities.taskTitle || entities.title || resolveTaskTitle({ title: undefined }, raw, ctx, tasks);
      if (!taskTitle || !entities.subtaskTitle) {
        return result('Please specify both the task and subtask title. Example: Add subtask "Buy milk" to task "Buy groceries"');
      }

      const task = findTaskByTitle(tasks, taskTitle);
      if (!task) {
        return result(`Task "${taskTitle}" not found.`);
      }

      const newSubtask = { id: uuidv4(), title: entities.subtaskTitle, completed: false };
      const updated = { ...task, subtasks: [...task.subtasks, newSubtask] };
      actions.updateTask(updated);
      newCtx.lastMentionedTaskTitle = task.title;
      return result(`Subtask "${entities.subtaskTitle}" added to task "${task.title}".`);
    }

    case 'CREATE_CATEGORY': {
      if (!entities.categoryName) {
        return result('Please provide a category name. Example: Create category "Finance" with blue color');
      }

      const existing = findCategoryByName(categories, entities.categoryName);
      if (existing && existing.name.toLowerCase() === entities.categoryName.toLowerCase()) {
        return result(`Category "${entities.categoryName}" already exists.`);
      }

      actions.addCategory(entities.categoryName, entities.categoryColor || '#3B82F6');
      newCtx.lastMentionedCategoryName = entities.categoryName;
      return result(`Category "${entities.categoryName}" created successfully!`);
    }

    case 'UPDATE_CATEGORY': {
      const catName = resolveCategoryName(entities, raw, ctx);
      if (!catName) {
        return result('Please specify which category to update. Example: Rename category "Finance" to "Budget"');
      }

      const cat = findCategoryByName(categories, catName);
      if (!cat) {
        return result(`Category "${catName}" not found.`);
      }

      if (cat.isDefault) {
        return result(`Cannot modify default category "${cat.name}".`);
      }

      const updated = { ...cat };
      const changes: string[] = [];

      if (entities.newCategoryName) {
        updated.name = entities.newCategoryName;
        changes.push(`Name → "${entities.newCategoryName}"`);
      }
      if (entities.categoryColor) {
        updated.color = entities.categoryColor;
        changes.push(`Color updated`);
      }

      if (changes.length === 0) {
        return result('No changes specified. You can set: name, color.');
      }

      actions.updateCategory(updated);
      newCtx.lastMentionedCategoryName = entities.newCategoryName || cat.name;
      return result(`Category "${cat.name}" updated:\n${changes.map(c => `• ${c}`).join('\n')}`);
    }

    case 'DELETE_CATEGORY': {
      const catName = resolveCategoryName(entities, raw, ctx);
      if (!catName) {
        return result('Please specify which category to delete. Example: Delete category "Finance" reassign to Work');
      }

      const cat = findCategoryByName(categories, catName);
      if (!cat) {
        return result(`Category "${catName}" not found.`);
      }

      if (cat.isDefault) {
        return result(`Cannot delete default category "${cat.name}".`);
      }

      const tasksInCategory = tasks.filter(t => t.categoryId === cat.id);

      let reassignCat: Category | undefined;
      if (entities.reassignTo) {
        reassignCat = findCategoryByName(categories, entities.reassignTo);
        if (!reassignCat) {
          return result(`Reassignment category "${entities.reassignTo}" not found.`);
        }
      } else {
        reassignCat = categories.find(c => c.id !== cat.id);
      }

      if (!reassignCat) {
        return result('No category available for reassignment.');
      }

      actions.deleteCategory(cat.id, reassignCat.id);
      newCtx.lastMentionedCategoryName = null;
      let msg = `Category "${cat.name}" deleted.`;
      if (tasksInCategory.length > 0) {
        msg += ` ${tasksInCategory.length} task(s) reassigned to "${reassignCat.name}".`;
      }
      return result(msg);
    }

    case 'LIST_CATEGORIES': {
      if (categories.length === 0) {
        return result('No categories found.');
      }

      const lines = categories.map(c => {
        const count = tasks.filter(t => t.categoryId === c.id).length;
        const defaultTag = c.isDefault ? ' (default)' : '';
        return `• **${c.name}**${defaultTag} — ${count} task(s)`;
      });

      return result(`Categories:\n\n${lines.join('\n')}`);
    }

    case 'SHOW_STATS': {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      const overdue = tasks.filter(t => isOverdue(t.dueDate, t.dueTime, t.status)).length;
      const dueToday = tasks.filter(t => isDueToday(t.dueDate) && t.status === 'pending').length;
      const highPriority = tasks.filter(t => t.priority === 'high' && t.status === 'pending').length;

      return result(`**Dashboard Summary**

📊 Total tasks: ${total}
✅ Completed: ${completed}
⏳ Pending: ${pending}
⚠️ Overdue: ${overdue}
📅 Due today: ${dueToday}
🔴 High priority (pending): ${highPriority}

Completion rate: ${total > 0 ? Math.round((completed / total) * 100) : 0}%`);
    }

    case 'UNKNOWN':
    default: {
      // If we have context and the message looks like it could be a follow-up action
      // on the last mentioned task, try to help
      if (ctx.lastMentionedTaskTitle) {
        return result(`I didn't understand that command. You were last working with task "${ctx.lastMentionedTaskTitle}". You can say things like:\n• "Delete it"\n• "Complete it"\n• "Show it"\n• "Set priority to high"\n\nOr type "help" for all commands.`);
      }
      if (ctx.lastListedTasks.length > 0) {
        return result(`I didn't understand that command. You recently listed tasks — use "#1", "#2" etc. to refer to them, or type "help" for all commands.`);
      }
      return result(`I didn't understand that command. Type "help" to see what I can do, or try something like:\n• "Create task 'Buy groceries' with high priority"\n• "Show all tasks"\n• "Complete task 'Buy groceries'"`);
    }
  }
};
