# 🧪 Testing Guide

## Two Ways to Test Your Groq Connection

### Option 1: CLI Test (Command Line) ⌨️

Run the interactive CLI test:

```powershell
node test-cli.js
```

**Features:**
- ✅ Check if Groq API key is configured
- ✅ Test simple tasks
- ✅ Test multiple tasks
- ✅ Test long requests (triggers chunking)
- ✅ See real-time token estimation
- ✅ See chunking in action
- ✅ Enter custom messages

**Usage:**
1. Run: `node test-cli.js`
2. Select from menu options (1-4) or enter 'c' for custom
3. Watch the token splitting happen in real-time
4. Press 'q' to quit

---

### Option 2: Web Interface (HTML/CSS) 🌐

1. **Start the server:**
   ```powershell
   npm run dev
   ```

2. **Open the web interface:**
   - In your browser, go to: http://localhost:3000
   - Or open: `public/index.html` directly

**Features:**
- ✅ Terminal-style UI (green text on black)
- ✅ Real-time token counting
- ✅ Connection status indicator
- ✅ Pre-loaded example messages
- ✅ See chunk count as you type
- ✅ Visual feedback for all operations
- ✅ Queue management

**Quick Test:**
1. Click "🔌 Test Connection" - should show green dot
2. Try "Simple Task" example
3. Try "Ultra Long (100 tasks)" to see chunking
4. Watch the terminal output in real-time

---

## 🎯 What to Look For

### Single Call (No Chunking)
```
Estimated tokens: 150
Chunks required: 1
Will split: ❌ NO
```

### Multi-Call (With Chunking)
```
Estimated tokens: 8000
Chunks required: 2
Will split: ✅ YES
⚠️ WARNING: This message will be split into 2 chunks
✨ Processed with chunking: 2 chunks
```

---

## 📊 Token Limits

- **Max Input per Call:** 6000 tokens
- **Max Output per Call:** 500 tokens
- **Total Safety Cap:** 6500 tokens

**Rule:** ~4 characters = 1 token

---

## 🐛 Troubleshooting

### CLI Test Shows API Key Error
```
❌ ERROR: GROQ_API_KEY not configured in .env file
```
**Fix:** Edit `.env` file and add your real Groq API key

### Web Interface Shows "Disconnected"
**Fix:** Make sure server is running: `npm run dev`

### Connection Timeout
**Fix:** Check if Groq API is accessible and your key is valid

---

## 📝 Example Messages to Test

### Test 1: Simple (No Chunking)
```
Create a task to review the code
```

### Test 2: Medium (No Chunking)
```
Create 5 tasks:
1) Setup environment
2) Design database
3) Build API
4) Write tests
5) Deploy
```

### Test 3: Long (Will Chunk ~2 parts)
Paste a long list of 50 tasks

### Test 4: Ultra Long (Will Chunk ~3-4 parts)
Paste a detailed list of 100 tasks with descriptions

---

## ✅ Success Indicators

**CLI:**
```
✅ SUCCESS!
⏱️  Duration: 2500ms
✨ Processed with chunking: 3 chunks
Tasks detected: 100
```

**Web:**
- Green status dot
- "Connected ✓" text
- Token count updates as you type
- Chunk count shows "2" or "3" for long messages
- Terminal shows success messages

---

## 🚀 Next Steps

Once both tests work:
1. ✅ Groq connection verified
2. ✅ Token splitting working
3. ✅ Ready to integrate with Zoho
4. ✅ Can handle any message size
