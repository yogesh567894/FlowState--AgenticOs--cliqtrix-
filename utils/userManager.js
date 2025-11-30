/**
 * User Manager
 * Handles user data persistence
 * Uses in-memory storage for serverless environments (Vercel)
 * Falls back to file storage for local development
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const IS_SERVERLESS = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.HOME;

// In-memory storage for serverless environments
let memoryStore = {};

/**
 * Check if running in serverless environment
 */
function isServerless() {
  return IS_SERVERLESS;
}

/**
 * Load users from file or memory
 */
function loadUsers() {
  // Use memory storage in serverless environment
  if (isServerless()) {
    console.log('[User Manager] Using in-memory storage (serverless mode)');
    return memoryStore;
  }
  
  // Use file storage in local environment
  try {
    if (!fs.existsSync(USERS_FILE)) {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Initialize with empty users object
      fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
      return {};
    }
    
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[User Manager] Error loading users, using memory fallback:', error.message);
    return memoryStore;
  }
}

/**
 * Save users to file or memory
 */
function saveUsers(users) {
  // Use memory storage in serverless environment
  if (isServerless()) {
    memoryStore = users;
    return true;
  }
  
  // Use file storage in local environment
  try {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('[User Manager] Error saving users, using memory fallback:', error.message);
    memoryStore = users;
    return false;
  }
}

/**
 * Get user by ID
 */
function getUser(userId) {
  const users = loadUsers();
  return users[userId] || null;
}

/**
 * Update user
 */
function updateUser(userId, userData) {
  const users = loadUsers();
  users[userId] = {
    ...users[userId],
    ...userData,
    id: userId,
    updatedAt: new Date().toISOString()
  };
  saveUsers(users);
  return users[userId];
}

module.exports = {
  loadUsers,
  saveUsers,
  getUser,
  updateUser
};
