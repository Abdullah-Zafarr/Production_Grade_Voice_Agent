$root = Get-Location
$venv = Join-Path $root ".venv"
$pip = Join-Path $venv "Scripts\pip.exe"
$python = Join-Path $venv "Scripts\python.exe"

Write-Host "Starting Soul Imaging Unified Backend (Windows/PowerShell)..." -ForegroundColor Cyan

# 1. Start the FastAPI Token & Admin Server
Write-Host "Starting API Server on http://localhost:8000 ..." -ForegroundColor Yellow
$apiProcess = Start-Process $python -ArgumentList "-m uvicorn agent.api:app --host 0.0.0.0 --port 8000" -WindowStyle Normal -PassThru

# 2. Wait a moment for API to initialize
Start-Sleep -Seconds 3

# 3. Start the LiveKit Agent Worker
Write-Host "Starting LiveKit Agent Worker..." -ForegroundColor Green
& $python -m agent.main start
