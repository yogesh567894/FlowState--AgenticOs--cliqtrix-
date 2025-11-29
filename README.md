# Zoho Backend with Groq Token Splitting

A robust backend system with **automatic token splitting** for handling large prompts using Groq's Mixtral-8x7b model.

## 🎯 Key Features

### Token Safety Layer
- **Hard limits enforced**: Never exceeds 6000 input tokens per Groq call
- **Automatic chunking**: Long inputs automatically split into N parts
- **Intelligent merging**: Results from multiple calls seamlessly combined
- **Fallback protection**: Graceful degradation when token limits are hit

### Token Limits Configuration

```javascript
MAX_INPUT_TOKENS_PER_CALL = 6000       // Safety cap per request
MAX_OUTPUT_TOKENS_PER_CALL = 500       // Limit max_tokens in Groq call
MAX_TOTAL_TOKENS_PER_CALL = 6500       // Input + output hard cap
```

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Groq API key:

```
GROQ_API_KEY=your_actual_groq_api_key_here
PORT=3000
```

### 3. Run Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 4. Test Token Splitting

```bash
npm test
```

## 📡 API Endpoints

### POST `/api/webhook`

Main endpoint for processing user messages with automatic token splitting.

**Request:**
```json
{
  "message": "Create 100 tasks for my project...",
  "userId": "user123",
  "source": "web"
}
```

**Response (Normal):**
```json
{
  "success": true,
  "message": "Successfully created 20 tasks",
  "tasksCreated": 20,
  "tasks": [...],
  "pendingActions": 80,
  "warning": "This is a long request with 100 tasks. Processing in batches."
}
```

**Response (Token Splitting Active):**
```json
{
  "success": true,
  "message": "Successfully created 100 tasks",
  "tasksCreated": 100,
  "tasks": [...],
  "metadata": {
    "chunked": true,
    "chunkCount": 5
  }
}
```

### POST `/api/webhook/process-queue`

Process queued tasks from previous large requests.

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 10 queued actions. 70 remaining.",
  "processed": 10,
  "remaining": 70
}
```

### GET `/health`

Health check endpoint showing token configuration.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-30T...",
  "tokenLimits": {
    "maxInputTokens": 6000,
    "maxOutputTokens": 500,
    "maxTotalTokens": 6500
  }
}
```

## 🔧 How Token Splitting Works

### 1. Token Estimation
```javascript
// Rough rule: 1 token ≈ 4 characters
estimateTokens(text) → number
```

### 2. Automatic Detection
Before every Groq call:
- Estimate total input tokens (system + user prompt)
- If tokens ≤ 6000 → single call
- If tokens > 6000 → automatic chunking

### 3. Intelligent Chunking
```javascript
splitTextIntoChunks(text, maxTokensPerChunk) → string[]
```

Splits on:
1. **Sentence boundaries** (preferred)
2. **Line boundaries** (fallback)
3. **Character count** (last resort)

### 4. Multi-Call Processing
```javascript
parseLongInput(userText, userId):
  - Split into N chunks
  - Call Groq N times (one per chunk)
  - Merge results intelligently
  - Return combined intent
```

### 5. Result Merging
- Combines tasks from all chunks
- Preserves task order
- Queues excess tasks (>20) for batch processing
- Maintains metadata about chunking

## 📊 Example Scenarios

### Scenario 1: Short Input (No Splitting)
```
User: "Create 3 tasks: setup, design, deploy"

Tokens: ~50
Action: Single Groq call
Result: 3 tasks created immediately
```

### Scenario 2: Long Input (Automatic Splitting)
```
User: "Create 100 tasks:
1) Task 1 with detailed description...
2) Task 2 with detailed description...
...
100) Task 100 with detailed description..."

Tokens: ~8000
Action: Split into 2 chunks (4000 tokens each)
Groq Calls: 2
Result: 100 tasks created, merged from both calls
```

