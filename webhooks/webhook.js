/**
 * Webhook Handler
 * Processes incoming requests with token splitting support
 */

const express = require('express');
const { parseIntent } = require('../services/nlp');
const { loadUsers, saveUsers } = require('../utils/userManager');

const router = express.Router();

/**
 * Main webhook endpoint
 * Handles long inputs with automatic chunking and multi-action processing
 */
router.post('/webhook', async (req, res) => {
  try {
    const { message, userId, source } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: message, userId'
      });
    }
    
    console.log(`[Webhook] Received message from user ${userId}: ${message.substring(0, 100)}...`);
    
    // Parse intent with automatic token splitting
    const intent = await parseIntent(message, userId);
    
    console.log(`[Webhook] Parsed intent:`, JSON.stringify(intent, null, 2));
    
    // Handle error responses
    if (intent.action === 'error') {
      return res.json({
        success: false,
        message: intent.message,
        partialProcessing: intent.partialProcessing
      });
    }
    
    // Load user data
    const users = loadUsers();
    if (!users[userId]) {
      users[userId] = {
        id: userId,
        tasks: [],
        pendingActions: []
      };
    }
    
    // Handle multiple actions (from chunked processing)
    if (intent.metadata && intent.metadata.chunked) {
      console.log(`[Webhook] Processing chunked result with ${intent.metadata.chunkCount} chunks`);
    }
    
    // Handle queued tasks (when request is too large)
    if (intent.queue && intent.queue.length > 0) {
      console.log(`[Webhook] Queueing ${intent.queue.length} tasks for later processing`);
      users[userId].pendingActions = intent.queue.map(task => ({
        action: 'create_task',
        task: task,
        queued: true
      }));
      saveUsers(users);
    }
    
    // Execute primary action
    let result;
    
    switch (intent.action) {
      case 'create_task':
        result = await handleCreateTasks(intent, userId, users);
        break;
        
      case 'list_tasks':
        result = handleListTasks(userId, users);
        break;
        
      case 'update_task':
        result = await handleUpdateTask(intent, userId, users);
        break;
        
      case 'delete_task':
        result = await handleDeleteTask(intent, userId, users);
        break;
        
      case 'search':
        result = handleSearch(intent, userId, users);
        break;
        
      default:
        result = {
          success: true,
          message: 'I understood your request but I\'m not sure how to help with that yet.'
        };
    }
    
    // Add warning if tasks were queued
    if (intent.warning) {
      result.warning = intent.warning;
    }
    
    // Include pending actions count in response
    if (users[userId].pendingActions && users[userId].pendingActions.length > 0) {
      result.pendingActions = users[userId].pendingActions.length;
      result.message += ` You have ${result.pendingActions} queued tasks. Say "process queue" to continue.`;
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * Handle task creation (single or batch)
 */
async function handleCreateTasks(intent, userId, users) {
  const tasksToCreate = intent.tasks || [];
  
  if (tasksToCreate.length === 0) {
    return {
      success: false,
      message: 'No tasks specified to create'
    };
  }
  
  console.log(`[Webhook] Creating ${tasksToCreate.length} tasks for user ${userId}`);
  
  const createdTasks = [];
  const failedTasks = [];
  
  // Process tasks in small batches (5 at a time)
  const batchSize = 5;
  for (let i = 0; i < tasksToCreate.length; i += batchSize) {
    const batch = tasksToCreate.slice(i, i + batchSize);
    
    for (const taskData of batch) {
      try {
        const task = {
          id: Date.now() + Math.random(),
          title: taskData.title,
          description: taskData.description || '',
          priority: taskData.priority || 'medium',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        users[userId].tasks.push(task);
        createdTasks.push(task);
      } catch (error) {
        console.error(`[Webhook] Failed to create task: ${taskData.title}`, error);
        failedTasks.push(taskData.title);
      }
    }
    
    // Save after each batch
    saveUsers(users);
  }
  
  let message = `Successfully created ${createdTasks.length} task${createdTasks.length !== 1 ? 's' : ''}`;
  if (failedTasks.length > 0) {
    message += `. Failed to create ${failedTasks.length} task(s).`;
  }
  
  return {
    success: true,
    message,
    tasksCreated: createdTasks.length,
    tasksFailed: failedTasks.length,
    tasks: createdTasks.slice(0, 10) // Return first 10 for display
  };
}

/**
 * Handle task listing
 */
function handleListTasks(userId, users) {
  const userTasks = users[userId].tasks || [];
  
  return {
    success: true,
    message: `You have ${userTasks.length} task${userTasks.length !== 1 ? 's' : ''}`,
    tasks: userTasks
  };
}

/**
 * Handle task update
 */
async function handleUpdateTask(intent, userId, users) {
  const { query, entities } = intent;
  const userTasks = users[userId].tasks || [];
  
  // Simple update logic - can be enhanced
  const taskToUpdate = userTasks.find(t => 
    t.title.toLowerCase().includes(query?.toLowerCase() || '')
  );
  
  if (!taskToUpdate) {
    return {
      success: false,
      message: 'Task not found'
    };
  }
  
  // Update task properties from entities
  if (entities.status) taskToUpdate.status = entities.status;
  if (entities.priority) taskToUpdate.priority = entities.priority;
  if (entities.description) taskToUpdate.description = entities.description;
  
  taskToUpdate.updatedAt = new Date().toISOString();
  
  saveUsers(users);
  
  return {
    success: true,
    message: `Updated task: ${taskToUpdate.title}`,
    task: taskToUpdate
  };
}

/**
 * Handle task deletion
 */
async function handleDeleteTask(intent, userId, users) {
  const { query } = intent;
  const userTasks = users[userId].tasks || [];
  
  const taskIndex = userTasks.findIndex(t => 
    t.title.toLowerCase().includes(query?.toLowerCase() || '')
  );
  
  if (taskIndex === -1) {
    return {
      success: false,
      message: 'Task not found'
    };
  }
  
  const deletedTask = userTasks.splice(taskIndex, 1)[0];
  saveUsers(users);
  
  return {
    success: true,
    message: `Deleted task: ${deletedTask.title}`,
    task: deletedTask
  };
}

/**
 * Handle search
 */
function handleSearch(intent, userId, users) {
  const { query } = intent;
  const userTasks = users[userId].tasks || [];
  
  const results = userTasks.filter(t => 
    t.title.toLowerCase().includes(query?.toLowerCase() || '') ||
    t.description.toLowerCase().includes(query?.toLowerCase() || '')
  );
  
  return {
    success: true,
    message: `Found ${results.length} matching task${results.length !== 1 ? 's' : ''}`,
    tasks: results
  };
}

/**
 * Process pending/queued actions
 */
router.post('/webhook/process-queue', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing userId'
      });
    }
    
    const users = loadUsers();
    const pendingActions = users[userId]?.pendingActions || [];
    
    if (pendingActions.length === 0) {
      return res.json({
        success: true,
        message: 'No pending actions to process'
      });
    }
    
    console.log(`[Webhook] Processing ${pendingActions.length} queued actions`);
    
    // Process queued actions in batches
    const batchSize = 10;
    const processedActions = [];
    
    for (let i = 0; i < Math.min(batchSize, pendingActions.length); i++) {
      const action = pendingActions.shift();
      
      if (action.action === 'create_task') {
        const task = {
          id: Date.now() + Math.random(),
          ...action.task,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        users[userId].tasks.push(task);
        processedActions.push(task);
      }
    }
    
    saveUsers(users);
    
    return res.json({
      success: true,
      message: `Processed ${processedActions.length} queued actions. ${pendingActions.length} remaining.`,
      processed: processedActions.length,
      remaining: pendingActions.length
    });
    
  } catch (error) {
    console.error('[Webhook] Error processing queue:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
