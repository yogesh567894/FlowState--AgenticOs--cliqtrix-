# FlowState

**An Agentic OS for eliminating coordination tax.**

🚧 *Prototype developed for Zoho Cliqtrix 2025*

---

## 🧠 The Vision

Coordination is broken. We spend more time managing tasks than doing them. FlowState is an agentic OS designed to eliminate "coordination tax" by turning natural language into structured workflows automatically.

While built for the Zoho ecosystem, the core architecture—handling ambiguity, managing token limits, and ensuring reliability—is scalable to any agentic workflow.

---

## 📺 Demo

[Watch the Demo (60s)](https://www.youtube.com/watch?v=LOyjrcoowOQ)

---

## 🚧 Status & Roadmap

- **Current:** MVP/Proof-of-Concept built in <24 hours. Handles basic intent parsing, token safety, and task creation.
- **Next:** Implementing context retention across sessions, multi-agent handoffs, and vector-based semantic retrieval.
- **Goal:** A fully autonomous "Level 3" agentic OS.

---


## ✨ Core Architecture

### Minimalistic CLI Interface
- **Terminal-style UI**: Clean, distraction-free command interface
- **Keyboard shortcuts**: Enter to send, Shift+Enter for new line
- **Real-time feedback**: Token counting and status updates
- **Command history**: All interactions logged in terminal view

### Task Management & Collaboration
- **Task assignment**: Assign tasks to team members
- **Cross-user visibility**: See tasks assigned to you from other users
- **Update tasks**: Modify assignees, priorities without creating duplicates
- **Smart task resolution**: Reference tasks by title or number

### Token Safety Layer (Critical Reliability Feature)
- **Hard limits enforced**: Never exceeds 6000 input tokens per Groq call
- **Automatic chunking**: Long inputs automatically split into N parts
- **Intelligent merging**: Results from multiple calls seamlessly combined
- **Fallback protection**: Graceful degradation when token limits are hit

### Graceful Degradation
- **Engineered fallback parsers**: Regex-based parsing when LLM reasoning fails
- **Error recovery**: Automatic retry with adjusted parameters
- **Queue management**: Handles excess tasks through batch processing
- **Context preservation**: Maintains state across chunked operations

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

### 4. Access State OS Interface

Open your browser and navigate to:
```
http://localhost:3000
```

You'll see the minimalistic CLI interface with:
- Real-time token counting
- Automatic connection status
- Terminal-style command input
- Quick example commands

### 5. Test Token Splitting

```bash
npm test
```

## 💻 Using the CLI Interface

### Quick Start
1. Enter your user ID (default: `test_user_001`)
2. Type your command in the input box
3. Press **Enter** to send (or **Shift+Enter** for new line)
4. Watch the terminal for real-time feedback

### Keyboard Shortcuts
- `Enter` → Send message
- `Shift + Enter` → New line (multi-line input)

### Command Format
```
user@flowstate:~$ create task: setup development environment
```

### Example Commands
```bash
# Simple task
create task: review pull requests and update docs

# Multiple tasks
create 5 tasks:
1) setup dev environment
2) design db schema
3) implement auth
4) create api endpoints
5) write tests

# Long requests (automatic chunking)
create 50 tasks: [detailed list...]
```

### Built-in Examples
Click the example buttons (`ex1`, `ex2`, `ex3`) to load:
- **ex1**: Simple single task
- **ex2**: Multiple tasks (5)
- **ex3**: Long request (50 tasks) - tests chunking

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
flowstate/
├── public/
│   └── index.html             # Minimalistic CLI interface
├── services/
│   ├── nlp.js                 # Token splitting & Groq integration
│   ├── context.js             # Context management
│   ├── focus.js               # Focus mode handling
│   ├── formatter.js           # Response formatting
│   ├── notes.js               # Note management
│   └── tasks.js               # Task management
├── webhooks/
│   └── webhook.js             # Request handlers with queue management
├── utils/
│   └── userManager.js         # User data persistence
├── tests/
│   └── test-token-splitting.js # Test suite
├── data/
│   ├── users.json             # User data storage
│   └── notes.json             # Notes storage
├── server.js                  # Express server entry point
├── package.json
├── .env.example
└── README.md
```

## 🎨 Interface Features

### Terminal Display
- **Real-time logging**: All commands and responses shown in terminal
- **Color coding**: 
  - Green: Success messages and output
  - Red: Errors
  - Orange: Warnings
  - Gray: System info
- **Command echo**: Your input is displayed before processing
- **Auto-scroll**: Terminal automatically scrolls to latest output

### Status Bar
- **Connection status**: online/offline indicator
- **API endpoint**: Shows if running locally or in production
- **Token counter**: Real-time token estimation
- **Chunk indicator**: Shows if message will be split
- **Status**: ok/split based on message length

### Input Controls
- Minimalistic input fields with inline labels
- Focus effects on active inputs
- Token info updated in real-time
- Auto-clear after successful send
- Auto-focus for quick next command

## 🌐 Deployment

### Local Development
```bash
npm run dev
# Access at http://localhost:3000
```

### Production Deployment
The interface auto-detects the environment and adjusts API calls accordingly:
- **Local**: Calls `http://localhost:3000`
- **Production**: Calls the deployed domain

Deploy to platforms like:
- Vercel
- Heroku
- Railway
- DigitalOcean

## 🎛️ Configuration

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
- **Interface**: Lightweight, instant load, minimal CSS

## 🎨 Design Philosophy

FlowState follows these principles:

1. **Minimalism**: No unnecessary UI elements or decorations
2. **Efficiency**: Keyboard-first workflow (Enter to send)
3. **Clarity**: Clear, concise feedback in terminal format
4. **Speed**: Instant visual feedback, no loading states
5. **Accessibility**: High contrast, readable monospace fonts
6. **Reliability**: Token safety and graceful degradation as first-class concerns

---

## 🤝 Contributing

We welcome contributions focused on:

1. Testing token splitting with various input sizes
2. Monitoring Groq API responses for token errors
3. Suggesting reliability improvements
4. UI/UX enhancements for the CLI interface
5. Documentation and code examples

---

## 🛣️ Roadmap

### Phase 1: Foundation (Current)
- [x] Token safety layer with automatic chunking
- [x] Minimalistic CLI interface
- [x] Task assignment and cross-user visibility
- [x] Graceful degradation with fallback parsers

### Phase 2: Intelligence (Next)
- [ ] Context retention across sessions
- [ ] Multi-agent handoffs
- [ ] Vector-based semantic retrieval
- [ ] Command history (up/down arrow navigation)

### Phase 3: Autonomy (Future)
- [ ] Auto-complete for common commands
- [ ] WebSocket for real-time updates
- [ ] Voice input support
- [ ] Custom themes (dark, light, matrix)
- [ ] Multi-user support with authentication
- [ ] Export terminal session

---

## 📄 License

MIT

---

**Built with ❤️ for Zoho Cliqtrix 2025**

---

**State OS** - Built with minimalism and token safety in mind 🛡️ | Never exceeds Groq limits 🚀 | CLI-first interface ⚡

