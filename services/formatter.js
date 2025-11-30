/**
 * Response Formatter
 * Creates human-friendly, conversational responses with CLI styling
 */

/**
 * Format task creation response
 */
function formatTaskCreated(tasks, context = {}) {
  const count = tasks.length;
  const projectName = context.project || 'your workspace';
  
  let message = '';
  
  if (count === 1) {
    message = `✅ **Got it!** Created task: "${tasks[0].title}"`;
    if (context.project) {
      message += ` for ${projectName}`;
    }
  } else {
    message = `✅ **Awesome!** Created ${count} tasks`;
    if (context.project) {
      message += ` for ${projectName}`;
    }
  }
  
  // Add structured task list
  const taskList = tasks.slice(0, 10).map((task, i) => {
    let line = `  ${i + 1}. ${task.title}`;
    if (task.priority && task.priority !== 'medium') {
      line += ` [${task.priority.toUpperCase()}]`;
    }
    if (task.dueDate) {
      line += ` (due: ${task.dueDate})`;
    }
    return line;
  }).join('\n');
  
  message += '\n\n' + taskList;
  
  if (tasks.length > 10) {
    message += `\n  ... and ${tasks.length - 10} more`;
  }
  
  // Add follow-up suggestion
  if (count > 1) {
    message += '\n\n💡 Want to set a focus block for these tasks?';
  }
  
  return {
    message,
    structured: {
      type: 'tasks_created',
      count,
      tasks: tasks.map(t => ({ id: t.id, title: t.title, priority: t.priority }))
    }
  };
}

/**
 * Format task list response
 */
function formatTaskList(tasks, context = {}) {
  const filters = context.filters || {};
  
  if (tasks.length === 0) {
    // Provide context-specific empty message
    let emptyMessage = '📋 ';
    
    if (filters.person) {
      emptyMessage += `You don't have any tasks for **${filters.person}**.`;
    } else if (filters.priority) {
      emptyMessage += `You don't have any **${filters.priority}** priority tasks.`;
    } else if (filters.sortBy) {
      emptyMessage += 'You don\'t have any tasks yet.';
    } else {
      emptyMessage += 'You don\'t have any tasks yet.';
    }
    
    emptyMessage += '\n\n💡 Create one with: "create a task to [description]"';
    
    return {
      message: emptyMessage,
      structured: { type: 'tasks_list', count: 0, tasks: [] }
    };
  }
  
  let message = `📋 **You have ${tasks.length} task${tasks.length !== 1 ? 's' : ''}**`;
  
  // Add context info
  if (filters.person) {
    message += ` for **${filters.person}**`;
  }
  if (context.project) {
    message += ` in ${context.project}`;
  }
  
  // Group by priority
  const high = tasks.filter(t => t.priority === 'high');
  const medium = tasks.filter(t => t.priority === 'medium');
  const low = tasks.filter(t => t.priority === 'low');
  
  const sections = [];
  
  if (high.length > 0) {
    sections.push(`\n🔴 **HIGH PRIORITY** (${high.length})`);
    high.slice(0, 5).forEach((task, i) => {
      sections.push(`  ${i + 1}. ${task.title}${task.assignee ? ` [@${task.assignee}]` : ''} ${task.status === 'completed' ? '✓' : ''}`);
    });
  }
  
  if (medium.length > 0) {
    sections.push(`\n🟡 **MEDIUM** (${medium.length})`);
    medium.slice(0, 5).forEach((task, i) => {
      sections.push(`  ${i + 1}. ${task.title}${task.assignee ? ` [@${task.assignee}]` : ''} ${task.status === 'completed' ? '✓' : ''}`);
    });
  }
  
  if (low.length > 0) {
    sections.push(`\n🟢 **LOW** (${low.length})`);
    low.slice(0, 3).forEach((task, i) => {
      sections.push(`  ${i + 1}. ${task.title}${task.assignee ? ` [@${task.assignee}]` : ''} ${task.status === 'completed' ? '✓' : ''}`);
    });
  }
  
  message += sections.join('\n');
  
  return {
    message,
    structured: {
      type: 'tasks_list',
      count: tasks.length,
      byPriority: { high: high.length, medium: medium.length, low: low.length }
    }
  };
}

/**
 * Format urgent tasks response
 */
function formatUrgentSummary(urgentTasks) {
  if (urgentTasks.length === 0) {
    return {
      message: '🎉 **Nice!** You have no urgent tasks right now. Time to breathe!',
      structured: { type: 'urgent_summary', count: 0 }
    };
  }
  
  let message = `🚨 **Urgent:** You have ${urgentTasks.length} high-priority task${urgentTasks.length !== 1 ? 's' : ''}:\n\n`;
  
  urgentTasks.forEach((task, i) => {
    message += `  ${i + 1}. ${task.title}`;
    if (task.dueDate) {
      message += ` (due: ${task.dueDate})`;
    }
    message += '\n';
  });
  
  message += '\n💡 Want to start a focus block?';
  
  return {
    message,
    structured: {
      type: 'urgent_summary',
      count: urgentTasks.length,
      tasks: urgentTasks.map(t => ({ id: t.id, title: t.title }))
    }
  };
}

