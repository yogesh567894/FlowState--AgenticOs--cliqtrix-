/**
 * Webhook Handler - Conversational CLI Bot
 * Processes incoming requests with context-aware responses
 */

const express = require('express');
const { parseIntent } = require('../services/nlp');
const { createTasks, getTasks, getUrgentTasks, searchTasks, deleteTasks, deleteAllTasks, completeTasks, findTaskByTitle, resolveTaskRef, updateTaskPriority } = require('../services/tasks');
const { createNote, listNotes, searchNotes, updateNote } = require('../services/notes');
const { startFocus, getCurrentFocus } = require('../services/focus');
const { 
  initializeContext, 
  updateContext, 
  getContext, 
  getLastAction, 
  getLastNote,
  getLastTask,
  isFollowUp,
  detectContextFromMessage
} = require('../services/context');
const {
  formatTaskCreated,
  formatTaskList,
  formatUrgentSummary,
  formatFocusStart,
  formatNoteCreated,
  formatNoteList,
  formatChattyFallback,
  formatMathResult,
  formatError
} = require('../services/formatter');

const router = express.Router();

/**
 * Main webhook endpoint - Conversational bot
 */
router.post('/webhook', async (req, res) => {
  try {
    const { message, userId, source } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json(formatError('Missing required fields: message, userId'));
    }
    
    console.log(`[Webhook] Received from ${userId}: ${message.substring(0, 100)}...`);
    
    // Detect and strip mode prefixes
    let mode = null;
    let processedMessage = message;
    
    if (message.startsWith('/t ') || message.startsWith('/task ')) {
      mode = 'tasks';
      processedMessage = message.replace(/^\/(t|task)\s+/, '');
    } else if (message.startsWith('/n ') || message.startsWith('/note ')) {
      mode = 'notes';
      processedMessage = message.replace(/^\/(n|note)\s+/, '');
    } else if (message.startsWith('/f ') || message.startsWith('/focus')) {
      mode = 'focus';
      processedMessage = message.replace(/^\/(f|focus)\s*/, '');
    }
    
    // Initialize user context
    initializeContext(userId);
    
    // Detect context from message
    const messageContext = detectContextFromMessage(processedMessage);
    const userContext = getContext(userId);
    
    // Add mode to context if detected
    if (mode) {
      userContext.mode = mode;
    }
    
    // Add hasTaskList flag
    userContext.hasTaskList = !!(userContext.lastTaskList && userContext.lastTaskList.length > 0);
    
    // Merge detected context with user context
    const context = {
      projectId: messageContext.project || userContext.lastProject,
      channelId: messageContext.channel || userContext.lastChannel,
      dealId: messageContext.deal || userContext.lastDeal
    };
    
    // Check for follow-up commands
    const isFollowUpCommand = isFollowUp(processedMessage);
    const lastAction = getLastAction(userId);
    
    if (isFollowUpCommand && lastAction) {
      return await handleFollowUp(userId, processedMessage, lastAction, context, res);
    }
    
    // Parse intent with Groq (automatic token splitting)
    // Pass mode context for NLP
    const nlpContext = mode ? { mode } : {};
    const intent = await parseIntent(processedMessage, nlpContext);
    
    console.log(`[Webhook] Intent:`, JSON.stringify(intent, null, 2));
    
    // Update context with message
    updateContext(userId, { message: processedMessage });
    
    // Use action field from new schema
    const action = intent.action || 'unknown';
    
    // Route to appropriate handler
    let response;
    
    switch (action) {
      case 'create_task':
        response = await handleCreateTasks(userId, intent, context);
        break;
        
      case 'list_tasks':
        response = await handleListTasks(userId, intent, context, userContext);
        break;
        
      case 'complete_task':
        response = await handleCompleteTask(userId, intent, userContext);
        break;
        
      case 'delete_task':
        response = await handleDeleteTask(userId, intent, userContext);
        break;
        
      case 'update_priority':
        response = await handleUpdatePriority(userId, intent, userContext);
        break;
        
      case 'show_urgent':
        response = await handleShowUrgent(userId, context);
        break;
        
      case 'focus':
        response = await handleFocus(userId, intent, context);
        break;
        
      case 'create_note':
        response = await handleCreateNote(userId, intent, context);
        break;
        
      case 'list_notes':
        response = await handleListNotes(userId, intent, context);
        break;
        
      case 'search_notes':
        response = await handleSearchNotes(userId, intent, context);
        break;
        
      case 'update_note':
        response = await handleUpdateNote(userId, intent, context);
        break;
        
      case 'math':
        response = await handleMath(userId, intent);
        break;
        
      case 'small_talk':
        response = await handleSmallTalk(userId, processedMessage, intent, userContext);
        break;
        
      case 'help':
        response = await handleHelp(userContext);
        break;
        
      case 'unknown':
        response = await handleUnknown(userId, processedMessage, userContext);
        break;
        
      default:
        response = formatChattyFallback(processedMessage, { lastAction });
    }
    
    // Update context with action
    updateContext(userId, { 
      action: action,
      project: context.projectId,
      channel: context.channelId,
      deal: context.dealId
    });
    
    return res.json({
      success: true,
      ...response
    });
    
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({
      success: false,
      ...formatError(error.message || 'Internal server error')
    });
  }
});

