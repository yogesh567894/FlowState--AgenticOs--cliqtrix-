# FlowState Bot - Interactive Demo Script
# This script demonstrates how to use the bot via API

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🎯 FLOWSTATE BOT - INTERACTIVE DEMO                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$baseUrl = "https://flow-state-agentic-os-cliqtrix.vercel.app/api/webhook"
$userId = "demo-user-$(Get-Random)"

function Send-BotMessage {
    param([string]$message)
    
    Write-Host "`n👤 You: " -NoNewline -ForegroundColor Cyan
    Write-Host "$message" -ForegroundColor White
    
    $body = @{
        userId = $userId
        message = $message
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
        Write-Host "🤖 Bot: " -NoNewline -ForegroundColor Green
        Write-Host "$($response.reply)" -ForegroundColor White
        return $response
    } catch {
        Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Demo Flow
Write-Host "Starting interactive demo with user ID: $userId`n" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Gray

# 1. Greeting
Write-Host "`n[Demo 1: Greeting]" -ForegroundColor Yellow
Send-BotMessage "hi"
Start-Sleep -Seconds 1

# 2. Create Task
Write-Host "`n[Demo 2: Create a Task]" -ForegroundColor Yellow
Send-BotMessage "create a task to review the deployment"
Start-Sleep -Seconds 1

# 3. List Tasks
Write-Host "`n[Demo 3: List Tasks]" -ForegroundColor Yellow
Send-BotMessage "show my tasks"
Start-Sleep -Seconds 1

# 4. Set Priority
Write-Host "`n[Demo 4: Set Priority]" -ForegroundColor Yellow
Send-BotMessage "make task 1 high priority"
Start-Sleep -Seconds 1

# 5. Create Note
Write-Host "`n[Demo 5: Create a Note]" -ForegroundColor Yellow
Send-BotMessage "note: API key configured successfully"
Start-Sleep -Seconds 1

# 6. Math Calculation
Write-Host "`n[Demo 6: Math Calculation]" -ForegroundColor Yellow
Send-BotMessage "calculate 100 + 50"
Start-Sleep -Seconds 1

# 7. Focus Mode
Write-Host "`n[Demo 7: Start Focus Mode]" -ForegroundColor Yellow
Send-BotMessage "start focus mode for 25 minutes"
Start-Sleep -Seconds 1

# 8. Natural Language Task
Write-Host "`n[Demo 8: Natural Language Task Creation]" -ForegroundColor Yellow
Send-BotMessage "I need to update the documentation tomorrow"
Start-Sleep -Seconds 1

# 9. View All Tasks
Write-Host "`n[Demo 9: View All Tasks]" -ForegroundColor Yellow
Send-BotMessage "show my tasks"
Start-Sleep -Seconds 1

# 10. Complete Task
Write-Host "`n[Demo 10: Complete a Task]" -ForegroundColor Yellow
Send-BotMessage "complete task 1"
Start-Sleep -Seconds 1

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host "`n✨ Demo Complete!" -ForegroundColor Green
Write-Host "`nYou can now:" -ForegroundColor White
Write-Host "  • Open the web app: https://flow-state-agentic-os-cliqtrix.vercel.app" -ForegroundColor Cyan
Write-Host "  • Read the full guide: USER-GUIDE.md" -ForegroundColor Cyan
Write-Host "  • View API docs: https://flow-state-agentic-os-cliqtrix.vercel.app/api" -ForegroundColor Cyan
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  🎉 HAPPY FLOWING! 🎉                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan
