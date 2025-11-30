/**
 * Context Manager
 * Manages per-user conversation context, history, and state
 */

const { loadUsers, saveUsers } = require('../utils/userManager');

/**
 * Initialize user context if it doesn't exist
 */
function initializeContext(userId) {
  const users = loadUsers();
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      tasks: [],
      notes: [],
      context: {
        lastMessages: [],
        lastActions: [],
        lastTaskIds: [],
        lastNoteIds: [],
        lastTaskList: [],
        lastProject: null,
        lastChannel: null,
        lastDeal: null,
        currentFocus: null
      },
      createdAt: new Date().toISOString()
    };
    saveUsers(users);
  } else if (!users[userId].context) {
    // Add context to existing user
    users[userId].context = {
      lastMessages: [],
      lastActions: [],
      lastTaskIds: [],
      lastNoteIds: [],
      lastTaskList: [],
      lastProject: null,
      lastChannel: null,
      lastDeal: null,
      currentFocus: null
    };
    saveUsers(users);
  }
  
  return users[userId];
}

/**
 * Update user context after an action
 */
function updateContext(userId, updates) {
  const users = loadUsers();
  let user = users[userId];
  
  if (!user) {
    user = initializeContext(userId);
  }
  
  if (!user.context) {
    user.context = {
      lastMessages: [],
      lastActions: [],
      lastTaskIds: [],
      lastNoteIds: [],
      lastTaskList: [],
      lastProject: null,
      lastChannel: null,
      lastDeal: null,
      currentFocus: null
    };
  }
  
  if (updates.message) {
    if (!Array.isArray(user.context.lastMessages)) {
      user.context.lastMessages = [];
    }
    user.context.lastMessages.push({
      text: updates.message,
      timestamp: new Date().toISOString()
    });
    // Keep only last 5 messages
    if (user.context.lastMessages.length > 5) {
      user.context.lastMessages = user.context.lastMessages.slice(-5);
    }
  }
  
  if (updates.action) {
    if (!Array.isArray(user.context.lastActions)) {
      user.context.lastActions = [];
    }
    user.context.lastActions.push({
      action: updates.action,
      timestamp: new Date().toISOString()
    });
    // Keep only last 3 actions
    if (user.context.lastActions.length > 3) {
      user.context.lastActions = user.context.lastActions.slice(-3);
    }
  }
  
  if (updates.taskIds && Array.isArray(updates.taskIds)) {
    if (!Array.isArray(user.context.lastTaskIds)) {
      user.context.lastTaskIds = [];
    }
    user.context.lastTaskIds.push(...updates.taskIds);
    // Keep only last 10 task IDs
    if (user.context.lastTaskIds.length > 10) {
      user.context.lastTaskIds = user.context.lastTaskIds.slice(-10);
    }
  }
  
  if (updates.noteIds && Array.isArray(updates.noteIds)) {
    if (!Array.isArray(user.context.lastNoteIds)) {
      user.context.lastNoteIds = [];
    }
    user.context.lastNoteIds.push(...updates.noteIds);
    // Keep only last 10 note IDs
    if (user.context.lastNoteIds.length > 10) {
      user.context.lastNoteIds = user.context.lastNoteIds.slice(-10);
    }
  }
  
  if (updates.taskList && Array.isArray(updates.taskList)) {
    user.context.lastTaskList = updates.taskList;
  }
  
  if (updates.project !== undefined) {
    user.context.lastProject = updates.project;
  }
  
  if (updates.channel !== undefined) {
    user.context.lastChannel = updates.channel;
  }
  
  if (updates.deal !== undefined) {
    user.context.lastDeal = updates.deal;
  }
  
  if (updates.focus !== undefined) {
    user.context.currentFocus = updates.focus;
  }
  
  users[userId] = user;
  saveUsers(users);
  
  return user.context;
}

/**
 * Get user context
 */
function getContext(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.context) {
    return initializeContext(userId).context;
  }
  
  return user.context;
}

/**
 * Get last action for follow-up handling
 */
function getLastAction(userId) {
  const context = getContext(userId);
  const actions = context.lastActions || [];
  return actions.length > 0 ? actions[actions.length - 1].action : null;
}

/**
 * Get last task IDs
 */
function getLastTaskIds(userId) {
  const context = getContext(userId);
  return context.lastTaskIds || [];
}

/**
 * Get last note IDs
 */
function getLastNoteIds(userId) {
  const context = getContext(userId);
  return context.lastNoteIds || [];
}

/**
 * Get last task
 */
function getLastTask(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks || user.tasks.length === 0) {
    return null;
  }
  
  return user.tasks[user.tasks.length - 1];
}

/**
 * Get last note
 */
function getLastNote(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.notes || user.notes.length === 0) {
    return null;
  }
  
  return user.notes[user.notes.length - 1];
}

/**
 * Get current project context
 */
function getCurrentProject(userId) {
  const context = getContext(userId);
  return context.lastProject;
}

/**
 * Get current channel context
 */
function getCurrentChannel(userId) {
  const context = getContext(userId);
  return context.lastChannel;
}

/**
 * Check if user is in a follow-up scenario
 */
function isFollowUp(message) {
  const followUpPatterns = [
    /add\s+(another|one more|more)/i,
    /show\s+(them|it)\s+again/i,
    /same\s+(project|channel)/i,
    /continue/i,
    /yes/i,
    /^more$/i,
    /^again$/i,
    /^same$/i
  ];
  
  return followUpPatterns.some(pattern => pattern.test(message.trim()));
}

/**
 * Detect context from message (project, channel, deal references)
 */
function detectContextFromMessage(message) {
  const context = {};
  
  // Detect project mentions
  const projectMatch = message.match(/project\s+([a-zA-Z0-9_-]+)/i) || 
                       message.match(/#([a-zA-Z0-9_-]+)/);
  if (projectMatch) {
    context.project = projectMatch[1];
  }
  
  // Detect channel mentions
  const channelMatch = message.match(/channel\s+([a-zA-Z0-9_-]+)/i);
  if (channelMatch) {
    context.channel = channelMatch[1];
  }
  
  // Detect deal mentions
  const dealMatch = message.match(/deal\s+([a-zA-Z0-9_-]+)/i);
  if (dealMatch) {
    context.deal = dealMatch[1];
  }
  
  return context;
}

module.exports = {
  initializeContext,
  updateContext,
  getContext,
  getLastAction,
  getLastTaskIds,
  getLastNoteIds,
  getLastTask,
  getLastNote,
  getCurrentProject,
  getCurrentChannel,
  isFollowUp,
  detectContextFromMessage
};