/**
 * Handle task creation
 */
async function handleCreateTasks(userId, intent, context) {
  let tasksToCreate = intent.tasks || [];
  
  // NEW: support simple single-task creation via entities.*
  if (tasksToCreate.length === 0 && intent.entities?.title) {
    const e = intent.entities;
    tasksToCreate = [{
      title: e.title,
      description: e.description || '',
      priority: e.priority || 'medium',
      assignee: e.person || null,
      dueDate: e.datetime || null,
      project: e.project || null
    }];
  }
  
  if (tasksToCreate.length === 0) {
    return formatError('No tasks specified to create');
  }
  
  const createdTasks = createTasks(userId, tasksToCreate, context);
  
  // Update context with task IDs
  updateContext(userId, {
    taskIds: createdTasks.map(t => t.id)
  });
  
  return formatTaskCreated(createdTasks, context);
}

/**
 * Handle show/list tasks with filtering and sorting
 */
async function handleListTasks(userId, intent, context, userContext) {
  const filters = { status: 'pending' }; // Default to pending tasks
  
  // Apply assignee filter from entities.person
  if (intent.entities && intent.entities.person) {
    filters.assignee = intent.entities.person;
  }
  
  // Apply priority filter
  if (intent.entities && intent.entities.priority) {
    filters.priority = intent.entities.priority;
  }
  
  // Apply project filter
  if (context.projectId) {
    filters.projectId = context.projectId;
  }
  
  // Apply sorting - check for sortBy (not sort_by)
  if (intent.entities && intent.entities.sortBy) {
    filters.sortBy = intent.entities.sortBy;
  }
  
  const tasks = getTasks(userId, filters);
  
  // Update context with full task list for future reference
  updateContext(userId, {
    taskList: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority })),
    taskIds: tasks.map(t => t.id),
    action: 'list_tasks'
  });
  
  return formatTaskList(tasks, { ...context, filters: intent.entities });
}

/**
 * Handle complete task
 */
async function handleCompleteTask(userId, intent, userContext) {
  // Get task_ref from entities (could be a title, numeric index, or "all")
  const taskRef = intent.entities?.task_ref;
  const lastTaskList = userContext.lastTaskList || [];
  
  // Resolve the task reference to actual task IDs
  const taskIds = resolveTaskRef(userId, taskRef, lastTaskList);
  
  if (taskIds.length === 0) {
    // Provide helpful error message based on context
    if (!taskRef && lastTaskList.length === 0) {
      return {
        message: '❌ No tasks to complete. Please list your tasks first or specify which task to complete.',
        structured: { type: 'error', error: 'No tasks in context' }
      };
    } else if (taskRef && typeof taskRef === 'string') {
      return {
        message: `❌ Could not find a task matching "${taskRef}". Try listing your tasks first.`,
        structured: { type: 'error', error: 'Task not found' }
      };
    } else {
      return {
        message: '❌ Could not find that task. Please list your tasks first or specify which task to complete.',
        structured: { type: 'error', error: 'Task not found' }
      };
    }
  }
  
  const result = completeTasks(userId, taskIds);
  
  if (result.completed > 0) {
    // Update context
    updateContext(userId, { action: 'complete_task' });
    
    return {
      message: `✅ Marked ${result.completed} task${result.completed > 1 ? 's' : ''} as complete! 🎉`,
      structured: { type: 'tasks_completed', count: result.completed }
    };
  } else {
    return {
      message: '❌ Could not complete the task. It may not exist or is already completed.',
      structured: { type: 'error', error: 'Task not found' }
    };
  }
}

/**
 * Handle update task priority
 */
async function handleUpdatePriority(userId, intent, userContext) {
  // Get task_ref and priority from entities
  const taskRef = intent.entities?.task_ref;
  const newPriority = intent.entities?.priority;
  const lastTaskList = userContext.lastTaskList || [];
  
  if (!newPriority) {
    return {
      message: '❌ Please specify a priority: high, medium, or low.',
      structured: { type: 'error', error: 'No priority specified' }
    };
  }
  
  // Resolve the task reference to actual task IDs
  const taskIds = resolveTaskRef(userId, taskRef, lastTaskList);
  
  if (taskIds.length === 0) {
    // Provide helpful error message
    if (!taskRef && lastTaskList.length === 0) {
      return {
        message: '❌ No task found. Please list your tasks first or specify which task to update.',
        structured: { type: 'error', error: 'No task specified' }
      };
    } else if (taskRef && typeof taskRef === 'string') {
      return {
        message: `❌ Could not find a task matching "${taskRef}". Try listing your tasks first.`,
        structured: { type: 'error', error: 'Task not found' }
      };
    } else {
      return {
        message: '❌ Could not find that task. Please list your tasks first or specify which task to update.',
        structured: { type: 'error', error: 'Task not found' }
      };
    }
  }
  
  // Update priority of the first resolved task
  const result = updateTaskPriority(userId, taskIds[0], newPriority);
  
  if (result.updated > 0) {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };
    
    // Update context
    updateContext(userId, { action: 'update_priority' });
    
    return {
      message: `✅ Updated task priority!\n\n📝 ${result.task.title}\n${priorityEmoji[result.oldPriority]} ${result.oldPriority.toUpperCase()} → ${priorityEmoji[result.newPriority]} ${result.newPriority.toUpperCase()}`,
      structured: { 
        type: 'priority_updated', 
        taskId: taskIds[0],
        oldPriority: result.oldPriority,
        newPriority: result.newPriority
      }
    };
  } else {
    return {
      message: `❌ ${result.error}`,
      structured: { type: 'error', error: result.error }
    };
  }
}

/**
 * Handle delete task
 */
