/**
 * FlowState Final Polish - Acceptance Tests
 * Tests all 7 acceptance criteria
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_USER = 'acceptance-test-user@example.com';

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

/**
 * Make HTTP POST request to webhook
 */
function makeRequest(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      userId: TEST_USER,
      message: message
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * Test helper - assert condition
 */
function assert(condition, message) {
  if (condition) {
    console.log(`  ${GREEN}✓${RESET} ${message}`);
    testsPassed++;
  } else {
    console.log(`  ${RED}✗${RESET} ${message}`);
    testsFailed++;
  }
}

/**
 * Wait helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Creation & Listing
 */
async function testCreateAndList() {
  console.log(`\n${BLUE}═══ Test 1: Creation & Listing ═══${RESET}`);
  
  // First delete all to start clean
  await makeRequest('delete all');
  await wait(300);
  
  // Create a task
  const createResp = await makeRequest('create a task to review PR');
  console.log(`  Input: "create a task to review PR"`);
  assert(
    createResp.message && createResp.message.includes('Created'),
    'Task created successfully'
  );
  
  await wait(300);
  
  // List tasks
  const listResp = await makeRequest('show my tasks');
  console.log(`  Input: "show my tasks"`);
  assert(
    listResp.message && listResp.message.includes('review PR'),
    'Task appears in list'
  );
}

/**
 * Test 2: Delete All
 */
async function testDeleteAll() {
  console.log(`\n${BLUE}═══ Test 2: Delete All ═══${RESET}`);
  
  // Create multiple tasks
  await makeRequest('create task: platform work');
  await wait(300);
  await makeRequest('create task: write unit tests');
  await wait(300);
  
  // List to verify
  const listBefore = await makeRequest('list all');
  console.log(`  Setup: Created tasks, list shows ${listBefore.structured?.count || 0} tasks`);
  
  await wait(300);
  
  // Delete all
  const deleteResp = await makeRequest('delete all');
  console.log(`  Input: "delete all"`);
  assert(
    deleteResp.message && deleteResp.message.includes('Deleted') && !deleteResp.message.includes('No tasks'),
    'Deleted all tasks with success message (not "No tasks to delete")'
  );
  
  await wait(300);
  
  // List after
  const listAfter = await makeRequest('show my tasks');
  console.log(`  Input: "show my tasks"`);
  assert(
    listAfter.structured?.count === 0,
    'Zero tasks after delete all'
  );
}

/**
 * Test 3: Delete by Title & by Context
 */
async function testDeleteByTitleAndContext() {
  console.log(`\n${BLUE}═══ Test 3: Delete by Title & by Context ═══${RESET}`);
  
  // Clean slate
  await makeRequest('delete all');
  await wait(300);
  
  // Create tasks
  await makeRequest('create task: platform work');
  await wait(300);
  await makeRequest('create task: ui design');
  await wait(300);
  await makeRequest('create task: backend api');
  await wait(300);
  
  // Delete by title
  const deleteByTitle = await makeRequest('delete platform work');
  console.log(`  Input: "delete platform work"`);
  assert(
    deleteByTitle.message && deleteByTitle.message.includes('Deleted'),
    'Delete by title works'
  );
  
  await wait(300);
  
  // List tasks
  const listResp = await makeRequest('show my tasks');
  console.log(`  Input: "show my tasks" - listed ${listResp.structured?.count || 0} tasks`);
  assert(
    listResp.message && !listResp.message.includes('platform work'),
    'Platform work is gone from list'
  );
  
  await wait(300);
  
  // Delete by index (the second one, which should be "backend api")
  const deleteByIndex = await makeRequest('delete the second one');
  console.log(`  Input: "delete the second one"`);
  assert(
    deleteByIndex.message && deleteByIndex.message.includes('Deleted'),
    'Delete by index works (using last list context)'
  );
}

/**
 * Test 4: Complete Task
 */
async function testCompleteTask() {
  console.log(`\n${BLUE}═══ Test 4: Complete Task ═══${RESET}`);
  
  // Clean and create
  await makeRequest('delete all');
  await wait(300);
  
  const createResp = await makeRequest('create task: write unit tests');
  await wait(300);
  
  // Complete it
  const completeResp = await makeRequest('complete the write unit tests task');
  console.log(`  Input: "complete the write unit tests task"`);
  assert(
    completeResp.message && completeResp.message.includes('Marked') && completeResp.message.includes('complete'),
    'Task marked as complete with confirmation'
  );
}

/**
 * Test 5: Sort by Priority
 */
async function testSortByPriority() {
  console.log(`\n${BLUE}═══ Test 5: Sort by Priority ═══${RESET}`);
  
  // Clean and create tasks with different priorities
  await makeRequest('delete all');
  await wait(300);
  
  await makeRequest('create low priority task: documentation');
  await wait(300);
  await makeRequest('create task: code review');
  await wait(300);
  await makeRequest('/t urgent task: fix critical bug');
  await wait(300);
  
  // Re-arrange by priority
  const sortResp = await makeRequest('re arrange the list by priority');
  console.log(`  Input: "re arrange the list by priority"`);
  assert(
    sortResp.message && sortResp.message.includes('HIGH'),
    'Response includes HIGH priority section'
  );
  
  // Check order: HIGH should appear before MEDIUM before LOW
  const highIndex = sortResp.message.indexOf('HIGH');
  const mediumIndex = sortResp.message.indexOf('MEDIUM');
  const lowIndex = sortResp.message.indexOf('LOW');
  
  assert(
    highIndex !== -1 && mediumIndex !== -1 && lowIndex !== -1 &&
    highIndex < mediumIndex && mediumIndex < lowIndex,
    'Tasks sorted HIGH → MEDIUM → LOW'
  );
}

/**
 * Test 6: Filter by Assignee
 */
async function testFilterByAssignee() {
  console.log(`\n${BLUE}═══ Test 6: Filter by Assignee ═══${RESET}`);
  
  // Clean and create tasks with assignees
  await makeRequest('delete all');
  await wait(300);
  
  await makeRequest('assign a task to thomas about ui/ux');
  await wait(300);
  await makeRequest('assign a task to indrish about platforms');
  await wait(300);
  await makeRequest('create task: unassigned work');
  await wait(300);
  
  // List tasks for Thomas
  const thomasResp = await makeRequest('list the tasks assigned for thomas');
  console.log(`  Input: "list the tasks assigned for thomas"`);
  assert(
    thomasResp.message && thomasResp.message.includes('thomas'),
    'Shows tasks for Thomas'
  );
  assert(
    !thomasResp.message.includes('indrish') && !thomasResp.message.includes('platforms'),
    'Does not show Indrish tasks'
  );
  
  await wait(300);
  
  // List tasks for Indrish
  const indrishResp = await makeRequest('list the tasks assigned for indrish');
  console.log(`  Input: "list the tasks assigned for indrish"`);
  assert(
    indrishResp.message && indrishResp.message.includes('indrish'),
    'Shows tasks for Indrish'
  );
  
  await wait(300);
  
  // List tasks for non-existent person
  const noneResp = await makeRequest('list the tasks assigned for alice');
  console.log(`  Input: "list the tasks assigned for alice"`);
  assert(
    noneResp.message && noneResp.message.includes('don\'t have any tasks for'),
    'Clear message when no tasks for specified person'
  );
  assert(
    !noneResp.message.includes('thomas') && !noneResp.message.includes('indrish'),
    'Does not show other people\'s tasks'
  );
}

/**
 * Test 7: Edge Cases
 */
async function testEdgeCases() {
  console.log(`\n${BLUE}═══ Test 7: Edge Cases ═══${RESET}`);
  
  // Clean slate
  await makeRequest('delete all');
  await wait(300);
  
  // Try to delete when no tasks exist
  const deleteEmpty = await makeRequest('delete all');
  console.log(`  Input: "delete all" (when no tasks exist)`);
  assert(
    deleteEmpty.message && deleteEmpty.message.includes('No tasks'),
    'Proper message when deleting with no tasks'
  );
  
  await wait(300);
  
  // Try to complete when no tasks exist
  const completeEmpty = await makeRequest('complete the first task');
  console.log(`  Input: "complete the first task" (when no tasks exist)`);
  assert(
    completeEmpty.message && completeEmpty.message.includes('No tasks'),
    'Proper message when completing with no tasks'
  );
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`\n${YELLOW}╔════════════════════════════════════════════════╗${RESET}`);
  console.log(`${YELLOW}║   FLOWSTATE FINAL POLISH - ACCEPTANCE TESTS    ║${RESET}`);
  console.log(`${YELLOW}╚════════════════════════════════════════════════╝${RESET}`);
  console.log(`\nTesting user: ${TEST_USER}`);
  
  try {
    await testCreateAndList();
    await wait(500);
    
    await testDeleteAll();
    await wait(500);
    
    await testDeleteByTitleAndContext();
    await wait(500);
    
    await testCompleteTask();
    await wait(500);
    
    await testSortByPriority();
    await wait(500);
    
    await testFilterByAssignee();
    await wait(500);
    
    await testEdgeCases();
    
    // Summary
    console.log(`\n${YELLOW}═══════════════════════════════════════════════${RESET}`);
    console.log(`${YELLOW}║              TEST SUMMARY                     ║${RESET}`);
    console.log(`${YELLOW}═══════════════════════════════════════════════${RESET}`);
    console.log(`  ${GREEN}Passed:${RESET} ${testsPassed}`);
    console.log(`  ${RED}Failed:${RESET} ${testsFailed}`);
    
    if (testsFailed === 0) {
      console.log(`\n${GREEN}✓ ALL TESTS PASSED! 🎉${RESET}\n`);
      process.exit(0);
    } else {
      console.log(`\n${RED}✗ Some tests failed${RESET}\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n${RED}Fatal error during tests:${RESET}`, error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
