# Task Assignment & Cross-User Visibility

## Features Implemented

### 1. Update Task Action
Tasks can now be updated with new assignees, priorities, and descriptions without creating duplicates.

**Action**: `update_task`

**Usage Examples**:
```
"doc review is assigned to yogesh"
"assign task 1 to john"
"change assignee of setup task to alice"
"update documentation task assignee to bob"
```

### 2. Cross-User Task Visibility
Users can now see tasks that are assigned to them, even if created by other users.

**How it Works**:
- When you create a task and assign it to someone (e.g., "create task: doc review assigned to yogesh")
- The task is stored under the creator's account (alan)
- When the assignee (yogesh) runs "list" or "list all my tasks"
- They will see tasks assigned to them from all users

### 3. Improved Assignment Parsing
The NLP now correctly distinguishes between:
- **Creating a new task**: "create a task to review docs"
- **Assigning existing task**: "doc review is assigned to yogesh" → Updates existing task
- **Creating with assignee**: "create task: review PR assigned to alice" → Creates new task with assignee

## API Changes

### New Function: `updateTask(userId, taskId, updates)`
```javascript
const updates = {
  assignee: "yogesh",      // Change assignee
  priority: "high",        // Change priority
  description: "new desc"  // Update description
};

const result = updateTask(userId, taskId, updates);
// Returns: { updated: 1, task: {...}, changes: {...} }
```

### New Function: `getTasksAssignedTo(assignee)`
```javascript
const tasks = getTasksAssignedTo("yogesh");
// Returns all tasks assigned to "yogesh" from all users
```

## NLP Updates

### New Entities
- `entities.assignee` - Person to assign task to
- `entities.updates` - Object containing update fields
  - `updates.assignee` - New assignee
  - `updates.priority` - New priority
  - `updates.description` - New description

### Updated System Prompt
The NLP now includes rules for:
- "X is assigned to Y" → `action="update_task"`
- "assign X to Y" → `action="update_task"`
- "update/change/modify task X" → `action="update_task"`

## Testing Scenarios

### Scenario 1: Create and Assign
```bash
User: alan
Command: "create a task to review docs assigned to yogesh"
Result: Task created under alan, assigned to yogesh
```

### Scenario 2: Update Assignment
```bash
User: alan
Command: "list"
Output: 1. Doc Review [unassigned]

Command: "doc review is assigned to yogesh"
Result: Task updated (not duplicated)

Command: "list"
Output: 1. Doc Review [@yogesh]
```

### Scenario 3: Cross-User Visibility
```bash
User: alan
Command: "create task: api testing assigned to yogesh"
Result: Task created

User: yogesh (different user)
Command: "list all my tasks"
Result: Shows task "api testing" (created by alan but assigned to yogesh)
```

### Scenario 4: Multiple Assignments
```bash
User: alan
Command: "create 3 tasks: 
1. frontend review assigned to alice
2. backend testing assigned to bob  
3. deployment assigned to charlie"

User: alice
Command: "list"
Result: Shows "frontend review" task

User: bob
Command: "list"
Result: Shows "backend testing" task
```

## Implementation Details

### Webhook Handler
- Added `case 'update_task'` to route handler
- Added `handleUpdateTask()` function
- Updated `handleListTasks()` to merge assigned tasks

### Tasks Service
- Added `updateTask()` function
- Added `getTasksAssignedTo()` function
- Updated exports

### NLP Service
- Added `update_task` to action whitelist
- Updated system prompts (both short and long)
- Added assignment parsing rules
- Increased action priority for `update_task`

## Response Format

### Update Task Success
```json
{
  "success": true,
  "message": "✅ Updated task: **Doc Review**\n\n👤 Assignee: unassigned → @yogesh\n",
  "structured": {
    "type": "task_updated",
    "taskId": "task_123...",
    "changes": {
      "assignee": { "old": null, "new": "yogesh" }
    }
  }
}
```

### List Tasks (Cross-User)
Tasks now include `owner` field when assigned from another user:
```json
{
  "id": "task_123...",
  "title": "Doc Review",
  "assignee": "yogesh",
  "priority": "medium",
  "status": "pending",
  "owner": "alan"  // Added when task is from another user
}
```

## Notes

- Tasks assigned to a user are visible in their "list" command
- Original task owner retains the task in their list
- Assignments are case-insensitive ("Yogesh" = "yogesh")
- Update operations maintain task history via `updatedAt` timestamp
- Cross-user visibility only applies to pending tasks (not completed/deleted)