async function handleDeleteTask(userId, intent, userContext) {
  // Get task_ref from entities (could be "all", a title, or numeric index)
  const taskRef = intent.entities?.task_ref;
  const lastTaskList = userContext.lastTaskList || [];
  
  // Special case: "delete all" - use deleteAllTasks for efficiency
  if (taskRef === 'all' || taskRef === 'everything') {
    const count = deleteAllTasks(userId);
    
    if (count === 0) {
      return {
        message: '❌ No tasks to delete. You don\'t have any tasks yet.',
        structured: { type: 'error', error: 'No tasks found' }
      };
    }
    
    // Clear context since we deleted everything
    updateContext(userId, { taskList: [], taskIds: [], action: 'delete_task' });
    
    return {
      message: `🗑️ Deleted all ${count} task${count > 1 ? 's' : ''}!`,
      structured: { type: 'tasks_deleted', count: count }
    };
  }
  
  // Resolve the task reference to actual task IDs
  const taskIds = resolveTaskRef(userId, taskRef, lastTaskList);
  
  if (taskIds.length === 0) {
    // Provide helpful error message based on context
    if (!taskRef && lastTaskList.length === 0) {
      return {
        message: '❌ No tasks to delete. Please list your tasks first or specify which task to delete.',
        structured: { type: 'error', error: 'No tasks in context' }
      };
    } else if (taskRef && typeof taskRef === 'string') {
      return {
        message: `❌ Could not find a task matching "${taskRef}". Try listing your tasks first.`,
        structured: { type: 'error', error: 'Task not found' }
      };
    } else {
      return {
        message: '❌ Could not find that task. Please list your tasks first or specify which task to delete.',
        structured: { type: 'error', error: 'Task not found' }
      };
    }
  }
  
  // Delete the resolved tasks
  const result = deleteTasks(userId, taskIds);
  
  if (result.deleted > 0) {
    // Update context - remove deleted task IDs
    const remainingIds = userContext.lastTaskIds?.filter(id => !taskIds.includes(id)) || [];
    const remainingList = lastTaskList.filter(t => !taskIds.includes(t.id));
    
    updateContext(userId, { 
      taskList: remainingList,
      taskIds: remainingIds,
      action: 'delete_task'
    });
    
    return {
      message: `🗑️ Deleted ${result.deleted} task${result.deleted > 1 ? 's' : ''}!`,
      structured: { type: 'tasks_deleted', count: result.deleted }
    };
  } else {
    return {
      message: '❌ Could not delete any tasks. They may have already been deleted.',
      structured: { type: 'error', error: 'Tasks not found' }
    };
  }
}

/**
 * Handle small talk
 */
async function handleSmallTalk(userId, message, intent, userContext) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for time/date questions
  if (/what time|time is it/i.test(lowerMessage)) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      message: `🕐 Current server time is **${timeString}**.\n\nNeed to schedule a task? Try: "create a task for 3pm tomorrow"`,
      structured: { type: 'time_info', time: timeString }
    };
  }
  
  if (/what day|what.*date|today/i.test(lowerMessage)) {
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      message: `📅 Today is **${dateString}**.\n\nWant to see what's urgent? Try: "show urgent tasks"`,
      structured: { type: 'date_info', date: dateString }
    };
  }
  
  // Greetings - short version (not the full help)
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|sup|yo)\b/i.test(lowerMessage)) {
    const greetings = ['👋 Hey there!', '👋 Hello!', '👋 Hi!'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Check if this is first interaction
    const isFirstTime = !userContext.lastActions || userContext.lastActions.length === 0;
    
    if (isFirstTime) {
      return {
        message: `${greeting} I'm FlowState CLI.\n\n**Quick start:**\n• "create a task to [description]"\n• "note: [your content]"\n• "show my tasks"\n• "help" for full guide`,
        structured: { type: 'greeting', firstTime: true }
      };
    } else {
      return {
        message: `${greeting} What can I help with?\n\n💡 Try: "show tasks" or "create a task"`,
        structured: { type: 'greeting', firstTime: false }
      };
    }
  }
  
  // Thanks
  if (/^(thanks|thank you|thx|ty|appreciate|cheers)/i.test(lowerMessage)) {
    return {
      message: `You're welcome! 😊\n\nAnything else I can help with?`,
      structured: { type: 'acknowledgment' }
    };
  }
  
  // "What is priority?" or concept questions
  if (/what is|what are|define|explain/i.test(lowerMessage)) {
    // Use reply_hint from Groq if available
    if (intent.reply_hint) {
      return {
        message: `💡 ${intent.reply_hint}\n\nNeed help organizing your tasks? Try: "show tasks sorted by priority"`,
        structured: { type: 'explanation' }
      };
    }
    
    // Fallback explanations
    if (/priority/i.test(lowerMessage)) {
      return {
        message: `💡 **Priority** helps you focus on what matters most:\n\n🔴 **High** - Urgent, needs immediate attention\n🟡 **Medium** - Important but not urgent\n🟢 **Low** - Nice to have, can wait\n\nTry: "show urgent tasks" or "re-arrange tasks by priority"`,
        structured: { type: 'explanation', topic: 'priority' }
      };
    }
  }
  
  // Generic small talk response
  const defaultResponses = [
    "I'm here to help you manage tasks and notes! What would you like to do?",
    "Let's get productive! Try creating a task or listing your current work.",
    "Ready to organize your work? I can help with tasks, notes, and focus sessions."
  ];
  
  const replyMessage = intent.reply_hint || defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  
  return {
    message: `💬 ${replyMessage}\n\n💡 Quick tip: Say "help" to see all I can do!`,
    structured: { type: 'small_talk' }
  };
}

