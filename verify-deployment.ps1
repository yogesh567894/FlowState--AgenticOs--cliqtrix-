# Verify Vercel Deployment with GROQ_API_KEY
Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "           🔍 VERIFYING VERCEL DEPLOYMENT" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$baseUrl = "https://flow-state-agentic-os-cliqtrix.vercel.app"

# Test 1: Health Check
Write-Host "Test 1: Checking Health Endpoint..." -ForegroundColor White
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health check successful!`n" -ForegroundColor Green
    
    Write-Host "Environment Info:" -ForegroundColor Yellow
    Write-Host "  • Serverless: $($health.environment.isServerless)" -ForegroundColor White
    Write-Host "  • Has API Key: " -NoNewline -ForegroundColor White
    if ($health.environment.hasGroqApiKey) {
        Write-Host "$($health.environment.hasGroqApiKey) ✓" -ForegroundColor Green
    } else {
        Write-Host "$($health.environment.hasGroqApiKey) ✗" -ForegroundColor Red
        Write-Host "`n⚠️  API key not detected! Did you add it to Vercel?" -ForegroundColor Yellow
    }
    Write-Host "  • Key Length: $($health.environment.groqKeyLength) characters" -ForegroundColor White
    
    Write-Host "`nToken Limits:" -ForegroundColor Yellow
    Write-Host "  • Max Input: $($health.tokenLimits.maxInputTokens)" -ForegroundColor White
    Write-Host "  • Max Output: $($health.tokenLimits.maxOutputTokens)" -ForegroundColor White
    Write-Host "`n" -ForegroundColor White
    
    if (-not $health.environment.hasGroqApiKey) {
        Write-Host "🚨 ACTION REQUIRED:" -ForegroundColor Red
        Write-Host "   Add GROQ_API_KEY to Vercel environment variables" -ForegroundColor White
        Write-Host "   URL: https://vercel.com/yogesh567894/flow-state-agentic-os-cliqtrix/settings/environment-variables`n" -ForegroundColor Green
        exit 1
    }
    
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

# Test 2: Natural Language Command
Write-Host "Test 2: Testing Natural Language Processing..." -ForegroundColor White
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
try {
    $body = @{
        message = "create a task to verify deployment"
        userId = "test-user-$(Get-Random)"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/webhook" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.reply -match "🤔 Hmm, I'm not sure") {
        Write-Host "⚠️  Got fallback response - API key might not be working" -ForegroundColor Yellow
        Write-Host "   Response: $($response.reply)`n" -ForegroundColor Gray
    } else {
        Write-Host "✅ NLP is working! Task creation successful`n" -ForegroundColor Green
        Write-Host "   Response: $($response.reply)" -ForegroundColor Gray
    }
    Write-Host "" -ForegroundColor White
    
} catch {
    Write-Host "❌ API test failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: List Tasks
Write-Host "Test 3: Testing Task Listing..." -ForegroundColor White
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
try {
    $body = @{
        message = "show my tasks"
        userId = "test-user"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/webhook" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    Write-Host "✅ Task listing works`n" -ForegroundColor Green
    Write-Host "   Response: $($response.reply)" -ForegroundColor Gray
    Write-Host "" -ForegroundColor White
    
} catch {
    Write-Host "❌ Task listing failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 4: Math Calculation
Write-Host "Test 4: Testing Math Calculations..." -ForegroundColor White
Write-Host "───────────────────────────────────────────────────────────────" -ForegroundColor Gray
try {
    $body = @{
        message = "calculate 100 + 50"
        userId = "test-user"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/webhook" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.reply -match "150") {
        Write-Host "✅ Math calculations working correctly`n" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Math result unexpected`n" -ForegroundColor Yellow
    }
    Write-Host "   Response: $($response.reply)" -ForegroundColor Gray
    Write-Host "" -ForegroundColor White
    
} catch {
    Write-Host "❌ Math test failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                  ✨ VERIFICATION COMPLETE ✨" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "🌐 Test your app: $baseUrl" -ForegroundColor Cyan
Write-Host "📊 View health: $baseUrl/health" -ForegroundColor Cyan
Write-Host "📚 API docs: $baseUrl/api`n" -ForegroundColor Cyan
