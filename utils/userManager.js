/**
 * User Manager
 * Handles user data persistence
 */

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

/**
 * Load users from file
 */
function loadUsers() {
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
    console.error('[User Manager] Error loading users:', error);
    return {};
  }
}

/**
 * Save users to file
 */
function saveUsers(users) {
  try {
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('[User Manager] Error saving users:', error);
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