/**
 * Handle unknown/unrecognized input
 */
async function handleUnknown(userId, message, userContext) {
  const lastAction = userContext.lastAction || null;
  
  // Short contextual hint instead of full help
  let hint = '🤔 I\'m not sure what you mean.\n\n';
  
  if (lastAction === 'list_tasks') {
    hint += '**Since you just viewed tasks, try:**\n';
    hint += '• "complete [task name]"\n';
    hint += '• "delete existing tasks"\n';
    hint += '• "re-arrange by priority"';
  } else if (lastAction === 'create_task') {
    hint += '**You just created tasks. Try:**\n';
    hint += '• "show my tasks"\n';
    hint += '• "start focus mode"\n';
    hint += '• "what\'s urgent?"';
  } else {
    hint += '**I mainly help with:**\n';
    hint += '📋 Tasks - "create task", "show tasks", "complete task"\n';
    hint += '📝 Notes - "note: [content]", "list notes"\n';
    hint += '⏰ Focus - "start focus for 25 minutes"\n\n';
    hint += '💡 Say "help" for the full guide!';
  }
  
  return {
    message: hint,
    structured: { type: 'fallback', userMessage: message }
  };
}

/**
 * Handle show urgent tasks
 */
async function handleShowUrgent(userId, context) {
  const urgentTasks = getUrgentTasks(userId);
  
  return formatUrgentSummary(urgentTasks);
}

/**
 * Handle focus mode
 */
async function handleFocus(userId, intent, context) {
  // Check if already in focus
  const currentFocus = getCurrentFocus(userId);
  
  if (currentFocus) {
    return {
      message: `⏰ You're already in focus mode working on: ${currentFocus.taskTitle}`,
      structured: { type: 'focus_active', focus: currentFocus }
    };
  }
  
  // Extract duration from query if it's a number (e.g., "/f 25")
  let duration = 25; // default
  
  if (intent.query && /^\d+$/.test(intent.query.trim())) {
    duration = parseInt(intent.query.trim(), 10);
  } else if (intent.entities && intent.entities.duration) {
    duration = intent.entities.duration;
  }
  
  // Validate duration
  if (duration < 1 || duration > 120) {
    return {
      message: '⏰ Focus duration should be between 1 and 120 minutes.\n\nTry: "start focus for 25 minutes" or "/f 25"',
      structured: { type: 'error', error: 'Invalid duration' }
    };
  }
  
  // Get task to focus on
  let taskId = intent.entities && intent.entities.taskId;
  
  if (!taskId) {
    // Use last created task or first urgent task
    const urgentTasks = getUrgentTasks(userId);
    if (urgentTasks.length > 0) {
      taskId = urgentTasks[0].id;
    } else {
      const allTasks = getTasks(userId, { status: 'pending' });
      if (allTasks.length > 0) {
        taskId = allTasks[0].id;
      }
    }
  }
  
  if (!taskId) {
    return {
      message: '❌ No tasks available to focus on.\n\nCreate a task first! Try: "create a task to review code"',
      structured: { type: 'error', error: 'No tasks found' }
    };
  }
  
  const focusSession = startFocus(userId, taskId, duration);
  
  if (!focusSession) {
    return formatError('Could not start focus session');
  }
  
  // Find the task details
  const allTasks = getTasks(userId);
  const task = allTasks.find(t => t.id === taskId);
  
  return formatFocusStart(task, duration);
}

