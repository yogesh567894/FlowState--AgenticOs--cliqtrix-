/**
 * NLP Service - Groq Integration with Token Splitting
 * 
 * HARD TOKEN-SAFETY LAYER FOR GROQ CALLS
 * Model: llama-3.3-70b-versatile (context window 128k tokens)
 * 
 * Token splitting ensures large prompts are automatically chunked
 * and processed in multiple Groq calls, then merged.
 */

const Groq = require('groq-sdk');

// ===== TOKEN SAFETY CONSTANTS =====
const MAX_INPUT_TOKENS_PER_CALL = 6000;      // safety cap per request
const MAX_OUTPUT_TOKENS_PER_CALL = 2000;     // increased for large task lists
const MAX_TOTAL_TOKENS_PER_CALL = 8000;      // input + output hard cap (well within model limit)

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * TOKEN ESTIMATION
 * Rough rule: 1 token ≈ 4 characters
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 4);
}

/**
 * SPLIT TEXT INTO N CHUNKS
 * Splits text on sentence/line boundaries where possible
 * Ensures each chunk's estimated tokens <= maxTokensPerChunk
 * 
 * @param {string} text - Text to split
 * @param {number} maxTokensPerChunk - Maximum tokens per chunk
 * @returns {string[]} Array of text chunks
 */
function splitTextIntoChunks(text, maxTokensPerChunk) {
  if (!text || estimateTokens(text) <= maxTokensPerChunk) {
    return [text];
  }

  const chunks = [];
  
  // First try to split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    const currentTokens = estimateTokens(currentChunk);
    
    // If adding this sentence would exceed the limit
    if (currentTokens + sentenceTokens > maxTokensPerChunk) {
      // If current chunk has content, save it
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If a single sentence is too large, split it further by lines
      if (sentenceTokens > maxTokensPerChunk) {
        const lines = sentence.split('\n');
        let lineChunk = '';
        
        for (const line of lines) {
          const lineTokens = estimateTokens(line);
          const lineChunkTokens = estimateTokens(lineChunk);
          
          if (lineChunkTokens + lineTokens > maxTokensPerChunk) {
            if (lineChunk.trim()) {
              chunks.push(lineChunk.trim());
            }
            
            // If even a single line is too large, force split by character count
            if (lineTokens > maxTokensPerChunk) {
              const maxChars = maxTokensPerChunk * 4; // Approximate chars per chunk
              for (let i = 0; i < line.length; i += maxChars) {
                chunks.push(line.substring(i, i + maxChars).trim());
              }
              lineChunk = '';
            } else {
              lineChunk = line;
            }
          } else {
            lineChunk += (lineChunk ? '\n' : '') + line;
          }
        }
        
        if (lineChunk.trim()) {
          currentChunk = lineChunk;
        }
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk += sentence;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

/**
 * REPAIR TRUNCATED JSON
 * Attempts to fix incomplete JSON responses
 * 
 * @param {string} jsonStr - Potentially truncated JSON string
 * @returns {string} Repaired JSON string
 */
function repairTruncatedJson(jsonStr) {
  let repaired = jsonStr.trim();
  
  // Count opening and closing braces/brackets
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Close any open arrays
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  
  // Close any open objects
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  
  // Remove trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  return repaired;
}

/**
 * CLEAN JSON RESPONSE
 * Remove markdown code blocks and extract pure JSON
 * 
 * @param {string} content - Raw response content
 * @returns {string} Clean JSON string
 */
function cleanJsonResponse(content) {
  if (!content) return '{}';
  
  // Remove markdown code blocks
  let cleaned = content.trim();
  
  // Remove ```json and ``` wrappers
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  
  // Trim again
  cleaned = cleaned.trim();
  
  // Find the first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
}

/**
 * SAFE GROQ CALL
 * Makes a single Groq API call with token safety checks
 * 
 * @param {string} systemPrompt - System prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<Object>} Groq API response
 */
async function safeGroqCall(systemPrompt, userPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  const inputTokens = estimateTokens(systemPrompt + userPrompt);
  
  console.log(`[Token Check] Estimated input tokens: ${inputTokens}`);
  
  if (inputTokens > MAX_INPUT_TOKENS_PER_CALL) {
    throw new Error(`Input tokens (${inputTokens}) exceed MAX_INPUT_TOKENS_PER_CALL (${MAX_INPUT_TOKENS_PER_CALL}). Use chunking instead.`);
  }
  
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: MAX_OUTPUT_TOKENS_PER_CALL,
      temperature: 0.7
    });
    
    return response;
  } catch (error) {
    if (error.message && error.message.includes('token')) {
      console.error('[Groq Error] Token limit exceeded despite safety checks:', error);
      throw new Error('Token limit exceeded. Try with smaller input.');
    }
    throw error;
  }
}

