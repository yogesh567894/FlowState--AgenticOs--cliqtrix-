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
async function parseLongInput(userText, context = {}) {
  const modeContext = context.mode ? `\nCurrent mode is ${context.mode.toUpperCase()}; prefer ${context.mode}-related actions.` : '';
  
  const systemPrompt = `You are a task management assistant. Parse user requests into structured intents.

STRICT ACTION WHITELIST - ONLY return one of these actions:
create_task, list_tasks, update_priority, complete_task, delete_task, create_note, list_notes, focus, show_urgent, math, small_talk, help, unknown
${modeContext}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Format:
{
  "mode": "auto" | "tasks" | "notes" | "focus" | "chat",
  "action": "create_task" | "list_tasks" | "update_priority" | "complete_task" | "delete_task" | "create_note" | "list_notes" | "focus" | "show_urgent" | "math" | "small_talk" | "help" | "unknown",
  "entities": {
    "task_ref": "title text or number",
    "person": "assignee",
    "priority": "high|medium|low",
    "sortBy": "priority"
  },
  "tasks": [{ "title": "...", "description": "...", "priority": "high|medium|low", "assignee": "name or null" }],
  "query": "original user message"
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
      const parsed = JSON.parse(cleaned);
      parsed.query = parsed.query || userText;
      return parsed;
    } catch (e) {
      console.error('[Parse Error] Invalid JSON from Groq:', content.substring(0, 200));
      
      // Try to repair truncated JSON
      try {
        const repaired = repairTruncatedJson(cleanJsonResponse(content));
        console.log('[Parse] Attempting JSON repair...');
        const parsed = JSON.parse(repaired);
        parsed.query = parsed.query || userText;
        return parsed;
      } catch (e2) {
        console.error('[Parse Error] JSON repair failed, using regex fallback');
        return regexFallbackParser(userText);
      }
    }
  }
  
  // Input is too large - split into chunks (800-1000 chars each)
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
        intent.query = intent.query || chunks[i];
        
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
          intent.query = intent.query || chunks[i];
          
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
      if (error.message && error.message.includes('token')) {
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
    return { action: 'unknown', message: 'No intents parsed' };
  }
  
  if (intents.length === 1) {
    return intents[0];
  }
  
  // Priority order for actions (most specific/actionable first)
  const actionPriority = {
    'delete_task': 12,
    'complete_task': 11,
    'update_priority': 10,
    'create_task': 9,
    'create_note': 8,
    'show_urgent': 7,
    'focus': 6,
    'list_tasks': 5,
    'list_notes': 4,
    'math': 3,
    'help': 2,
    'small_talk': 1,
    'unknown': 0
  };
  
  // Determine best action if not already set
  if (!primaryAction) {
    let maxPriority = -1;
    for (const intent of intents) {
      const action = intent.action || 'unknown';
      const priority = actionPriority[action] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        primaryAction = action;
      }
    }
  }
  
  // Merge multiple intents
  const merged = {
    mode: intents[0].mode || 'auto',
    action: primaryAction,
    tasks: [],
    notes: [],
    entities: {},
    metadata: {
      chunked: true,
      chunkCount: intents.length
    },
    query: ''
  };
  
  for (const intent of intents) {
    // Merge tasks
    if (intent.tasks && Array.isArray(intent.tasks)) {
      merged.tasks.push(...intent.tasks);
    }
    
    // Merge notes
    if (intent.notes && Array.isArray(intent.notes)) {
      merged.notes.push(...intent.notes);
    }
    
    // Merge queries
    if (intent.query) {
      merged.query += (merged.query ? ' ' : '') + intent.query;
    }
    
    // Merge entities (later chunks override earlier ones for same key)
    if (intent.entities) {
      merged.entities = { ...merged.entities, ...intent.entities };
    }
    
    // Carry reply_hint from small_talk
    if (intent.reply_hint) {
      merged.reply_hint = intent.reply_hint;
    }
    
    // Special handling for sortBy - if any chunk has it, keep it
    if (intent.entities && intent.entities.sortBy) {
      merged.entities.sortBy = intent.entities.sortBy;
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
async function parseIntent(userText, context = {}) {
  if (!userText || !userText.trim()) {
    return { action: 'error', message: 'Empty input' };
  }
  
  try {
    // Mode context injection
    const modeContext = context.mode ? `\nCurrent mode is ${context.mode.toUpperCase()}; prefer ${context.mode}-related actions.` : '';
    
    const systemPrompt = `You are a task management assistant. Parse user requests into structured intents.

STRICT ACTION WHITELIST - ONLY return one of these actions:
create_task, list_tasks, update_priority, complete_task, delete_task, create_note, list_notes, focus, show_urgent, math, small_talk, help, unknown

RULES:
- "make X urgent/high/low" OR "change priority" → action="update_priority" with entities.priority and entities.task_ref
- "mark as done/complete X" → action="complete_task" with entities.task_ref
- "delete/remove X" → action="delete_task" with entities.task_ref
- "re arrange the list based on tasks priority" → action="list_tasks" with entities.sortBy="priority"
- "what time/day" or greetings → action="small_talk" with reply_hint
- "add 5094 + 3776" → action="math" with entities.numbers and entities.operation
- If ambiguous or unsupported → action="unknown"
${modeContext}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.
Format:
{
  "mode": "auto" | "tasks" | "notes" | "focus" | "chat",
  "action": "create_task" | "list_tasks" | "update_priority" | "complete_task" | "delete_task" | "create_note" | "list_notes" | "focus" | "show_urgent" | "math" | "small_talk" | "help" | "unknown",
  "entities": {
    "title": "task title text",
    "task_ref": "title text or number like 1,2,3 from last list",
    "person": "assignee name",
    "project": "project name",
    "priority": "high" | "medium" | "low",
    "sortBy": "priority",
    "datetime": "time reference",
    "numbers": [5094, 3776],
    "operation": "addition" | "subtraction" | "multiplication" | "division"
  },
  "tasks": [{ "title": "...", "description": "...", "priority": "high|medium|low", "assignee": "name or null" }],
  "notes": [{ "title": "...", "body": "...", "tags": [] }],
  "reply_hint": "short reply under 60 words for small_talk",
  "query": "original user message"
}`;

    const inputTokens = estimateTokens(systemPrompt + userText);
    
    // Decide: simple or long input?
    if (inputTokens <= MAX_INPUT_TOKENS_PER_CALL) {
      // Simple input - single call
      console.log('[Parse Intent] Using single Groq call');
      const response = await safeGroqCall(systemPrompt, userText);
      const content = response.choices[0]?.message?.content || '{}';
      const cleaned = cleanJsonResponse(content);
      const parsed = JSON.parse(cleaned);
      parsed.query = parsed.query || userText;
      return parsed;
    } else {
      // Long input - use chunking
      console.log('[Parse Intent] Using multi-call chunking strategy');
      return await parseLongInput(userText, context);
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
  const lowerText = text.toLowerCase();
  
  const intent = {
    mode: 'auto',
    action: 'unknown',
    tasks: [],
    entities: {},
    query: text,
    fallback: true
  };
  
  // Detect action by keywords
  if (/complete|done|finish|mark.*done/i.test(text)) {
    intent.action = 'complete_task';
    // Try to extract task reference
    const match = text.match(/complete|done|finish\s+(.+)/i);
    if (match) intent.entities.task_ref = match[1].trim();
    return intent;
  }
  
  if (/delete|remove/i.test(text)) {
    intent.action = 'delete_task';
    const match = text.match(/delete|remove\s+(.+)/i);
    if (match) intent.entities.task_ref = match[1].trim();
    return intent;
  }
  
  if (/change.*priority|make.*urgent|make.*high|make.*low|update.*priority/i.test(text)) {
    intent.action = 'update_priority';
    // Extract priority
    if (/\b(high|urgent)\b/i.test(text)) intent.entities.priority = 'high';
    else if (/\blow\b/i.test(text)) intent.entities.priority = 'low';
    else intent.entities.priority = 'medium';
    return intent;
  }
  
  if (/show|list|display.*tasks/i.test(text)) {
    intent.action = 'list_tasks';
    // Check for sorting
    if (/sort|arrange.*priority/i.test(text)) intent.entities.sortBy = 'priority';
    return intent;
  }
  
  if (/note:/i.test(text) || /remember|save this|meeting/i.test(text)) {
    intent.action = 'create_note';
    intent.notes = [{ title: text.substring(0, 50), body: text, tags: [] }];
    return intent;
  }
  
  if (/focus|pomodoro/i.test(text)) {
    intent.action = 'focus';
    return intent;
  }
  
  if (/what.*urgent|show urgent/i.test(text)) {
    intent.action = 'show_urgent';
    return intent;
  }
  
  if (/^\s*\d+\s*[\+\-\*\/]\s*\d+/.test(text)) {
    intent.action = 'math';
    const mathMatch = text.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
    if (mathMatch) {
      intent.entities.numbers = [parseInt(mathMatch[1]), parseInt(mathMatch[3])];
      intent.entities.operation = {
        '+': 'addition',
        '-': 'subtraction',
        '*': 'multiplication',
        '/': 'division'
      }[mathMatch[2]];
    }
    return intent;
  }
  
  if (/^(hi|hello|hey|what time|what day|help)/i.test(text)) {
    if (/help/i.test(text)) intent.action = 'help';
    else intent.action = 'small_talk';
    return intent;
  }
  
  // Default: try to extract tasks
  intent.action = 'create_task';
  
  // Try to extract numbered tasks
  const taskMatches = text.match(/\d+[\)\.]\s*([^\n]+)/g);
  
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