/**
 * Handle create note
 */
async function handleCreateNote(userId, intent, context) {
  const notesToCreate = intent.notes || [];
  
  if (notesToCreate.length === 0) {
    // Fallback: try to create from query or message
    if (intent.query) {
      notesToCreate.push({
        title: intent.query.substring(0, 100),
        body: intent.query.length > 100 ? intent.query : ''
      });
    } else {
      return formatError('No note content specified');
    }
  }
  
  const createdNotes = [];
  
  for (const noteData of notesToCreate) {
    const note = createNote(userId, {
      title: noteData.title,
      body: noteData.body || '',
      tags: noteData.tags || [],
      context
    });
    createdNotes.push(note);
  }
  
  // Update context with note IDs
  updateContext(userId, {
    noteIds: createdNotes.map(n => n.id)
  });
  
  return formatNoteCreated(createdNotes[0], context);
}

/**
 * Handle list notes
 */
async function handleListNotes(userId, intent, context) {
  const filters = {};
  
  if (context.projectId) {
    filters.projectId = context.projectId;
  }
  
  if (intent.entities && intent.entities.tag) {
    filters.tag = intent.entities.tag;
  }
  
  const notes = listNotes(userId, filters);
  
  return formatNoteList(notes, context);
}

/**
 * Handle search notes
 */
async function handleSearchNotes(userId, intent, context) {
  const query = intent.query || '';
  const notes = searchNotes(userId, query);
  
  return formatNoteList(notes, { ...context, searchQuery: query });
}

/**
 * Handle update note
 */
async function handleUpdateNote(userId, intent, context) {
  const lastNote = getLastNote(userId);
  
  if (!lastNote) {
    return formatError('No recent note to update. Create a note first!');
  }
  
  const patch = {};
  
  if (intent.entities && intent.entities.appendContent) {
    patch.appendBody = intent.entities.appendContent;
  } else if (intent.query) {
    patch.appendBody = intent.query;
  }
  
  const updatedNote = updateNote(userId, lastNote.id, patch);
  
  if (!updatedNote) {
    return formatError('Could not update note');
  }
  
  return {
    message: `✅ Updated note: "${updatedNote.title}"\n\n${updatedNote.body}`,
    structured: { type: 'note_updated', noteId: updatedNote.id }
  };
}

/**
 * Handle math expressions
 */
async function handleMath(userId, intent) {
  // Check if entities has numbers and operation
  if (!intent.entities || !intent.entities.numbers || !intent.entities.operation) {
    return formatError('No math expression detected');
  }
  
  const numbers = intent.entities.numbers;
  const operation = intent.entities.operation;
  
  try {
    let result;
    let operatorSymbol;
    
    // Perform calculation based on operation
    switch (operation) {
      case 'addition':
      case 'add':
      case 'plus':
        result = numbers.reduce((a, b) => a + b, 0);
        operatorSymbol = '+';
        break;
        
      case 'subtraction':
      case 'subtract':
      case 'minus':
        result = numbers.length > 0 ? numbers.slice(1).reduce((a, b) => a - b, numbers[0]) : 0;
        operatorSymbol = '-';
        break;
        
      case 'multiplication':
      case 'multiply':
      case 'times':
        result = numbers.reduce((a, b) => a * b, 1);
        operatorSymbol = '×';
        break;
        
      case 'division':
      case 'divide':
        result = numbers.length > 0 ? numbers.slice(1).reduce((a, b) => a / b, numbers[0]) : 0;
        operatorSymbol = '÷';
        break;
        
      default:
        throw new Error('Unsupported operation: ' + operation);
    }
    
    if (!isFinite(result)) {
      throw new Error('Result is not a valid number');
    }
    
    // Build expression string
    const expr = numbers.join(` ${operatorSymbol} `);
    
    return formatMathResult(expr, result);
  } catch (error) {
    console.error('[Math] Calculation error:', error);
    return {
      message: `I tried to calculate but got an error. 🤔\n\nI can help with simple math like:\n• "calculate 5 + 3"\n• "add 100 and 50"\n• "multiply 12 by 5"\n\nOr I can help you create tasks and notes instead!`,
      structured: { type: 'math_error', operation }
    };
  }
}

