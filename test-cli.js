/**
 * CLI Test Script
 * Quick command-line test for Groq connection and token splitting
 * 
 * Usage: node test-cli.js
 */

require('dotenv').config();
const readline = require('readline');
const { parseIntent, estimateTokens } = require('./services/nlp');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('  🚀 GROQ CONNECTION & TOKEN SPLITTING TEST CLI');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Check if API key is configured
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
  console.log('❌ ERROR: GROQ_API_KEY not configured in .env file');
  console.log('');
  console.log('Please add your Groq API key to the .env file:');
  console.log('GROQ_API_KEY=gsk_your_actual_key_here');
  console.log('');
  process.exit(1);
}

console.log('✅ API Key found');
console.log(`📊 Token Limits: Input=${require('./services/nlp').MAX_INPUT_TOKENS_PER_CALL}, Output=${require('./services/nlp').MAX_OUTPUT_TOKENS_PER_CALL}`);
console.log('');

// Test examples
const examples = {
  '1': {
    name: 'Simple Task',
    message: 'Create a task to review the code and update documentation'
  },
  '2': {
    name: 'Multiple Tasks (5)',
    message: `Create these 5 tasks:
1) Setup development environment
2) Design database schema
3) Implement authentication
4) Create API endpoints
5) Write tests`
  },
  '3': {
    name: 'Long Request (20 tasks)',
    message: Array.from({length: 20}, (_, i) => 
      `${i+1}) Task ${i+1}: Implement feature ${i+1} with detailed requirements and comprehensive testing`
    ).join('\n')
  },
  '4': {
    name: 'Ultra Long (50 tasks - will trigger chunking)',
    message: Array.from({length: 50}, (_, i) => 
      `${i+1}) Task ${i+1}: This is a detailed task description that includes requirements, implementation details, testing procedures, and documentation needs for feature ${i+1}.`
    ).join('\n')
  }
};

function showMenu() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('OPTIONS:');
  console.log('  1 - Test Simple Task');
  console.log('  2 - Test Multiple Tasks (5)');
  console.log('  3 - Test Long Request (20 tasks)');
  console.log('  4 - Test Ultra Long (50 tasks - triggers chunking)');
  console.log('  c - Custom message');
  console.log('  q - Quit');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

async function testMessage(message) {
  console.log('');
  console.log('─────────────────────────────────────────────────────────');
  console.log('📝 MESSAGE:');
  console.log(message.substring(0, 200) + (message.length > 200 ? '...' : ''));
  console.log('');
  
  const tokens = estimateTokens(message);
  const maxTokens = require('./services/nlp').MAX_INPUT_TOKENS_PER_CALL;
  const chunks = Math.ceil(tokens / maxTokens);
  
  console.log(`📊 ANALYSIS:`);
  console.log(`   Characters: ${message.length}`);
  console.log(`   Estimated tokens: ${tokens}`);
  console.log(`   Chunks required: ${chunks}`);
  console.log(`   Will split: ${chunks > 1 ? '✅ YES' : '❌ NO'}`);
  console.log('');
  
  if (chunks > 1) {
    console.log(`⚠️  WARNING: This message will be split into ${chunks} chunks`);
    console.log('');
  }
  
  console.log('🔄 Calling Groq API...');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const result = await parseIntent(message, 'cli_test_user');
    const duration = Date.now() - startTime;
    
    console.log('✅ SUCCESS!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('');
    console.log('📋 RESULT:');
    console.log(`   Action: ${result.action}`);
    
    if (result.metadata && result.metadata.chunked) {
      console.log(`   ✨ Processed with chunking: ${result.metadata.chunkCount} chunks`);
    }
    
    if (result.tasks && result.tasks.length > 0) {
      console.log(`   Tasks detected: ${result.tasks.length}`);
      console.log('');
      console.log('   Sample tasks:');
      result.tasks.slice(0, 5).forEach((task, i) => {
        console.log(`     ${i + 1}. ${task.title}`);
      });
      
      if (result.tasks.length > 5) {
        console.log(`     ... and ${result.tasks.length - 5} more`);
      }
    }
    
    if (result.warning) {
      console.log('');
      console.log(`   ⚠️  Warning: ${result.warning}`);
    }
    
    if (result.queue && result.queue.length > 0) {
      console.log(`   📋 Queued tasks: ${result.queue.length}`);
    }
    
    console.log('');
    console.log('─────────────────────────────────────────────────────────');
    
  } catch (error) {
    console.log('❌ ERROR!');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('─────────────────────────────────────────────────────────');
  }
  
  console.log('');
}

function promptUser() {
  showMenu();
  
  rl.question('Select option: ', async (answer) => {
    answer = answer.trim().toLowerCase();
    
    if (answer === 'q') {
      console.log('');
      console.log('👋 Goodbye!');
      console.log('');
      rl.close();
      process.exit(0);
      return;
    }
    
    if (answer === 'c') {
      console.log('');
      rl.question('Enter your message: ', async (customMessage) => {
        if (customMessage.trim()) {
          await testMessage(customMessage);
        } else {
          console.log('❌ Empty message');
        }
        promptUser();
      });
      return;
    }
    
    if (examples[answer]) {
      console.log('');
      console.log(`🧪 Testing: ${examples[answer].name}`);
      await testMessage(examples[answer].message);
      promptUser();
    } else {
      console.log('❌ Invalid option');
      console.log('');
      promptUser();
    }
  });
}

// Start the CLI
promptUser();
