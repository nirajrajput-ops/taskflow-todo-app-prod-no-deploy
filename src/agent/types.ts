export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AgentIntent =
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'COMPLETE_TASK'
  | 'UNCOMPLETE_TASK'
  | 'LIST_TASKS'
  | 'SHOW_TASK'
  | 'TOGGLE_SUBTASK'
  | 'ADD_SUBTASK'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'LIST_CATEGORIES'
  | 'SHOW_STATS'
  | 'HELP'
  | 'UNKNOWN';

export interface ParsedCommand {
  intent: AgentIntent;
  entities: {
    title?: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    categoryName?: string;
    dueDate?: string;
    dueTime?: string;
    reminder?: 'none' | '15min' | '1hour' | '1day';
    status?: 'pending' | 'completed' | 'overdue' | 'all';
    subtaskTitle?: string;
    taskTitle?: string;
    categoryColor?: string;
    newTitle?: string;
    newCategoryName?: string;
    reassignTo?: string;
    searchQuery?: string;
    field?: string;
    value?: string;
  };
  raw: string;
}

// Tracks what the agent last talked about so follow-up messages can resolve references
export interface ConversationContext {
  // The last single task that was shown, created, updated, completed, etc.
  lastMentionedTaskTitle: string | null;
  // The last list of tasks returned by LIST_TASKS (ordered)
  lastListedTasks: string[];
  // The last category mentioned
  lastMentionedCategoryName: string | null;
  // The last intent that was executed
  lastIntent: AgentIntent | null;
}
