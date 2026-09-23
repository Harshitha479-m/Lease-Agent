$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$python = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Error "Backend virtual environment not found. Run the setup steps in README.md first."
    exit 1
}

Start-Process powershell.exe -WorkingDirectory $backend -ArgumentList @(
    "-NoExit",
    "-Command",
    "& '$python' -m uvicorn app.main:app --reload --port 8000"
)
Start-Process powershell.exe -WorkingDirectory $frontend -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm.cmd run dev"
)

Write-Host "LeaseLens services started. Frontend: http://localhost:5173  Backend: http://localhost:8000/docs"
