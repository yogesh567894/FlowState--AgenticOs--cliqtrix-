/**
 * Focus Service
 * Manage focus blocks and productivity sessions
 */

const { loadUsers, saveUsers } = require('../utils/userManager');

/**
 * Start a focus session
 */
function startFocus(userId, taskId, duration = 25) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user) {
    return null;
  }
  
  const task = user.tasks && user.tasks.find(t => t.id === taskId);
  
  if (!task) {
    return null;
  }
  
  const focusSession = {
    taskId,
    taskTitle: task.title,
    startTime: new Date().toISOString(),
    duration,
    endTime: new Date(Date.now() + duration * 60 * 1000).toISOString()
  };
  
  if (!user.context) {
    user.context = {};
  }
  
  user.context.currentFocus = focusSession;
  saveUsers(users);
  
  console.log(`[Focus] Started focus session for task ${taskId}, duration ${duration} minutes`);
  
  return focusSession;
}

/**
 * Get current focus session
 */
function getCurrentFocus(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.context || !user.context.currentFocus) {
    return null;
  }
  
  const focus = user.context.currentFocus;
  const now = new Date();
  const endTime = new Date(focus.endTime);
  
  if (now > endTime) {
    // Focus session ended
    return null;
  }
  
  return focus;
}

/**
 * End focus session
 */
function endFocus(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.context || !user.context.currentFocus) {
    return false;
  }
  
  const focusSession = user.context.currentFocus;
  user.context.currentFocus = null;
  saveUsers(users);
  
  console.log(`[Focus] Ended focus session for task ${focusSession.taskId}`);
  
  return focusSession;
}

module.exports = {
  startFocus,
  getCurrentFocus,
  endFocus
};