### Scenario 3: Ultra-Long Input (Queue Management)
```
User: "Create 150 tasks with very detailed descriptions..."

Tokens: ~15000
Action: Split into 3 chunks
Tasks Created: First 20 immediately
Tasks Queued: Remaining 130 for batch processing
Message: "Processing in batches. 130 tasks queued."
```

## 🛡️ Safety Features

### 1. Never Exceed Limits
```javascript
// Before EVERY Groq call
if (inputTokens > MAX_INPUT_TOKENS_PER_CALL) {
  throw Error("Use chunking instead");
}
```

### 2. Error Recovery
```javascript
try {
  // Groq call
} catch (error) {
  if (error.includes('token')) {
    // Retry with smaller chunks
    splitIntoSmallerChunks();
  }
}
```

### 3. Fallback Parsing
If Groq fails completely, use regex-based parsing:
```javascript
regexFallbackParser(text) → basicIntent
```

### 4. Graceful Degradation
```
"Your message is very long, so I'm processing it in parts. 
I'll handle as much as I can in this pass."
```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Tests cover:
- ✅ Token estimation accuracy
- ✅ Short text (no splitting)
- ✅ Long text (splitting required)
- ✅ Edge cases (very long sentences)
- ✅ Sentence boundary splitting
- ✅ Character-based fallback

## 📁 Project Structure

```
zoho/
├── services/
│   └── nlp.js                 # Token splitting & Groq integration
├── webhooks/
│   └── webhook.js             # Request handlers with queue management
├── utils/
│   └── userManager.js         # User data persistence
├── tests/
│   └── test-token-splitting.js # Test suite
├── data/
│   └── users.json             # User data storage (created at runtime)
├── server.js                  # Express server entry point
├── package.json
├── .env.example
└── README.md
```

## 🔑 Key Functions

### In `services/nlp.js`:

| Function | Purpose |
|----------|---------|
| `estimateTokens(text)` | Calculate approximate token count |
| `splitTextIntoChunks(text, maxTokens)` | Split text into valid chunks |
| `safeGroqCall(system, user)` | Make single Groq call with safety |
| `parseLongInput(text, userId)` | Handle multi-chunk processing |
| `parseIntent(text, userId)` | Main entry point (auto-detects chunking) |
| `mergeIntents(intents, action)` | Combine results from N chunks |

## 🎛️ Configuration

Adjust token limits in `services/nlp.js`:

```javascript
const MAX_INPUT_TOKENS_PER_CALL = 6000;   // Increase/decrease as needed
const MAX_OUTPUT_TOKENS_PER_CALL = 500;   // Groq response limit
const MAX_TOTAL_TOKENS_PER_CALL = 6500;   // Total safety cap
```

## 📝 Usage Examples

### Example 1: Simple Request
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a task to review code",
    "userId": "user123"
  }'
```

### Example 2: Long Request
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d @long_task_list.json
```

### Example 3: Process Queue
```bash
curl -X POST http://localhost:3000/api/webhook/process-queue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123"
  }'
```

## 🚨 Error Handling

The system handles various error scenarios:

1. **Token Limit Exceeded** → Automatic chunking
2. **Groq API Error** → Retry with smaller chunks
3. **Parsing Error** → Fallback to regex parser
4. **Invalid JSON** → Friendly error message

## 📈 Performance

- **Single call latency**: ~1-2 seconds
- **Chunked call latency**: ~2-5 seconds (depending on chunk count)
- **Max concurrent chunks**: Sequential (one at a time to avoid rate limits)
- **Queue processing**: 10 tasks per batch

## 🤝 Contributing

1. Test token splitting with various input sizes
2. Monitor Groq API responses for token errors
3. Adjust MAX_INPUT_TOKENS_PER_CALL if needed
4. Report issues with specific token counts

## 📄 License

MIT

---

**Built with token safety in mind** 🛡️ **Never exceeds Groq limits** 🚀
