/**
 * Notes Service
 * Notion-lite note management system with context awareness
 */

const fs = require('fs');
const path = require('path');

const NOTES_FILE = path.join(__dirname, '..', 'data', 'notes.json');

/**
 * Load notes from file
 */
function loadNotes() {
  try {
    if (!fs.existsSync(NOTES_FILE)) {
      const dataDir = path.dirname(NOTES_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2));
      return [];
    }
    
    const data = fs.readFileSync(NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[Notes] Error loading notes:', error);
    return [];
  }
}

/**
 * Save notes to file
 */
function saveNotes(notes) {
  try {
    const dataDir = path.dirname(NOTES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
    return true;
  } catch (error) {
    console.error('[Notes] Error saving notes:', error);
    return false;
  }
}

/**
 * Create a new note
 */
function createNote(userId, { title, body = '', tags = [], context = {} }) {
  const notes = loadNotes();
  
  const note = {
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title: title || 'Untitled Note',
    body,
    tags: Array.isArray(tags) ? tags : [],
    context: {
      projectId: context.projectId || null,
      channelId: context.channelId || null,
      dealId: context.dealId || null
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  notes.push(note);
  saveNotes(notes);
  
  console.log(`[Notes] Created note: ${note.id} for user ${userId}`);
  
  return note;
}

/**
 * List notes with optional filters
 */
function listNotes(userId, filters = {}) {
  const notes = loadNotes();
  
  let userNotes = notes.filter(note => note.userId === userId);
  
  // Apply filters
  if (filters.projectId) {
    userNotes = userNotes.filter(note => note.context.projectId === filters.projectId);
  }
  
  if (filters.channelId) {
    userNotes = userNotes.filter(note => note.context.channelId === filters.channelId);
  }
  
  if (filters.dealId) {
    userNotes = userNotes.filter(note => note.context.dealId === filters.dealId);
  }
  
  if (filters.tag) {
    userNotes = userNotes.filter(note => note.tags.includes(filters.tag));
  }
  
  // Sort by updated date (most recent first)
  userNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  return userNotes;
}

/**
 * Search notes by query
 */
function searchNotes(userId, query) {
  const notes = loadNotes();
  const userNotes = notes.filter(note => note.userId === userId);
  
  if (!query || query.trim() === '') {
    return userNotes;
  }
  
  const lowerQuery = query.toLowerCase();
  
  return userNotes.filter(note => {
    return (
      note.title.toLowerCase().includes(lowerQuery) ||
      note.body.toLowerCase().includes(lowerQuery) ||
      note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get note by ID
 */
function getNoteById(noteId) {
  const notes = loadNotes();
  return notes.find(note => note.id === noteId);
}

/**
 * Update note
 */
function updateNote(userId, noteId, patch) {
  const notes = loadNotes();
  const noteIndex = notes.findIndex(note => note.id === noteId && note.userId === userId);
  
  if (noteIndex === -1) {
    return null;
  }
  
  const note = notes[noteIndex];
  
  // Update fields
  if (patch.title !== undefined) {
    note.title = patch.title;
  }
  
  if (patch.body !== undefined) {
    note.body = patch.body;
  }
  
  if (patch.appendBody !== undefined) {
    note.body += (note.body ? '\n\n' : '') + patch.appendBody;
  }
  
  if (patch.tags !== undefined) {
    note.tags = Array.isArray(patch.tags) ? patch.tags : [];
  }
  
  if (patch.addTag) {
    if (!note.tags.includes(patch.addTag)) {
      note.tags.push(patch.addTag);
    }
  }
  
  if (patch.context !== undefined) {
    note.context = { ...note.context, ...patch.context };
  }
  
  note.updatedAt = new Date().toISOString();
  
  notes[noteIndex] = note;
  saveNotes(notes);
  
  console.log(`[Notes] Updated note: ${noteId}`);
  
  return note;
}

/**
 * Delete note
 */
function deleteNote(userId, noteId) {
  const notes = loadNotes();
  const noteIndex = notes.findIndex(note => note.id === noteId && note.userId === userId);
  
  if (noteIndex === -1) {
    return false;
  }
  
  const deletedNote = notes.splice(noteIndex, 1)[0];
  saveNotes(notes);
  
  console.log(`[Notes] Deleted note: ${noteId}`);
  
  return deletedNote;
}

/**
 * Get recent notes (last N notes)
 */
function getRecentNotes(userId, limit = 5) {
  const notes = listNotes(userId);
  return notes.slice(0, limit);
}

module.exports = {
  createNote,
  listNotes,
  searchNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getRecentNotes
};