/**
 * Handle help command - provide usage guide
 */
async function handleHelp(userContext) {
  const helpMessage = `📖 **FlowState CLI Help Guide**

**📋 Task Management**
• Create: "create a task to [description]"
  - With person: "create task for [name] to [description]"
  - With priority: "create a high priority task to [description]"
  - With date: "create a task to [description] tomorrow"
  - Multiple: "create 3 tasks: [task1], [task2], [task3]"

• List: "show my tasks" or "list all tasks"
  - Filter: "show tasks for [person]"
  - By priority: "show high priority tasks"
  - Sort: "re-arrange tasks by priority"

• Complete: "complete [task name]" or "mark [task] as done"
• Delete: "delete [task name]" or "delete all tasks"
• Priority: "make [task] high priority"

**📝 Notes**
• Create: "note: [your content]" or "/n [content]"
• List: "list my notes" or "show notes"
• Search: "search notes for [keyword]"

**⏰ Focus Mode**
• Start: "start focus for 25 minutes" or "/f 25"
• Check: "am I in focus?"

**🔢 Quick Math**
• "calculate 100 + 50"
• "add 5094 and 3776"
• "multiply 12 by 5"

**💬 General**
• "what time is it?"
• "what day is today?"
• "what is priority?" - explain concepts

**📌 Shortcuts**
• /t [message] - Force task mode
• /n [message] - Force note mode
• /f [minutes] - Start focus session

**💡 Pro Tips:**
- Reference tasks by name or number from list
- Use "delete all" to clear everything
- Tasks are sortable by priority (high/medium/low)
- Assign tasks to team members by name

Need more help? Just ask me anything! 😊`;

  return {
    message: helpMessage,
    structured: { type: 'help' }
  };
}

/**
 * Handle follow-up commands
 */
async function handleFollowUp(userId, message, lastAction, context, res) {
  console.log(`[Webhook] Follow-up detected. Last action: ${lastAction}`);
  
  switch (lastAction) {
    case 'create_task':
      // User wants to add another task
      const lastTask = getLastTask(userId);
      if (lastTask) {
        // Create similar task
        const newTask = createTasks(userId, [{
          title: message.replace(/add (another|one more|more)/i, '').trim() || 'Follow-up task',
          description: '',
          priority: lastTask.priority
        }], context);
        
        updateContext(userId, { taskIds: [newTask[0].id] });
        
        return res.json({
          success: true,
          ...formatTaskCreated(newTask, context)
        });
      }
      break;
      
    case 'create_note':
      // User wants to add to last note
      const lastNote = getLastNote(userId);
      if (lastNote) {
        const content = message.replace(/add to (last )?note:?/i, '').trim();
        const updated = updateNote(userId, lastNote.id, { appendBody: content });
        
        return res.json({
          success: true,
          message: `✅ Added to note: "${updated.title}"`,
          structured: { type: 'note_updated', noteId: updated.id }
        });
      }
      break;
      
    case 'show_tasks':
    case 'list_tasks':
      // Show tasks again
      const tasks = getTasks(userId, context.projectId ? { projectId: context.projectId } : {});
      return res.json({
        success: true,
        ...formatTaskList(tasks, context)
      });
      
    case 'list_notes':
      // Show notes again
      const notes = listNotes(userId, context.projectId ? { projectId: context.projectId } : {});
      return res.json({
        success: true,
        ...formatNoteList(notes, context)
      });
  }
  
  // Fallback: treat as new command
  return null;
}

module.exports = router;
