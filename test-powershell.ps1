# PowerShell Test Script for Advanced Features
# Run this to test all the new functionality

Write-Host "`n🧪 TESTING ADVANCED FEATURES" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/webhook"
$headers = @{
    "Content-Type" = "application/json"
}

# Helper function to make requests
function Test-Feature {
    param(
        [string]$TestName,
        [string]$UserId,
        [string]$Message
    )
    
    Write-Host "📝 Test: $TestName" -ForegroundColor Yellow
    Write-Host "   Message: $Message" -ForegroundColor Gray
    
    $body = @{
        userId = $UserId
        message = $Message
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body
        Write-Host "   ✅ Response:" -ForegroundColor Green
        Write-Host "   $($response.message)`n" -ForegroundColor White
        Start-Sleep -Milliseconds 500
        return $response
    }
    catch {
        Write-Host "   ❌ Error: $_`n" -ForegroundColor Red
        return $null
    }
}

# Test user
$testUser = "powershell-test@example.com"

Write-Host "🎯 Test 1: Create some tasks with assignees" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Create task for Indrish" `
    -UserId $testUser `
    -Message "Create a high priority task for indrish to review PR #456"

Test-Feature -TestName "Create task for Yogesh" `
    -UserId $testUser `
    -Message "Add medium priority task for yogesh to update documentation"

Test-Feature -TestName "Create task for Indrish (urgent)" `
    -UserId $testUser `
    -Message "Create urgent task for indrish: deploy to staging ASAP"

Test-Feature -TestName "Create task for Yogesh (low)" `
    -UserId $testUser `
    -Message "Low priority task for yogesh: refactor legacy code"

Write-Host "`n🎯 Test 2: Filter tasks by assignee" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Show tasks for Indrish" `
    -UserId $testUser `
    -Message "Show tasks for indrish"

Test-Feature -TestName "Show tasks for Yogesh" `
    -UserId $testUser `
    -Message "Show tasks for yogesh"

Write-Host "`n🎯 Test 3: Sort tasks by priority" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "List all tasks" `
    -UserId $testUser `
    -Message "Show all my tasks"

Test-Feature -TestName "Re-arrange by priority" `
    -UserId $testUser `
    -Message "re arrange the list based on tasks priority"

Write-Host "`n🎯 Test 4: Context-aware operations" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "List tasks (to populate context)" `
    -UserId $testUser `
    -Message "Show my pending tasks"

Test-Feature -TestName "Delete existing tasks" `
    -UserId $testUser `
    -Message "delete existing tasks"

Write-Host "`n🎯 Test 5: Complete task operations" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Create a task" `
    -UserId $testUser `
    -Message "Create task: Write unit tests"

Test-Feature -TestName "Complete the task" `
    -UserId $testUser `
    -Message "complete the write unit tests task"

Write-Host "`n🎯 Test 6: Chat utilities" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Ask for time" `
    -UserId $testUser `
    -Message "what time is it?"

Test-Feature -TestName "Ask for date" `
    -UserId $testUser `
    -Message "what day is today?"

Test-Feature -TestName "Ask about priority" `
    -UserId $testUser `
    -Message "what is priority?"

Write-Host "`n🎯 Test 7: Mode prefixes" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Task mode prefix" `
    -UserId $testUser `
    -Message "/t Review code and deploy"

Test-Feature -TestName "Note mode prefix" `
    -UserId $testUser `
    -Message "/n Meeting summary: discussed Q4 goals"

Test-Feature -TestName "Focus mode prefix" `
    -UserId $testUser `
    -Message "/f 45"

Write-Host "`n🎯 Test 8: Show urgent tasks" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Create urgent task" `
    -UserId $testUser `
    -Message "Create high priority task: Fix production bug"

Test-Feature -TestName "Show urgent" `
    -UserId $testUser `
    -Message "what is urgent?"

Write-Host "`n🎯 Test 9: Filter by person and priority" -ForegroundColor Cyan
Write-Host "─────────────────────────────────────────────`n" -ForegroundColor Cyan

Test-Feature -TestName "Create tasks with different priorities" `
    -UserId $testUser `
    -Message "Create high priority task for sarah: review security audit"

Test-Feature -TestName "Filter by person and priority" `
    -UserId $testUser `
    -Message "show high priority tasks for sarah"

Write-Host "`n✅ TESTING COMPLETE!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green
