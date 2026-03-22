import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, Plus, ChevronLeft, MessageSquare, Trash2, PenLine } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatThread, ConversationContext } from '../../agent/types';
import { parseCommand, executeCommand, createEmptyContext } from '../../agent';
import { useTasks } from '../../context/TaskContext';

const STORAGE_KEY = 'todo_app_agent_threads';
const CTX_STORAGE_KEY = 'todo_app_agent_contexts';

const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome-' + uuidv4(),
  role: 'agent',
  content: 'Hi! I\'m your AI Task Assistant. I can help you manage your tasks and categories using natural language. Type "help" to see all available commands!',
  timestamp: new Date().toISOString(),
});

const createThread = (title?: string): ChatThread => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    title: title || 'New Thread',
    messages: [createWelcomeMessage()],
    createdAt: now,
    updatedAt: now,
  };
};

const loadThreads = (): ChatThread[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const threads = JSON.parse(data) as ChatThread[];
      if (threads.length > 0) return threads;
    }
  } catch { /* ignore */ }
  return [createThread()];
};

const saveThreads = (threads: ChatThread[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
};

// Derive thread title from first user message
const deriveTitle = (messages: ChatMessage[]): string => {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'New Thread';
  const text = firstUserMsg.content;
  return text.length > 30 ? text.slice(0, 30) + '...' : text;
};

type View = 'chat' | 'threads';

export const AgentChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>(loadThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => loadThreads()[0].id);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  // Per-thread conversation context for tracking what was last discussed
  const [threadContexts, setThreadContexts] = useState<Record<string, ConversationContext>>(() => {
    try {
      const data = localStorage.getItem(CTX_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch { return {}; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const taskContext = useTasks();

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];
  const messages = activeThread?.messages || [];

  // Persist threads to localStorage
  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  // Persist conversation contexts to localStorage
  useEffect(() => {
    localStorage.setItem(CTX_STORAGE_KEY, JSON.stringify(threadContexts));
  }, [threadContexts]);

  const getThreadContext = useCallback((threadId: string): ConversationContext => {
    return threadContexts[threadId] || createEmptyContext();
  }, [threadContexts]);

  const setThreadContext = useCallback((threadId: string, ctx: ConversationContext) => {
    setThreadContexts(prev => ({ ...prev, [threadId]: ctx }));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && view === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, view]);

  useEffect(() => {
    if (editingThreadId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingThreadId]);

  const updateThread = useCallback((threadId: string, updater: (t: ChatThread) => ChatThread) => {
    setThreads(prev => prev.map(t => t.id === threadId ? updater(t) : t));
  }, []);

  const processCommand = useCallback((text: string) => {
    const parsed = parseCommand(text);
    const currentCtx = getThreadContext(activeThreadId);
    const { response, newCtx } = executeCommand(parsed, taskContext, currentCtx);

    // Update the conversation context for this thread
    setThreadContext(activeThreadId, newCtx);

    const agentMsg: ChatMessage = {
      id: uuidv4(),
      role: 'agent',
      content: response,
      timestamp: new Date().toISOString(),
    };

    updateThread(activeThreadId, t => {
      const updated = {
        ...t,
        messages: [...t.messages, agentMsg],
        updatedAt: new Date().toISOString(),
      };
      // Auto-title if still "New Thread" and this is first response
      if (updated.title === 'New Thread') {
        updated.title = deriveTitle(updated.messages);
      }
      return updated;
    });

    setIsTyping(false);
  }, [activeThreadId, taskContext, updateThread, getThreadContext, setThreadContext]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    updateThread(activeThreadId, t => ({
      ...t,
      messages: [...t.messages, userMessage],
      updatedAt: new Date().toISOString(),
    }));

    setInput('');
    setIsTyping(true);

    setTimeout(() => processCommand(trimmed), 300 + Math.random() * 400);
  };

  const handleQuickAction = (command: string) => {
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: command,
      timestamp: new Date().toISOString(),
    };

    updateThread(activeThreadId, t => ({
      ...t,
      messages: [...t.messages, userMsg],
      updatedAt: new Date().toISOString(),
    }));

    setIsTyping(true);
    setTimeout(() => processCommand(command), 300 + Math.random() * 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewThread = () => {
    const thread = createThread();
    setThreads(prev => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setView('chat');
  };

  const handleSwitchThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setView('chat');
  };

  const handleDeleteThread = (threadId: string) => {
    // Clean up conversation context for deleted thread
    setThreadContexts(prev => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
    setThreads(prev => {
      const remaining = prev.filter(t => t.id !== threadId);
      if (remaining.length === 0) {
        const newThread = createThread();
        remaining.push(newThread);
      }
      if (threadId === activeThreadId) {
        setActiveThreadId(remaining[0].id);
      }
      return remaining;
    });
    setEditingThreadId(null);
  };

  const handleStartRename = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = () => {
    if (editingThreadId && editTitle.trim()) {
      updateThread(editingThreadId, t => ({ ...t, title: editTitle.trim() }));
    }
    setEditingThreadId(null);
    setEditTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') {
      setEditingThreadId(null);
      setEditTitle('');
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => {
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return (
        <span key={i}>
          {i > 0 && <br />}
          <span dangerouslySetInnerHTML={{ __html: formatted }} />
        </span>
      );
    });
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const threadMessageCount = (thread: ChatThread) => {
    return thread.messages.filter(m => m.role === 'user').length;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
        title="AI Task Assistant"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 text-white" />
            <Sparkles className="h-3 w-3 text-yellow-300 absolute -top-1 -right-1" />
          </div>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{ height: 'min(600px, calc(100vh - 8rem))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {view === 'threads' ? (
              <>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm">Threads</h3>
                  <p className="text-blue-100 text-xs">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</p>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setView('threads')}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0 hover:bg-white/30 transition-colors"
                  title="All threads"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{activeThread?.title}</h3>
                  <p className="text-blue-100 text-xs">AI Task Assistant</p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleNewThread}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg shrink-0"
            title="New thread"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {view === 'threads' ? (
          /* ==================== THREADS LIST ==================== */
          <div className="flex-1 overflow-y-auto">
            {threads.map(thread => (
              <div
                key={thread.id}
                className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  thread.id === activeThreadId ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                }`}
              >
                {editingThreadId === thread.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleSaveRename}
                      className="flex-1 text-sm bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleSwitchThread(thread.id)}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium text-gray-800 truncate">{thread.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 ml-6">
                        <span className="text-xs text-gray-400">
                          {threadMessageCount(thread)} message{threadMessageCount(thread) !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatTimestamp(thread.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(thread.id, thread.title);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Rename"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteThread(thread.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete thread"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {threads.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm">No threads yet</p>
              </div>
            )}
          </div>
        ) : (
          /* ==================== CHAT VIEW ==================== */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    {formatMessage(message.content)}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap shrink-0">
              {[
                { label: 'Show stats', command: 'show stats' },
                { label: 'Pending tasks', command: 'show pending tasks' },
                { label: 'Help', command: 'help' },
              ].map(action => (
                <button
                  key={action.command}
                  onClick={() => handleQuickAction(action.command)}
                  disabled={isTyping}
                  className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-300 transition-colors p-1"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};
