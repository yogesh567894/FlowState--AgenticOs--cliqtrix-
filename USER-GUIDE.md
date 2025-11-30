# 🚀 FlowState Bot - Complete User Guide

## 📖 Table of Contents
1. [Getting Started](#getting-started)
2. [Web Interface](#web-interface)
3. [API Integration](#api-integration)
4. [Task Management](#task-management)
5. [Note Taking](#note-taking)
6. [Focus Mode](#focus-mode)
7. [Math Calculations](#math-calculations)
8. [Advanced Features](#advanced-features)
9. [Examples & Use Cases](#examples--use-cases)

---

## 🎯 Getting Started

### What is FlowState Bot?
FlowState is an AI-powered conversational assistant that helps you manage tasks, take notes, stay focused, and boost productivity through natural language commands.

### Quick Access
- **🌐 Web App**: https://flow-state-agentic-os-cliqtrix.vercel.app
- **📚 API Docs**: https://flow-state-agentic-os-cliqtrix.vercel.app/api
- **💚 Health Check**: https://flow-state-agentic-os-cliqtrix.vercel.app/health

---

## 🖥️ Web Interface

### How to Use the Web UI

1. **Open the App**
   - Visit: https://flow-state-agentic-os-cliqtrix.vercel.app
   - You'll see a terminal-style interface

2. **Type Your Commands**
   - Just type naturally! Examples:
     - "create a task to review code"
     - "show my tasks"
     - "note: remember to call John"
     - "calculate 100 + 50"

3. **Press Enter**
   - The bot will understand and respond

4. **View History**
   - All your commands and responses stay visible
   - Scroll up to see previous interactions

### Pro Tips for Web UI
- ✅ Type naturally - the AI understands context
- ✅ Use "help" to see all available commands
- ✅ Your data is saved (tasks, notes persist)
- ✅ Works on mobile and desktop

---

## 🔌 API Integration

### For Developers

#### Basic API Call

```bash
curl -X POST https://flow-state-agentic-os-cliqtrix.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "message": "create a task to review code"
  }'
```

#### JavaScript Example

```javascript
async function sendMessage(userId, message) {
  const response = await fetch('https://flow-state-agentic-os-cliqtrix.vercel.app/api/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId,
      message: message
    })
  });
  
  const data = await response.json();
  console.log(data.reply);
  return data;
}

// Usage
sendMessage('user123', 'show my tasks');
```

#### Python Example

```python
import requests

def send_message(user_id, message):
    url = 'https://flow-state-agentic-os-cliqtrix.vercel.app/api/webhook'
    payload = {
        'userId': user_id,
        'message': message
    }
    response = requests.post(url, json=payload)
    return response.json()

# Usage
result = send_message('user123', 'create a task to review code')
print(result['reply'])
```

#### PowerShell Example

```powershell
$body = @{
    userId = "user123"
    message = "show my tasks"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://flow-state-agentic-os-cliqtrix.vercel.app/api/webhook" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"

Write-Host $response.reply
```

---

## ✅ Task Management

### Creating Tasks

**Natural Language (Recommended)**
```
"I need to review code tomorrow"
"remind me to call John"
"create a task to prepare presentation"
```

**Explicit Format**
```
"create task: Review pull requests"
"add task: Update documentation"
"new task: Schedule team meeting"
```

### Viewing Tasks

```
"show my tasks"
"list tasks"
"what tasks do I have?"
"show me my todo list"
```

### Completing Tasks

```
"complete task 1"
"finish task 2"
"mark task 3 as done"
"done with task 1"
```

### Deleting Tasks

```
"delete task 1"
"remove task 2"
"cancel task 3"
```

### Setting Priority

```
"set task 1 to high priority"
"make task 2 urgent"
"change task 3 priority to low"
```

### Task Examples

```
User: "create a task to review the quarterly report by Friday"
Bot: ✅ Task created successfully!
     📝 Task 1: Review the quarterly report by Friday (Pending)

User: "show my tasks"
Bot: 📋 You have 1 task:
     1. Review the quarterly report by Friday [Pending] - Normal priority

User: "make task 1 high priority"
Bot: ✅ Task 1 priority updated to high

User: "complete task 1"
Bot: ✅ Task 1 marked as completed!
```

---

## 📝 Note Taking

### Creating Notes

**Quick Notes**
```
"note: Remember to backup database"
"remember: Meeting room changed to B101"
"jot down: Password reset link sent to client"
```

**Natural Language**
```
"make a note about the client feedback"
"remember that the deadline is December 15"
"save this: Server IP is 192.168.1.100"
```

### Viewing Notes

```
"show my notes"
"list notes"
"what notes do I have?"
"show all notes"
```

### Deleting Notes

```
"delete note 1"
"remove note 2"
"clear note 3"
```

### Note Examples

```
User: "note: API key expires on Jan 1st, 2026"
Bot: ✅ Note saved successfully!
     📝 Note 1: API key expires on Jan 1st, 2026

User: "show my notes"
Bot: 📝 You have 1 note:
     1. API key expires on Jan 1st, 2026

User: "note: Remember to update SSL certificate"
Bot: ✅ Note saved successfully!
     📝 Note 2: Remember to update SSL certificate
```

---

## ⏱️ Focus Mode

### Starting Focus Sessions

**Standard Pomodoro (25 minutes)**
```
"start focus mode"
"begin focus session"
"let's focus"
```

**Custom Duration**
```
"focus for 45 minutes"
"start focus mode for 1 hour"
"begin 30 minute focus session"
```

### Checking Focus Status

```
"focus status"
"am I in focus mode?"
"check my focus"
```

### Stopping Focus

```
"stop focus"
"end focus mode"
"cancel focus session"
```

### Focus Examples

```
User: "start focus mode for 45 minutes"
Bot: ⏱️ Focus mode activated! 🧘
     Duration: 45 minutes
     Stay focused - you've got this! 💪

User: "focus status"
Bot: ⏱️ Focus mode active
     Time remaining: 40 minutes

User: "stop focus"
Bot: ✅ Focus session ended!
     Great work! Time to take a break 🎉
```

---

## 🔢 Math Calculations

### Simple Calculations

```
"calculate 100 + 50"
"what is 25 * 4?"
"solve 1000 / 8"
"compute 45 - 12"
```

### Complex Expressions

```
"calculate (100 + 50) * 2"
"what is 25% of 200?"
"solve 2^8"
```

### Math Examples

```
User: "calculate 100 + 50"
Bot: 🔢 Calculation Result:
     100 + 50 = 150

User: "what is 25 * 4?"
Bot: 🔢 Calculation Result:
     25 * 4 = 100
```

---

## 🚀 Advanced Features

### Priority Management

Set task priorities to organize your work:
- **High**: Urgent, important tasks
- **Normal**: Regular daily tasks
- **Low**: Nice-to-have, low-urgency items

```
"set task 1 to high priority"
"make task 2 low priority"
```

### Context-Aware Conversations

The bot remembers your context within a conversation:

```
User: "create a task to review code"
Bot: ✅ Task created successfully!

User: "make it high priority"
Bot: ✅ Task 1 priority updated to high

User: "and set it for tomorrow"
Bot: ✅ Task updated with due date
```

### Natural Language Understanding

You don't need exact commands - the AI understands variations:

✅ "I need to do something"
✅ "remind me to do X"
✅ "don't forget Y"
✅ "make a note about Z"
✅ "calculate the sum"

### Multi-Task Creation

Create multiple tasks in one message:

```
"I need to review code, update docs, and schedule a meeting"
```

The bot will create separate tasks for each item.

---

## 💡 Examples & Use Cases

### Daily Standup Workflow

```
1. "show my tasks" - Review what's on your plate
2. "create task: Complete feature X" - Add new work
3. "complete task 2" - Mark yesterday's work done
4. "start focus mode for 2 hours" - Get to work
```

### Project Planning

```
1. "create task: Research competitor features"
2. "create task: Draft project proposal"
3. "create task: Schedule kickoff meeting"
4. "set task 1 to high priority"
5. "show my tasks" - Review the plan
```

### Meeting Notes

```
1. "note: Team meeting - discussed Q4 goals"
2. "note: Action item - John to send report by Friday"
3. "note: Next meeting scheduled for Dec 5"
4. "show my notes" - Review what was discussed
```

### Study Session

```
1. "create task: Review chapter 5"
2. "create task: Complete practice problems"
3. "start focus mode for 45 minutes"
4. "note: Key concept - recursion vs iteration"
```

### Quick Calculations

```
1. "calculate 15% of 250" - Tip calculation
2. "what is 52 * 40?" - Weekly to yearly conversion
3. "solve 1200 / 4" - Quarterly breakdown
```

---

## 🎯 Command Cheat Sheet

### Quick Reference

| Category | Command Example | What It Does |
|----------|----------------|--------------|
| **Tasks** | `create task: X` | Creates a new task |
| | `show my tasks` | Lists all tasks |
| | `complete task 1` | Marks task as done |
| | `delete task 1` | Removes a task |
| | `set task 1 to high priority` | Changes priority |
| **Notes** | `note: X` | Saves a note |
| | `show my notes` | Lists all notes |
| | `delete note 1` | Removes a note |
| **Focus** | `start focus mode` | 25-min session |
| | `focus for 45 minutes` | Custom duration |
| | `focus status` | Check progress |
| | `stop focus` | End session |
| **Math** | `calculate X + Y` | Does calculation |
| **Help** | `help` | Shows all commands |

---

## ❓ Troubleshooting

### Common Issues

**"I'm not sure what you mean..."**
- Try rephrasing your command
- Use examples from this guide
- Type "help" for command list

**Tasks not showing up**
- Make sure you include "task" in your message
- Try explicit format: "create task: X"

**Focus mode not working**
- Specify duration: "focus for 25 minutes"
- Check status: "focus status"

---

## 🔗 Quick Links

- **Web App**: https://flow-state-agentic-os-cliqtrix.vercel.app
- **API Docs**: https://flow-state-agentic-os-cliqtrix.vercel.app/api
- **Health Check**: https://flow-state-agentic-os-cliqtrix.vercel.app/health

---

## 💬 Getting Help

Type `help` in the bot for a quick command reference, or refer back to this guide anytime!

**Happy flowing! 🎯✨**
