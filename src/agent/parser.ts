import { ParsedCommand, AgentIntent } from './types';

// Extract quoted strings from input
const extractQuoted = (input: string): string[] => {
  const matches = input.match(/["']([^"']+)["']/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
};

// Parse relative dates to YYYY-MM-DD
const parseDate = (input: string): string | undefined => {
  const lower = input.toLowerCase();
  const today = new Date();

  if (/\btoday\b/.test(lower)) {
    return today.toISOString().split('T')[0];
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (/\bnext week\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  if (/\bnext month\b/.test(lower)) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }

  // Day names
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const d = new Date(today);
      const currentDay = d.getDay();
      const diff = (i - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
  }

  // In N days
  const inDays = lower.match(/in\s+(\d+)\s+days?/);
  if (inDays) {
    const d = new Date(today);
    d.setDate(d.getDate() + parseInt(inDays[1]));
    return d.toISOString().split('T')[0];
  }

  // Explicit date formats: YYYY-MM-DD or MM/DD/YYYY or Month DD
  const isoMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const usMatch = input.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (usMatch) {
    const d = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
    return d.toISOString().split('T')[0];
  }

  const months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < months.length; i++) {
    const monthRegex = new RegExp(`${months[i]}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, 'i');
    const match = lower.match(monthRegex);
    if (match) {
      const year = match[2] ? parseInt(match[2]) : today.getFullYear();
      const d = new Date(year, i, parseInt(match[1]));
      return d.toISOString().split('T')[0];
    }
  }

  return undefined;
};

// Parse time from input (e.g., "at 3pm", "at 14:30")
const parseTime = (input: string): string | undefined => {
  const lower = input.toLowerCase();

  // 12-hour format: "at 3pm", "at 3:30 pm"
  const time12 = lower.match(/(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (time12) {
    let hours = parseInt(time12[1]);
    const minutes = time12[2] ? parseInt(time12[2]) : 0;
    if (time12[3] === 'pm' && hours !== 12) hours += 12;
    if (time12[3] === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // 24-hour format: "at 14:30"
  const time24 = lower.match(/(?:at|by)\s+(\d{1,2}):(\d{2})(?!\d)/);
  if (time24) {
    return `${time24[1].padStart(2, '0')}:${time24[2]}`;
  }

  return undefined;
};

// Extract priority from input
const parsePriority = (input: string): 'high' | 'medium' | 'low' | undefined => {
  const lower = input.toLowerCase();
  if (/\b(high|urgent|important|critical)\s*(priority)?\b/.test(lower)) return 'high';
  if (/\b(medium|moderate|normal)\s*(priority)?\b/.test(lower)) return 'medium';
  if (/\b(low|minor)\s*(priority)?\b/.test(lower)) return 'low';
  if (/\bpriority\s+(high|urgent|important|critical)\b/.test(lower)) return 'high';
  if (/\bpriority\s+(medium|moderate|normal)\b/.test(lower)) return 'medium';
  if (/\bpriority\s+(low|minor)\b/.test(lower)) return 'low';
  return undefined;
};

// Extract reminder from input
const parseReminder = (input: string): 'none' | '15min' | '1hour' | '1day' | undefined => {
  const lower = input.toLowerCase();
  if (/\breminder?\s*(of\s+)?15\s*min/.test(lower) || /\b15\s*min.*reminder?\b/.test(lower)) return '15min';
  if (/\breminder?\s*(of\s+)?1\s*hour/.test(lower) || /\b1\s*hour.*reminder?\b/.test(lower)) return '1hour';
  if (/\breminder?\s*(of\s+)?1\s*day/.test(lower) || /\b1\s*day.*reminder?\b/.test(lower)) return '1day';
  if (/\bno\s*reminder\b/.test(lower)) return 'none';
  return undefined;
};

// Extract category name from input
const parseCategoryName = (input: string): string | undefined => {
  const lower = input.toLowerCase();

  // "in category X", "category: X", "under X category"
  const catMatch = lower.match(/(?:in|under|for)\s+(?:category\s+)?["']?([^"',]+?)["']?\s*(?:category|with|due|priority|$)/i)
    || lower.match(/category\s*:?\s*["']?([^"',]+?)["']?\s*(?:with|due|priority|$)/i);
  if (catMatch) return catMatch[1].trim();

  // Check quoted strings after "in" or "category"
  const quoted = extractQuoted(input);
  if (quoted.length > 1) {
    // Second quoted string might be category if pattern suggests it
    const afterFirst = input.indexOf(quoted[0]) + quoted[0].length;
    const remaining = input.slice(afterFirst).toLowerCase();
    if (/(?:in|under|category)/.test(remaining)) {
      return quoted[1];
    }
  }

  return undefined;
};

// Detect intent from input
const detectIntent = (input: string): AgentIntent => {
  const lower = input.toLowerCase().trim();

  // Help
  if (/^(help|what can you do|commands|how to use|capabilities)\b/.test(lower) || lower === '?') {
    return 'HELP';
  }

  // Stats / Dashboard
  if (/\b(stats|statistics|summary|dashboard|overview)\b/.test(lower) && !/\btask\b/.test(lower)) {
    return 'SHOW_STATS';
  }

  // Category operations
  if (/\b(create|add|new)\b.*\bcategor/.test(lower)) return 'CREATE_CATEGORY';
  if (/\b(update|edit|rename|change)\b.*\bcategor/.test(lower)) return 'UPDATE_CATEGORY';
  if (/\b(delete|remove)\b.*\bcategor/.test(lower)) return 'DELETE_CATEGORY';
  if (/\b(list|show|view|get|all)\b.*\bcategor/.test(lower) || /\bcategor(y|ies)\b/.test(lower) && /\b(list|show|view|all)\b/.test(lower)) {
    return 'LIST_CATEGORIES';
  }

  // Subtask operations
  if (/\b(add)\b.*\bsubtask/.test(lower)) return 'ADD_SUBTASK';
  if (/\b(complete|check|toggle|finish|done)\b.*\bsubtask/.test(lower)) return 'TOGGLE_SUBTASK';

  // Task completion
  if (/\b(complete|finish|done|mark.*(?:completed|done|finished))\b/.test(lower) && !/\bsubtask\b/.test(lower)) {
    return 'COMPLETE_TASK';
  }
  if (/\b(uncomplete|reopen|mark.*(?:pending|incomplete|undone))\b/.test(lower)) {
    return 'UNCOMPLETE_TASK';
  }

  // Task CRUD
  if (/\b(create|add|new)\b.*\btask/.test(lower) || /\btask\b.*\b(create|add)\b/.test(lower)) {
    return 'CREATE_TASK';
  }
  if (/\b(update|edit|modify|change)\b.*\btask/.test(lower) || /\btask\b.*\b(update|edit|change)\b/.test(lower)) {
    return 'UPDATE_TASK';
  }
  if (/\b(delete|remove)\b.*\btask/.test(lower) || /\btask\b.*\b(delete|remove)\b/.test(lower)) {
    return 'DELETE_TASK';
  }

  // List / Search / Show tasks
  if (/\b(show|list|find|search|get|view|display)\b.*\btask/.test(lower) || /\btasks?\b.*\b(list|show|view)\b/.test(lower)) {
    // "show task X" (singular, specific) vs "show tasks" (list)
    if (/\bshow\s+task\s+["']/.test(lower) || /\bdetails?\s+(of|for)\b/.test(lower)) {
      return 'SHOW_TASK';
    }
    return 'LIST_TASKS';
  }

  // Overdue / today / pending shortcuts
  if (/\b(overdue|pending|completed)\s+tasks?\b/.test(lower) || /\btoday'?s?\s+tasks?\b/.test(lower)) {
    return 'LIST_TASKS';
  }

  // If it starts with a task-creation-like phrase without "task" keyword
  if (/^(create|add|new)\s+["']/.test(lower)) {
    return 'CREATE_TASK';
  }

  // Context-aware short commands (follow-ups referencing prior context)
  // Positional refs: "#1", "2", "the first one"
  if (/^#?\d+$/.test(lower.trim()) || /^(the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s*(one|task)?$/.test(lower)) {
    return 'SHOW_TASK';
  }

  // "delete it", "remove that", "complete this one", etc.
  if (/^(delete|remove)\s+(it|that|this|this one|that one|the same)/.test(lower)) return 'DELETE_TASK';
  if (/^(complete|finish|done|mark.*done)\s*(it|that|this|this one|that one)?/.test(lower)) return 'COMPLETE_TASK';
  if (/^(show|view)\s+(it|that|this|this one|that one|details?)/.test(lower)) return 'SHOW_TASK';
  if (/^(reopen|uncomplete|mark.*pending)\s*(it|that|this)?/.test(lower)) return 'UNCOMPLETE_TASK';
  if (/^(update|edit|change|modify)\s+(it|that|this|this one)/.test(lower)) return 'UPDATE_TASK';

  // Bare property changes implying update of last task: "set priority to high", "set a priority to high", "change category to Work"
  if (/^set\s+(a\s+)?(the\s+)?(priority|category|title|description|due|reminder)\b/.test(lower)) return 'UPDATE_TASK';
  if (/^(change|make)\s+(a\s+)?(the\s+)?(priority|category|title|description|due|reminder)\b/.test(lower)) return 'UPDATE_TASK';
  if (/^(make|set)\s+(it\s+)?(high|medium|low)\s*priority/.test(lower)) return 'UPDATE_TASK';
  if (/^(make|set)\s+(it|this|that)\s+(high|medium|low)\b/.test(lower)) return 'UPDATE_TASK';
  if (/^(mark|move)\s+(it|this|that)\s/.test(lower)) return 'UPDATE_TASK';

  return 'UNKNOWN';
};

// Extract task title from input based on intent
const extractTaskTitle = (input: string, intent: AgentIntent): string | undefined => {
  const quoted = extractQuoted(input);
  if (quoted.length > 0) return quoted[0];

  if (intent === 'CREATE_TASK') {
    // "create task Buy groceries with high priority"
    const match = input.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(?:called\s+|named\s+|titled\s+)?(.+?)(?:\s+(?:with|in|under|due|priority|category|remind|$))/i);
    if (match) return match[1].trim();

    // Fallback: everything after "task"
    const fallback = input.match(/(?:create|add|new)\s+(?:a\s+)?task\s+(?:called\s+|named\s+|titled\s+)?(.+)/i);
    if (fallback) return fallback[1].trim();
  }

  if (intent === 'DELETE_TASK' || intent === 'COMPLETE_TASK' || intent === 'UNCOMPLETE_TASK' || intent === 'SHOW_TASK') {
    const match = input.match(/(?:delete|remove|complete|finish|done|uncomplete|reopen|show|view|details?\s+(?:of|for))\s+(?:the\s+)?(?:task\s+)?(?:called\s+|named\s+|titled\s+)?["']?(.+?)["']?\s*$/i);
    if (match) return match[1].trim();
  }

  if (intent === 'UPDATE_TASK') {
    const match = input.match(/(?:update|edit|modify|change)\s+(?:the\s+)?task\s+(?:called\s+|named\s+|titled\s+)?["']?(.+?)["']?\s+(?:set|to|with|change|priority|category|due|description|title)/i);
    if (match) return match[1].trim();
  }

  return undefined;
};

export const parseCommand = (input: string): ParsedCommand => {
  const intent = detectIntent(input);
  const quoted = extractQuoted(input);
  const lower = input.toLowerCase();

  const entities: ParsedCommand['entities'] = {};

  // Extract common entities
  entities.priority = parsePriority(input);
  entities.dueDate = parseDate(input);
  entities.dueTime = parseTime(input);
  entities.reminder = parseReminder(input);

  switch (intent) {
    case 'CREATE_TASK': {
      entities.title = extractTaskTitle(input, intent);
      entities.categoryName = parseCategoryName(input);

      // Description: "description ..." or "desc ..."
      const descMatch = input.match(/(?:description|desc)\s*:?\s*["']?(.+?)["']?\s*(?:with|due|priority|category|remind|$)/i);
      if (descMatch) entities.description = descMatch[1].trim();
      break;
    }

    case 'UPDATE_TASK': {
      entities.title = extractTaskTitle(input, intent);
      entities.categoryName = parseCategoryName(input);

      // "set title to X", "change the title to X"
      const titleChange = input.match(/(?:set|change)\s+(?:a\s+|the\s+)?title\s+to\s+["']?(.+?)["']?\s*$/i);
      if (titleChange) entities.newTitle = titleChange[1].trim();

      // "set description to X"
      const descChange = input.match(/(?:set|change)\s+(?:a\s+|the\s+)?description\s+to\s+["']?(.+?)["']?\s*$/i);
      if (descChange) entities.description = descChange[1].trim();

      // "set priority to high", "set a priority to high", "make it high priority"
      const prioChange = input.match(/(?:set|change|make)\s+(?:a\s+|the\s+)?(?:it\s+)?priority\s+to\s+(high|medium|low)/i)
        || input.match(/(?:set|change|make)\s+(?:it\s+)?(high|medium|low)\s*(?:priority)?$/i);
      if (prioChange) entities.priority = prioChange[1].toLowerCase() as 'high' | 'medium' | 'low';

      // "set category to Work", "change the category to Work"
      const catChange = input.match(/(?:set|change)\s+(?:a\s+|the\s+)?category\s+to\s+["']?(.+?)["']?\s*$/i);
      if (catChange) entities.categoryName = catChange[1].trim();

      // "set due date to tomorrow", "change due to next week"
      const dueChange = input.match(/(?:set|change)\s+(?:a\s+|the\s+)?(?:due\s*(?:date)?)\s+to\s+(.+)$/i);
      if (dueChange) {
        const parsedDate = parseDate(dueChange[1]);
        if (parsedDate) entities.dueDate = parsedDate;
      }

      // "set reminder to 1 hour"
      const reminderChange = input.match(/(?:set|change)\s+(?:a\s+|the\s+)?reminder\s+to\s+(.+)$/i);
      if (reminderChange) {
        const parsedReminder = parseReminder(reminderChange[1]);
        if (parsedReminder) entities.reminder = parsedReminder;
      }

      // If first quoted is task title and second is the new value
      if (quoted.length >= 2 && !entities.newTitle) {
        entities.title = quoted[0];
      }
      break;
    }

    case 'DELETE_TASK':
    case 'COMPLETE_TASK':
    case 'UNCOMPLETE_TASK':
    case 'SHOW_TASK': {
      entities.title = extractTaskTitle(input, intent);
      break;
    }

    case 'LIST_TASKS': {
      if (/\boverdue\b/.test(lower)) entities.status = 'overdue';
      else if (/\bcompleted\b/.test(lower)) entities.status = 'completed';
      else if (/\bpending\b/.test(lower)) entities.status = 'pending';
      else if (/\btoday\b/.test(lower)) entities.status = 'pending'; // will also filter by date

      entities.categoryName = parseCategoryName(input);

      // Search query
      if (quoted.length > 0) entities.searchQuery = quoted[0];
      break;
    }

    case 'TOGGLE_SUBTASK': {
      // "complete subtask X in task Y"
      if (quoted.length >= 2) {
        entities.subtaskTitle = quoted[0];
        entities.taskTitle = quoted[1];
      } else if (quoted.length === 1) {
        entities.subtaskTitle = quoted[0];
        // Try to extract task title
        const taskMatch = input.match(/(?:in|of|for)\s+(?:task\s+)?["']?(.+?)["']?\s*$/i);
        if (taskMatch) entities.taskTitle = taskMatch[1].trim();
      }
      break;
    }

    case 'ADD_SUBTASK': {
      // "add subtask X to task Y"
      if (quoted.length >= 2) {
        entities.subtaskTitle = quoted[0];
        entities.taskTitle = quoted[1];
      } else if (quoted.length === 1) {
        entities.subtaskTitle = quoted[0];
        const taskMatch = input.match(/(?:to|in|for)\s+(?:task\s+)?["']?(.+?)["']?\s*$/i);
        if (taskMatch) entities.taskTitle = taskMatch[1].trim();
      }
      break;
    }

    case 'CREATE_CATEGORY': {
      if (quoted.length > 0) {
        entities.categoryName = quoted[0];
      } else {
        const match = input.match(/(?:create|add|new)\s+(?:a\s+)?category\s+(?:called\s+|named\s+)?["']?(.+?)["']?\s*(?:with|in|$)/i);
        if (match) entities.categoryName = match[1].trim();
      }

      // Color
      const colorMap: Record<string, string> = {
        blue: '#3B82F6', red: '#EF4444', green: '#10B981', yellow: '#F59E0B',
        purple: '#8B5CF6', pink: '#EC4899', orange: '#F97316', teal: '#14B8A6', gray: '#6B7280',
      };
      for (const [name, hex] of Object.entries(colorMap)) {
        if (lower.includes(name)) {
          entities.categoryColor = hex;
          break;
        }
      }
      // Default color if not specified
      if (!entities.categoryColor) entities.categoryColor = '#3B82F6';
      break;
    }

    case 'UPDATE_CATEGORY': {
      if (quoted.length >= 2) {
        entities.categoryName = quoted[0];
        entities.newCategoryName = quoted[1];
      } else if (quoted.length === 1) {
        entities.categoryName = quoted[0];
      } else {
        const match = input.match(/(?:update|edit|rename|change)\s+(?:the\s+)?category\s+(?:called\s+|named\s+)?["']?(.+?)["']?\s+to\s+["']?(.+?)["']?\s*$/i);
        if (match) {
          entities.categoryName = match[1].trim();
          entities.newCategoryName = match[2].trim();
        }
      }

      const colorMap: Record<string, string> = {
        blue: '#3B82F6', red: '#EF4444', green: '#10B981', yellow: '#F59E0B',
        purple: '#8B5CF6', pink: '#EC4899', orange: '#F97316', teal: '#14B8A6', gray: '#6B7280',
      };
      for (const [name, hex] of Object.entries(colorMap)) {
        if (lower.includes(name)) {
          entities.categoryColor = hex;
          break;
        }
      }
      break;
    }

    case 'DELETE_CATEGORY': {
      if (quoted.length > 0) {
        entities.categoryName = quoted[0];
        if (quoted.length > 1) entities.reassignTo = quoted[1];
      } else {
        const match = input.match(/(?:delete|remove)\s+(?:the\s+)?category\s+(?:called\s+|named\s+)?["']?(.+?)["']?\s*(?:reassign|move|$)/i);
        if (match) entities.categoryName = match[1].trim();
      }

      // "reassign to X" or "move tasks to X"
      const reassignMatch = input.match(/(?:reassign|move\s+tasks?)\s+to\s+["']?(.+?)["']?\s*$/i);
      if (reassignMatch) entities.reassignTo = reassignMatch[1].trim();
      break;
    }
  }

  return { intent, entities, raw: input };
};
