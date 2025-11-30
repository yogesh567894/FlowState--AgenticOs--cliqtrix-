/**
 * Tasks Service
 * Task management operations
 */

const { loadUsers, saveUsers } = require('../utils/userManager');

/**
 * Create tasks for a user
 */
function createTasks(userId, tasks, context = {}) {
  const users = loadUsers();
  
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      tasks: [],
      notes: [],
      context: {}
    };
  }
  
  if (!users[userId].tasks) {
    users[userId].tasks = [];
  }
  
  const createdTasks = [];
  
  for (const taskData of tasks) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      status: 'pending',
      assignee: taskData.assignee || null,
      dueDate: taskData.dueDate || null,
      context: {
        projectId: context.projectId || null,
        channelId: context.channelId || null,
        dealId: context.dealId || null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users[userId].tasks.push(task);
    createdTasks.push(task);
  }
  
  saveUsers(users);
  
  console.log(`[Tasks] Created ${createdTasks.length} tasks for user ${userId}`);
  
  return createdTasks;
}

/**
 * Get all tasks for a user
 */
function getTasks(userId, filters = {}) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return [];
  }
  
  let tasks = [...user.tasks];
  
  // Apply filters
  if (filters.status) {
    tasks = tasks.filter(t => t.status === filters.status);
  }
  
  if (filters.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority);
  }
  
  if (filters.assignee) {
    tasks = tasks.filter(t => {
      if (!t.assignee) return false;
      return t.assignee.toLowerCase().includes(filters.assignee.toLowerCase());
    });
  }
  
  if (filters.projectId) {
    tasks = tasks.filter(t => t.context && t.context.projectId === filters.projectId);
  }
  
  if (filters.channelId) {
    tasks = tasks.filter(t => t.context && t.context.channelId === filters.channelId);
  }
  
  // Apply sorting
  if (filters.sortBy) {
    switch (filters.sortBy) {
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'dueDate':
        tasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case 'title':
        tasks.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
  }
  
  return tasks;
}

/**
 * Get urgent tasks (high priority, pending)
 */
function getUrgentTasks(userId) {
  return getTasks(userId, { status: 'pending', priority: 'high' });
}

/**
 * Update task status
 */
function updateTaskStatus(userId, taskId, status) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return null;
  }
  
  const task = user.tasks.find(t => t.id === taskId);
  
  if (!task) {
    return null;
  }
  
  task.status = status;
  task.updatedAt = new Date().toISOString();
  
  saveUsers(users);
  
  console.log(`[Tasks] Updated task ${taskId} status to ${status}`);
  
  return task;
}

/**
 * Delete task
 */
function deleteTask(userId, taskId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return false;
  }
  
  const taskIndex = user.tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return false;
  }
  
  user.tasks.splice(taskIndex, 1);
  saveUsers(users);
  
  console.log(`[Tasks] Deleted task ${taskId}`);
  
  return true;
}

/**
 * Delete multiple tasks
 */
function deleteTasks(userId, taskIds) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return { deleted: 0, failed: taskIds.length };
  }
  
  let deletedCount = 0;
  
  for (const taskId of taskIds) {
    const taskIndex = user.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      user.tasks.splice(taskIndex, 1);
      deletedCount++;
    }
  }
  
  saveUsers(users);
  
  console.log(`[Tasks] Deleted ${deletedCount}/${taskIds.length} tasks for user ${userId}`);
  
  return { deleted: deletedCount, failed: taskIds.length - deletedCount };
}

/**
 * Complete multiple tasks
 */
function completeTasks(userId, taskIds) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return { completed: 0, failed: taskIds.length };
  }
  
  let completedCount = 0;
  
  for (const taskId of taskIds) {
    const task = user.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.updatedAt = new Date().toISOString();
      completedCount++;
    }
  }
  
  saveUsers(users);
  
  console.log(`[Tasks] Completed ${completedCount}/${taskIds.length} tasks for user ${userId}`);
  
  return { completed: completedCount, failed: taskIds.length - completedCount };
}

