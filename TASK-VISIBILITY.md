# Task Visibility & Scope Management

## Overview
State OS now supports differentiated task views to help users distinguish between tasks they created and tasks assigned to them by others.

## Command Variations

### 1. **List All Tasks** (Default)
Shows both owned tasks and tasks assigned to you by others.

**Commands**:
- `list`
- `list tasks`
- `list all tasks`
- `show all tasks`

**Example Output**:
```
📋 **All Tasks** (4) - 1 created by me, 3 assigned to me

🟡 **MEDIUM** (3)
  1. doc review [@yogesh] (by @alan)
  2. Update Documentation [@yogesh]
  3. UIUX task [@Alan]

🟢 **LOW** (1)
  1. Refactor Legacy Code [@Yogesh] (by @alice)
```

**Legend**:
- `[@assignee]` - Person assigned to the task
- `(by @owner)` - Task created by another user (only shown for tasks assigned to you)

---

### 2. **List My Tasks**
Shows only tasks you created (owned by you), regardless of assignee.

**Commands**:
- `list my tasks`
- `show my tasks`
- `my tasks`

**Example Output**:
```
📋 **My Tasks** (2)

🟡 **MEDIUM** (2)
  1. doc review [@yogesh]
  2. UIUX task [@Alan]
```

**Note**: This view shows tasks you created, even if they're assigned to others.

---

## Use Cases

### Scenario 1: Team Lead Managing Assignments
```bash
alan@stateos:~$ create task: frontend review assigned to alice
> ✅ Task created

alan@stateos:~$ create task: backend review assigned to bob
> ✅ Task created

alan@stateos:~$ list my tasks
> 📋 **My Tasks** (2)
> 1. frontend review [@alice]
> 2. backend review [@bob]
```

### Scenario 2: Team Member Viewing Their Work
```bash
alice@stateos:~$ list all tasks
> 📋 **All Tasks** (1)
> 1. frontend review [@alice] (by @alan)

alice@stateos:~$ list my tasks
> 📋 **My Tasks** (0)
> No tasks yet
```

### Scenario 3: Mixed Ownership
```bash
yogesh@stateos:~$ create task: setup env assigned to yogesh
> ✅ Task created

alan@stateos:~$ create task: code review assigned to yogesh
> ✅ Task created

yogesh@stateos:~$ list all tasks
> 📋 **All Tasks** (2) - 1 created by me, 1 assigned to me
> 1. setup env [@yogesh]
> 2. code review [@yogesh] (by @alan)

yogesh@stateos:~$ list my tasks
> 📋 **My Tasks** (1)
> 1. setup env [@yogesh]
```

---

## Delete Behavior

### Delete All
When you run `delete all`, it only deletes tasks you created, NOT tasks assigned to you by others.

```bash
yogesh@stateos:~$ list all tasks
> 4 tasks (1 created by me, 3 assigned to me)

yogesh@stateos:~$ delete all
> 🗑️ Deleted all 1 task you created!
> 💡 Note: Tasks assigned to you by others were not deleted.

yogesh@stateos:~$ list all tasks
> 3 tasks (all assigned to you by others)
```

**Rationale**: You can only delete tasks you own. Tasks created by others remain in their account even if assigned to you.

---

## Implementation Details

### NLP Changes
1. **New Entity**: `entities.scope`
   - `"my"` - Show only owned tasks
   - `"all"` - Show owned + assigned tasks (default)

2. **Regex Fallback**:
   ```javascript
   if (/\bmy\s+tasks?\b/i.test(text)) {
     intent.entities.scope = 'my';
   } else if (/\ball\s+tasks?\b/i.test(text)) {
     intent.entities.scope = 'all';
   }
   ```

3. **System Prompt Rules**:
   - "list my tasks" → `scope="my"`
   - "list all tasks" OR "list tasks" → `scope="all"`

### Formatter Changes
1. **Header Differentiation**:
   - **My Tasks**: `📋 **My Tasks** (count)`
   - **All Tasks**: `📋 **All Tasks** (count) - X created by me, Y assigned to me`

2. **Task Annotations**:
   - Always show assignee: `[@assignee]`
   - Show owner for cross-user tasks: `(by @owner)`

3. **Context Awareness**:
   ```javascript
   formatTaskList(tasks, {
     currentUser: userId,
     showOnlyOwned: scope === 'my'
   });
   ```

### Webhook Handler Changes
1. **Scope Detection**:
   ```javascript
   const scope = intent.entities?.scope || 'all';
   const showOnlyOwned = scope === 'my';
   ```

2. **Conditional Cross-User Query**:
   ```javascript
   if (!showOnlyOwned) {
     const assignedTasks = getTasksAssignedTo(userId);
     // Merge with owned tasks
   }
   ```

3. **Delete All Protection**:
   - Only deletes tasks owned by the user
   - Shows helpful message about assigned tasks

---

## API Response Format

### List All Tasks
```json
{
  "success": true,
  "message": "📋 **All Tasks** (4) - 1 created by me, 3 assigned to me\n...",
  "structured": {
    "type": "tasks_list",
    "count": 4,
    "ownedCount": 1,
    "assignedCount": 3
  }
}
```

### List My Tasks
```json
{
  "success": true,
  "message": "📋 **My Tasks** (1)\n...",
  "structured": {
    "type": "tasks_list",
    "count": 1,
    "ownedCount": 1,
    "assignedCount": 0
  }
}
```

---

## Testing Scenarios

### Test 1: Basic Scope Switching
```bash
# User creates tasks
alan@stateos:~$ create 2 tasks: task1, task2 assigned to yogesh

# Yogesh views all (sees alan's tasks)
yogesh@stateos:~$ list all tasks
> 2 tasks assigned to you

# Yogesh views own (sees nothing)
yogesh@stateos:~$ list my tasks
> No tasks yet

# Yogesh creates own task
yogesh@stateos:~$ create task: my task

# Yogesh views all (sees 3 total)
yogesh@stateos:~$ list all tasks
> 3 tasks (1 created by me, 2 assigned to me)

# Yogesh views own (sees 1)
yogesh@stateos:~$ list my tasks
> 1 task
```

### Test 2: Delete Protection
```bash
yogesh@stateos:~$ list all tasks
> 3 tasks

yogesh@stateos:~$ delete all
> Deleted 1 task (yours only)

yogesh@stateos:~$ list all tasks
> 2 tasks (assigned by alan)
```

### Test 3: Assignment vs Creation
```bash
alan@stateos:~$ create task: review assigned to alan
> Task created (alan creates and assigns to himself)

alan@stateos:~$ list my tasks
> 1 task: review [@alan]

alan@stateos:~$ list all tasks
> 1 task: review [@alan]
# (same task appears in both views because alan owns it)
```

---

## Benefits

1. **Clarity**: Users can see at a glance which tasks are theirs vs assigned to them
2. **Control**: "My tasks" view shows only what you own/control
3. **Collaboration**: "All tasks" view shows complete workload including delegated items
4. **Safety**: Delete operations only affect owned tasks
5. **Transparency**: Owner annotations make task delegation clear

---

## Future Enhancements

- [ ] Filter by owner: `list tasks created by alan`
- [ ] Combined delete: `delete all including assigned`
- [ ] Team view: `list team tasks`
- [ ] Delegation tracking: `list tasks I delegated`
