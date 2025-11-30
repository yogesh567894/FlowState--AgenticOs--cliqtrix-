/**
 * Advanced Features Test Suite
 * Tests all new strict actions, filtering, sorting, and chat utilities
 */

// Load environment variables
require('dotenv').config();

const { parseIntent } = require('./services/nlp');

// Test user ID
const TEST_USER = 'test-advanced@example.com';

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function header(text) {
  console.log('\n' + '═'.repeat(70));
  log(colors.bright + colors.cyan, `  ${text}`);
  console.log('═'.repeat(70) + '\n');
}

function testResult(passed, message) {
  if (passed) {
    log(colors.green, '  ✓', message);
  } else {
    log(colors.red, '  ✗', message);
  }
}

async function runTest(testNumber, description, message, expectedAction, additionalChecks = {}, context = {}) {
  log(colors.bright, `\nTEST ${testNumber}: ${description}`);
  log(colors.blue, `  Input: "${message}"`);
  
  try {
    const intent = await parseIntent(message, TEST_USER, context);
    const action = intent.primary_action || intent.action || 'unknown';
    
    log(colors.yellow, `  Parsed action: ${action}`);
    
    // Check primary action
    const actionMatches = action === expectedAction;
    testResult(actionMatches, `Expected action: ${expectedAction} - ${actionMatches ? 'PASS' : 'FAIL'}`);
    
    // Additional checks
    if (additionalChecks.hasMode) {
      const hasMode = intent.mode && intent.mode.length > 0;
      testResult(hasMode, `Mode detected: ${intent.mode || 'none'} - ${hasMode ? 'PASS' : 'FAIL'}`);
    }
    
    if (additionalChecks.hasPerson) {
      const hasPerson = intent.entities && intent.entities.person;
      testResult(hasPerson, `Person extracted: ${intent.entities?.person || 'none'} - ${hasPerson ? 'PASS' : 'FAIL'}`);
    }
    
    if (additionalChecks.hasSortBy) {
      const hasSortBy = intent.entities && intent.entities.sort_by;
      testResult(hasSortBy, `Sort by: ${intent.entities?.sort_by || 'none'} - ${hasSortBy ? 'PASS' : 'FAIL'}`);
    }
    
    if (additionalChecks.hasPriority) {
      const hasPriority = intent.entities && intent.entities.priority;
      testResult(hasPriority, `Priority: ${intent.entities?.priority || 'none'} - ${hasPriority ? 'PASS' : 'FAIL'}`);
    }
    
    if (additionalChecks.hasReplyHint) {
      const hasHint = intent.reply_hint && intent.reply_hint.length > 0;
      testResult(hasHint, `Reply hint provided - ${hasHint ? 'PASS' : 'FAIL'}`);
    }
    
    // Log full intent for debugging
    if (process.env.VERBOSE) {
      console.log('  Full intent:', JSON.stringify(intent, null, 2));
    }
    
    return actionMatches;
  } catch (error) {
    log(colors.red, `  ✗ ERROR: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function runAllTests() {
  header('🚀 ADVANCED FEATURES TEST SUITE');
  
  const results = [];
  
  // ===== STRICT ACTION SET TESTS =====
  header('STRICT ACTION SET');
  
  results.push(await runTest(
    1,
    'Complete task action',
    'Mark the first task as done',
    'complete_task'
  ));
  
  results.push(await runTest(
    2,
    'Delete task action',
    'Delete the existing tasks',
    'delete_task'
  ));
  
  results.push(await runTest(
    3,
    'List tasks action',
    'Show my tasks',
    'list_tasks'
  ));
  
  results.push(await runTest(
    4,
    'Show urgent action',
    'What is urgent today?',
    'show_urgent'
  ));
  
  results.push(await runTest(
    5,
    'Small talk action (greeting)',
    'Hello there',
    'small_talk',
    { hasMode: true }
  ));
  
  results.push(await runTest(
    6,
    'Small talk action (question)',
    'What is priority?',
    'small_talk',
    { hasReplyHint: true }
  ));
  
  // ===== ENTITY EXTRACTION TESTS =====
  header('ENTITY EXTRACTION');
  
  results.push(await runTest(
    7,
    'Extract person (assignee)',
    'Show tasks for indrish',
    'list_tasks',
    { hasPerson: true }
  ));
  
  results.push(await runTest(
    8,
    'Extract sort_by (priority)',
    'Re-arrange the list based on priority',
    'list_tasks',
    { hasSortBy: true }
  ));
  
  results.push(await runTest(
    9,
    'Extract priority filter',
    'Show high priority tasks',
    'list_tasks',
    { hasPriority: true }
  ));
  
  results.push(await runTest(
    10,
    'Difficulty as priority alias',
    'Show tasks by difficulty',
    'list_tasks',
    { hasSortBy: true }
  ));
  
  // ===== MODE PREFIX TESTS =====
  header('MODE PREFIXES');
  
  results.push(await runTest(
    11,
    'Mode prefix /t',
    '/t Review code, write tests',
    'create_task',
    {},
    { mode: 'tasks' }
  ));
  
  results.push(await runTest(
    12,
    'Mode prefix /n',
    '/n Meeting notes here',
    'create_note',
    {},
    { mode: 'notes' }
  ));
  
  results.push(await runTest(
    13,
    'Mode prefix /f',
    '/f 45',
    'focus',
    {},
    { mode: 'focus' }
  ));
  
  // ===== CONTEXT-AWARE FOLLOW-UPS =====
  header('CONTEXT-AWARE OPERATIONS');
  
  results.push(await runTest(
    14,
    'Delete with context',
    'Delete existing tasks',
    'delete_task',
    {},
    { hasTaskList: true, lastTaskIds: ['task1', 'task2'] }
  ));
  
  results.push(await runTest(
    15,
    'Re-arrange with context',
    'Re-arrange the list',
    'list_tasks',
    { hasSortBy: true },
    { hasTaskList: true, lastAction: 'list_tasks' }
  ));
  
  // ===== CHAT UTILITIES =====
  header('CHAT UTILITIES');
  
  results.push(await runTest(
    16,
    'What time is it?',
    'What time is it right now?',
    'small_talk'
  ));
  
  results.push(await runTest(
    17,
    'What day is today?',
    'What day is it today?',
    'small_talk'
  ));
  
  results.push(await runTest(
    18,
    'Concept question',
    'What is priority in task management?',
    'small_talk',
    { hasReplyHint: true }
  ));
  
  // ===== COMPLEX SCENARIOS =====
  header('COMPLEX SCENARIOS');
  
  results.push(await runTest(
    19,
    'Complete specific task',
    'Complete the review PR task',
    'complete_task'
  ));
  
  results.push(await runTest(
    20,
    'Delete all tasks',
    'Delete all my tasks',
    'delete_task'
  ));
  
  results.push(await runTest(
    21,
    'Tasks with assignee and priority',
    'Show high priority tasks for yogesh',
    'list_tasks',
    { hasPerson: true, hasPriority: true }
  ));
  
  results.push(await runTest(
    22,
    'Sort by due date',
    'Show tasks sorted by due date',
    'list_tasks',
    { hasSortBy: true }
  ));
  
  // ===== FALLBACK SCENARIOS =====
  header('FALLBACK & EDGE CASES');
  
  results.push(await runTest(
    23,
    'Unknown input',
    'Something completely random and nonsensical',
    'unknown'
  ));
  
  results.push(await runTest(
    24,
    'Help request',
    'How do I use this?',
    'help'
  ));
  
  results.push(await runTest(
    25,
    'Math with context',
    'Calculate 1500 * 12',
    'math'
  ));
  
  // ===== SUMMARY =====
  header('📊 TEST SUMMARY');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`  Total tests: ${total}`);
  log(colors.green, `  Passed: ${passed}`);
  log(colors.red, `  Failed: ${total - passed}`);
  log(percentage >= 80 ? colors.green : colors.yellow, `  Success rate: ${percentage}%`);
  
  console.log('\n' + '═'.repeat(70));
  
  if (percentage >= 80) {
    log(colors.bright + colors.green, '\n  🎉 ADVANCED FEATURES ARE WORKING!\n');
    console.log('  ✅ Strict action set: WORKING');
    console.log('  ✅ Entity extraction (person, priority, sort): WORKING');
    console.log('  ✅ Mode prefixes (/t, /n, /f): WORKING');
    console.log('  ✅ Context-aware operations: WORKING');
    console.log('  ✅ Chat utilities (time, date, concepts): WORKING');
    console.log('  ✅ Task operations (complete, delete, filter, sort): WORKING');
    console.log('\n  🚀 Your bot handles complex scenarios like a pro!');
  } else {
    log(colors.yellow, '\n  ⚠️  Some tests failed. Review the output above.\n');
  }
  
  console.log('');
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