/**
 * Find task by title (fuzzy match)
 */
function findTaskByTitle(userId, titleQuery) {
  const tasks = getTasks(userId, { status: 'pending' });
  
  if (!titleQuery) {
    return null;
  }
  
  const lowerQuery = titleQuery.toLowerCase();
  
  // Exact match first
  let task = tasks.find(t => t.title.toLowerCase() === lowerQuery);
  
  if (!task) {
    // Partial match
    task = tasks.find(t => t.title.toLowerCase().includes(lowerQuery));
  }
  
  return task;
}

/**
 * Resolve task reference to task ID(s)
 * Handles: numeric index, title string, "all", or context-based resolution
 * 
 * @param {string} userId - User ID
 * @param {string|number} taskRef - Task reference from entities.task_ref
 * @param {Array} lastTaskList - Last listed tasks from context
 * @returns {Array} Array of task IDs, or empty array if none found
 */
function resolveTaskRef(userId, taskRef, lastTaskList = []) {
  // Handle "all" - return all user's pending tasks
  if (taskRef === 'all' || taskRef === 'everything') {
    const allTasks = getTasks(userId, { status: 'pending' });
    return allTasks.map(t => t.id);
  }
  
  // Handle numeric index (1-based) from last task list
  if (typeof taskRef === 'number' || /^\d+$/.test(taskRef)) {
    const index = parseInt(taskRef, 10) - 1; // Convert to 0-based
    if (lastTaskList && lastTaskList[index]) {
      return [lastTaskList[index].id];
    }
    return []; // Index out of range
  }
  
  // Handle title string - fuzzy match
  if (typeof taskRef === 'string' && taskRef.trim()) {
    const task = findTaskByTitle(userId, taskRef.trim());
    if (task) {
      return [task.id];
    }
  }
  
  // If taskRef is empty/null and we have exactly 1 task in last list, use it
  if (!taskRef && lastTaskList && lastTaskList.length === 1) {
    return [lastTaskList[0].id];
  }
  
  return [];
}

/**
 * Delete all tasks for a user (including pending and completed)
 * Used for "delete all" operations
 */
function deleteAllTasks(userId) {
  const users = loadUsers();
  const user = users[userId];
  
  if (!user || !user.tasks) {
    return 0;
  }
  
  const count = user.tasks.length;
  user.tasks = [];
  saveUsers(users);
  
  console.log(`[Tasks] Deleted all ${count} tasks for user ${userId}`);
  
  return count;
}

/**
 * Update task priority
 */
function updateTaskPriority(userId, taskId, newPriority) {
  const users = loadUsers();
  
  if (!users[userId] || !users[userId].tasks) {
    return { updated: 0, error: 'User or tasks not found' };
  }
  
  const validPriorities = ['high', 'medium', 'low'];
  if (!validPriorities.includes(newPriority.toLowerCase())) {
    return { updated: 0, error: 'Invalid priority. Must be: high, medium, or low' };
  }
  
  const task = users[userId].tasks.find(t => t.id === taskId);
  
  if (!task) {
    return { updated: 0, error: 'Task not found' };
  }
  
  const oldPriority = task.priority;
  task.priority = newPriority.toLowerCase();
  task.updatedAt = new Date().toISOString();
  
  saveUsers(users);
  
  return { 
    updated: 1, 
    task: task,
    oldPriority: oldPriority,
    newPriority: task.priority
  };
}

/**
 * Search tasks
 */
function searchTasks(userId, query) {
  const tasks = getTasks(userId);
  
  if (!query || query.trim() === '') {
    return tasks;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return tasks.filter(task => {
    return (
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery))
    );
  });
}

module.exports = {
  createTasks,
  getTasks,
  getUrgentTasks,
  updateTaskStatus,
  updateTaskPriority,
  deleteTask,
  deleteTasks,
  deleteAllTasks,
  completeTasks,
  findTaskByTitle,
  resolveTaskRef,
  searchTasks
};