/**
 * Format focus block start
 */
function formatFocusStart(task, duration = 25) {
  return {
    message: `⏰ **Focus Mode Activated!**\n\nWorking on: ${task.title}\nDuration: ${duration} minutes\n\n🔕 Minimize distractions and let's get this done!`,
    structured: {
      type: 'focus_start',
      taskId: task.id,
      taskTitle: task.title,
      duration
    }
  };
}

/**
 * Format note created response
 */
function formatNoteCreated(note, context = {}) {
  let message = `📝 **Saved!** Created note: "${note.title}"`;
  
  if (context.project) {
    message += ` linked to #${context.project}`;
  }
  
  if (note.body) {
    const preview = note.body.length > 100 
      ? note.body.substring(0, 100) + '...' 
      : note.body;
    message += `\n\n> ${preview}`;
  }
  
  if (note.tags.length > 0) {
    message += `\n\nTags: ${note.tags.map(t => `#${t}`).join(' ')}`;
  }
  
  message += '\n\n💡 Want to add more details? Just say "add to last note: [your content]"';
  
  return {
    message,
    structured: {
      type: 'note_created',
      noteId: note.id,
      title: note.title
    }
  };
}

/**
 * Format note list response
 */
function formatNoteList(notes, context = {}) {
  if (notes.length === 0) {
    return {
      message: '📝 No notes found. Create one with: "note: [your content]" or "remember: [something important]"',
      structured: { type: 'notes_list', count: 0 }
    };
  }
  
  let message = `📝 **Found ${notes.length} note${notes.length !== 1 ? 's' : ''}**`;
  
  if (context.project) {
    message += ` for ${context.project}`;
  }
  
  message += '\n\n';
  
  notes.slice(0, 10).forEach((note, i) => {
    message += `  ${i + 1}. **${note.title}**\n`;
    if (note.body) {
      const preview = note.body.length > 60 
        ? note.body.substring(0, 60) + '...' 
        : note.body;
      message += `     ${preview}\n`;
    }
    if (note.tags.length > 0) {
      message += `     ${note.tags.map(t => `#${t}`).join(' ')}\n`;
    }
    message += '\n';
  });
  
  if (notes.length > 10) {
    message += `... and ${notes.length - 10} more notes`;
  }
  
  return {
    message,
    structured: {
      type: 'notes_list',
      count: notes.length,
      notes: notes.map(n => ({ id: n.id, title: n.title }))
    }
  };
}

/**
 * Format chatty fallback for unrecognized commands
 */
function formatChattyFallback(userMessage, context = {}) {
  const lastAction = context.lastAction;
  
  let message = '🤔 Hmm, I\'m not sure what you mean.\n\n';
  
  // Contextual suggestions based on last action
  if (lastAction === 'create_task') {
    message += 'I just created some tasks. You can:\n';
    message += '  • "show my tasks"\n';
    message += '  • "start focus mode"\n';
    message += '  • "create another task"\n';
  } else if (lastAction === 'create_note') {
    message += 'I just saved a note. You can:\n';
    message += '  • "show my notes"\n';
    message += '  • "add to last note: [more content]"\n';
    message += '  • "create a task from this note"\n';
  } else {
    message += 'I can help you with:\n';
    message += '  📋 **Tasks:** "create a task to review PR tomorrow"\n';
    message += '  📝 **Notes:** "note: meeting summary for Acme"\n';
    message += '  🎯 **Focus:** "start focus mode"\n';
    message += '  🚨 **Urgent:** "show urgent tasks"\n';
  }
  
  return {
    message,
    structured: {
      type: 'fallback',
      userMessage
    }
  };
}

/**
 * Format math expression result
 */
function formatMathResult(expression, result) {
  return {
    message: `🔢 **Calculation:**\n\n${expression} = **${result}**`,
    structured: {
      type: 'math_result',
      expression,
      result
    }
  };
}

/**
 * Format generic success message
 */
function formatSuccess(message) {
  return {
    message: `✅ ${message}`,
    structured: { type: 'success', message }
  };
}

/**
 * Format error message
 */
function formatError(error) {
  return {
    message: `❌ Oops! ${error}`,
    structured: { type: 'error', error }
  };
}

module.exports = {
  formatTaskCreated,
  formatTaskList,
  formatUrgentSummary,
  formatFocusStart,
  formatNoteCreated,
  formatNoteList,
  formatChattyFallback,
  formatMathResult,
  formatSuccess,
  formatError
};
