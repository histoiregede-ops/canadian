# c:\Users\tepit\Documents\Site\restart-all.ps1

Write-Host "--- Stopping Stack: Front & Back ---" -ForegroundColor Yellow

# Define ports to clear (Angular: 4200, Node: 3000)
$ports = @(4200, 3000)

foreach ($port in $ports) {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pid = $process.OwningProcess
        Write-Host "Killing process on port $port (PID: $pid)..."
        Stop-Process -Id $pid -Force
    }
}

Write-Host "--- Restarting Stack ---" -ForegroundColor Green

# Start Backend in a new window
Write-Host "Starting Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Users\tepit\Documents\Site\back; npm run dev"

# Start Frontend in a new window
Write-Host "Starting Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd c:\Users\tepit\Documents\Site\front; npm start"

Write-Host "Processes triggered. Monitoring windows..." -ForegroundColor Cyan