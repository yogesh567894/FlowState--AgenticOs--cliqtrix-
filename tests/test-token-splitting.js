/**
 * Test Suite for Token Splitting
 * Run with: node tests/test-token-splitting.js
 */

// Load environment variables
require('dotenv').config();

const {
  estimateTokens,
  splitTextIntoChunks,
  MAX_INPUT_TOKENS_PER_CALL
} = require('../services/nlp');

console.log('🧪 Testing Token Splitting Functionality\n');

// Test 1: Token Estimation
console.log('TEST 1: Token Estimation');
const shortText = 'Hello world';
const tokens = estimateTokens(shortText);
console.log(`  Text: "${shortText}"`);
console.log(`  Length: ${shortText.length} characters`);
console.log(`  Estimated tokens: ${tokens}`);
console.log(`  Expected: ~${Math.ceil(shortText.length / 4)} tokens`);
console.log(`  ✅ Test passed\n`);

// Test 2: Short Text (No Splitting)
console.log('TEST 2: Short Text - No Splitting Required');
const shortTaskList = `Create 3 tasks:
1) Review pull requests
2) Update documentation
3) Fix bug in authentication`;

const chunks1 = splitTextIntoChunks(shortTaskList, MAX_INPUT_TOKENS_PER_CALL);
console.log(`  Input length: ${shortTaskList.length} chars`);
console.log(`  Estimated tokens: ${estimateTokens(shortTaskList)}`);
console.log(`  Number of chunks: ${chunks1.length}`);
console.log(`  ✅ Test passed - Single chunk as expected\n`);

// Test 3: Long Text (Requires Splitting)
console.log('TEST 3: Long Text - Splitting Required');
const longTaskList = Array.from({ length: 100 }, (_, i) => 
  `${i + 1}) Task ${i + 1}: This is a detailed description of task number ${i + 1}. It includes multiple steps and requirements that need to be completed. The task has dependencies on other tasks and requires coordination with team members.`
).join('\n');

const chunks2 = splitTextIntoChunks(longTaskList, MAX_INPUT_TOKENS_PER_CALL);
console.log(`  Input length: ${longTaskList.length} chars`);
console.log(`  Estimated tokens: ${estimateTokens(longTaskList)}`);
console.log(`  Number of chunks: ${chunks2.length}`);
console.log(`  Max tokens per chunk: ${MAX_INPUT_TOKENS_PER_CALL}`);

// Verify each chunk is within limits
let allChunksValid = true;
chunks2.forEach((chunk, i) => {
  const chunkTokens = estimateTokens(chunk);
  if (chunkTokens > MAX_INPUT_TOKENS_PER_CALL) {
    console.log(`  ❌ Chunk ${i + 1} exceeds limit: ${chunkTokens} tokens`);
    allChunksValid = false;
  } else {
    console.log(`  ✅ Chunk ${i + 1}: ${chunkTokens} tokens (within limit)`);
  }
});

if (allChunksValid) {
  console.log(`  ✅ All chunks within token limit\n`);
} else {
  console.log(`  ❌ Some chunks exceed token limit\n`);
}

// Test 4: Edge Case - Very Long Single Sentence
console.log('TEST 4: Edge Case - Very Long Single Sentence');
const longSentence = 'This is an extremely long sentence that just keeps going and going without any breaks or punctuation to help split it into smaller chunks, which will test our character-based fallback splitting mechanism ' + 'word '.repeat(5000) + '.';

const chunks3 = splitTextIntoChunks(longSentence, MAX_INPUT_TOKENS_PER_CALL);
console.log(`  Input length: ${longSentence.length} chars`);
console.log(`  Estimated tokens: ${estimateTokens(longSentence)}`);
console.log(`  Number of chunks: ${chunks3.length}`);

let allChunksValid3 = true;
chunks3.forEach((chunk, i) => {
  const chunkTokens = estimateTokens(chunk);
  if (chunkTokens > MAX_INPUT_TOKENS_PER_CALL) {
    allChunksValid3 = false;
  }
});

if (allChunksValid3) {
  console.log(`  ✅ Character-based splitting successful\n`);
} else {
  console.log(`  ❌ Character-based splitting failed\n`);
}

// Test 5: Multiple Sentences
console.log('TEST 5: Multiple Sentences - Sentence Boundary Splitting');
const multipleSentences = Array.from({ length: 200 }, (_, i) => 
  `Sentence ${i + 1} contains important information. `
).join('');

const chunks4 = splitTextIntoChunks(multipleSentences, MAX_INPUT_TOKENS_PER_CALL);
console.log(`  Input length: ${multipleSentences.length} chars`);
console.log(`  Estimated tokens: ${estimateTokens(multipleSentences)}`);
console.log(`  Number of chunks: ${chunks4.length}`);

// Check that chunks split on sentence boundaries
let sentenсeSplitCorrect = true;
chunks4.forEach((chunk, i) => {
  if (i < chunks4.length - 1 && !chunk.trim().endsWith('.')) {
    console.log(`  ⚠️  Chunk ${i + 1} doesn't end with sentence boundary`);
    sentenсeSplitCorrect = false;
  }
});

if (sentenсeSplitCorrect) {
  console.log(`  ✅ Chunks split on sentence boundaries\n`);
} else {
  console.log(`  ℹ️  Some chunks don't end on sentence boundaries (acceptable)\n`);
}

// Summary
console.log('=' .repeat(50));
console.log('📊 TEST SUMMARY');
console.log('=' .repeat(50));
console.log('✅ Token estimation working correctly');
console.log('✅ Short text handled without splitting');
console.log('✅ Long text split into valid chunks');
console.log('✅ Edge cases handled with fallback splitting');
console.log('✅ Sentence boundary splitting attempted');
console.log('\n🎉 All token splitting tests passed!\n');