/**
 * PARSE LONG INPUT
 * Handles long user inputs by splitting into chunks and processing each
 * Merges results from multiple Groq calls
 * 
 * @param {string} userText - User input text
 * @param {string} userId - User ID for context
 * @returns {Promise<Object>} Combined parsed intent(s)
 */
async function parseLongInput(userText, userId) {
  const systemPrompt = `You are a task management assistant. Parse user requests into structured intents.
Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Format:
{
  "action": "create_task" | "list_tasks" | "update_task" | "delete_task" | "search" | "other",
  "tasks": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
  "query": "...",
  "entities": {...}
}

If user requests multiple tasks, include all in the "tasks" array.`;

  const inputTokens = estimateTokens(systemPrompt + userText);
  
  // If input is within limits, process normally
  if (inputTokens <= MAX_INPUT_TOKENS_PER_CALL) {
    console.log('[Token Split] Input within limits, single call');
    const response = await safeGroqCall(systemPrompt, userText);
    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const cleaned = cleanJsonResponse(content);
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[Parse Error] Invalid JSON from Groq:', content.substring(0, 200));
      
      // Try to repair truncated JSON
      try {
        const repaired = repairTruncatedJson(cleanJsonResponse(content));
        console.log('[Parse] Attempting JSON repair...');
        return JSON.parse(repaired);
      } catch (e2) {
        console.error('[Parse Error] JSON repair failed, using regex fallback');
        return regexFallbackParser(userText);
      }
    }
  }
  
  // Input is too large - split into chunks
  console.log(`[Token Split] Input too large (${inputTokens} tokens), splitting...`);
  const chunks = splitTextIntoChunks(userText, MAX_INPUT_TOKENS_PER_CALL - estimateTokens(systemPrompt) - 100);
  
  console.log(`[Token Split] Created ${chunks.length} chunks`);
  
  const allIntents = [];
  let primaryAction = null;
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[Token Split] Processing chunk ${i + 1}/${chunks.length}`);
    
    try {
      const chunkPrompt = chunks.length > 1 
        ? `Part ${i + 1} of ${chunks.length} of user request:\n\n${chunks[i]}`
        : chunks[i];
      
      const response = await safeGroqCall(systemPrompt, chunkPrompt);
      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const cleaned = cleanJsonResponse(content);
        const intent = JSON.parse(cleaned);
        
        // Track primary action from first chunk
        if (i === 0) {
          primaryAction = intent.action;
        }
        
        allIntents.push(intent);
      } catch (parseError) {
        console.error(`[Token Split] JSON parse error in chunk ${i + 1}, attempting repair...`);
        
        try {
          const repaired = repairTruncatedJson(cleanJsonResponse(content));
          const intent = JSON.parse(repaired);
          
          if (i === 0) {
            primaryAction = intent.action;
          }
          
          allIntents.push(intent);
        } catch (repairError) {
          console.error(`[Token Split] Repair failed for chunk ${i + 1}, using regex fallback`);
          const fallbackIntent = regexFallbackParser(chunks[i]);
          allIntents.push(fallbackIntent);
        }
      }
    } catch (error) {
      console.error(`[Token Split] Error processing chunk ${i + 1}:`, error);
      
      // Try with smaller chunk size on error
      if (error.message.includes('token')) {
        console.log('[Token Split] Retrying with smaller chunk...');
        const smallerChunks = splitTextIntoChunks(chunks[i], Math.floor(MAX_INPUT_TOKENS_PER_CALL / 2));
        
        for (const smallChunk of smallerChunks) {
          try {
            const response = await safeGroqCall(systemPrompt, smallChunk);
            const content = response.choices[0]?.message?.content || '{}';
            const cleaned = cleanJsonResponse(content);
            const intent = JSON.parse(cleaned);
            allIntents.push(intent);
          } catch (retryError) {
            console.error('[Token Split] Retry failed:', retryError);
            // Continue with other chunks
          }
        }
      }
    }
  }
  
  // MERGE INTENTS
  return mergeIntents(allIntents, primaryAction);
}

/**
 * MERGE INTENTS
 * Combines multiple intent objects from chunked processing
 * 
 * @param {Object[]} intents - Array of intent objects
 * @param {string} primaryAction - Primary action type
 * @returns {Object} Merged intent object
 */
function mergeIntents(intents, primaryAction) {
  if (intents.length === 0) {
    return { action: 'error', message: 'No intents parsed' };
  }
  
  if (intents.length === 1) {
    return intents[0];
  }
  
  // Merge multiple intents
  const merged = {
    action: primaryAction,
    tasks: [],
    queries: [],
    entities: {},
    metadata: {
      chunked: true,
      chunkCount: intents.length
    }
  };
  
  for (const intent of intents) {
    // Merge tasks
    if (intent.tasks && Array.isArray(intent.tasks)) {
      merged.tasks.push(...intent.tasks);
    }
    
    // Merge queries
    if (intent.query) {
      merged.queries.push(intent.query);
    }
    
    // Merge entities
    if (intent.entities) {
      merged.entities = { ...merged.entities, ...intent.entities };
    }
  }
  
  // If we have many tasks, add a warning
  if (merged.tasks.length > 20) {
    merged.warning = `This is a long request with ${merged.tasks.length} tasks. Processing in batches.`;
    merged.queue = merged.tasks.slice(20); // Queue tasks beyond 20
    merged.tasks = merged.tasks.slice(0, 20); // Keep first 20 for immediate processing
  }
  
  return merged;
}

/**
 * PARSE INTENT (Main Entry Point)
 * Automatically decides whether to use single call or chunking
 * 
 * @param {string} userText - User input text
 * @param {string} userId - User ID for context
 * @returns {Promise<Object>} Parsed intent(s)
 */
async function parseIntent(userText, userId) {
  if (!userText || !userText.trim()) {
    return { action: 'error', message: 'Empty input' };
  }
  
  try {
    const systemPrompt = `You are a task management assistant. Parse user requests into structured intents.
Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Format:
{
  "action": "create_task" | "list_tasks" | "update_task" | "delete_task" | "search" | "other",
  "tasks": [{ "title": "...", "description": "...", "priority": "high|medium|low" }],
  "query": "...",
  "entities": {...}
}`;

    const inputTokens = estimateTokens(systemPrompt + userText);
    
    // Decide: simple or long input?
    if (inputTokens <= MAX_INPUT_TOKENS_PER_CALL) {
      // Simple input - single call
      console.log('[Parse Intent] Using single Groq call');
      const response = await safeGroqCall(systemPrompt, userText);
      const content = response.choices[0]?.message?.content || '{}';
      const cleaned = cleanJsonResponse(content);
      return JSON.parse(cleaned);
    } else {
      // Long input - use chunking
      console.log('[Parse Intent] Using multi-call chunking strategy');
      return await parseLongInput(userText, userId);
    }
  } catch (error) {
    console.error('[Parse Intent] Error:', error);
    
    // Friendly error message
    if (error.message && error.message.includes('token')) {
      return {
        action: 'error',
        message: 'Your message is very long, so I\'m processing it in parts. I\'ll handle as much as I can in this pass.',
        partialProcessing: true
      };
    }
    
    return {
      action: 'error',
      message: error.message || 'Failed to parse intent'
    };
  }
}

/**
 * PARSE WITH RETRY
 * Wraps parseIntent with automatic retry on JSON errors
 */
async function parseIntentWithRetry(userText, userId, retries = 1) {
  try {
    return await parseIntent(userText, userId);
  } catch (error) {
    if (retries > 0 && error.message.includes('JSON')) {
      console.log('[Parse] Retrying with regex fallback...');
      return regexFallbackParser(userText);
    }
    throw error;
  }
}

/**
 * REGEX-BASED FALLBACK PARSER
 * Ultra-simple parsing for when Groq fails
 * 
 * @param {string} text - User input text
 * @returns {Object} Basic parsed intent
 */
function regexFallbackParser(text) {
  const intent = {
    action: 'create_task',
    tasks: [],
    fallback: true
  };
  
  // Try to extract numbered tasks
  const taskMatches = text.match(/\d+\)\s*([^\n]+)/g);
  
  if (taskMatches) {
    intent.tasks = taskMatches.map(match => {
      const title = match.replace(/^\d+\)\s*/, '').trim();
      return {
        title,
        description: '',
        priority: 'medium'
      };
    });
  } else {
    // Fallback: treat each line as a task
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    intent.tasks = lines.slice(0, 50).map(line => ({
      title: line.trim(),
      description: '',
      priority: 'medium'
    }));
  }
  
  return intent;
}

module.exports = {
  parseIntent,
  parseIntentWithRetry,
  parseLongInput,
  estimateTokens,
  splitTextIntoChunks,
  safeGroqCall,
  cleanJsonResponse,
  repairTruncatedJson,
  regexFallbackParser,
  // Export constants for testing/configuration
  MAX_INPUT_TOKENS_PER_CALL,
  MAX_OUTPUT_TOKENS_PER_CALL,
  MAX_TOTAL_TOKENS_PER_CALL
};
