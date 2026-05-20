# Останавливает llama-server и освобождает VRAM

param(
    [int]$Port = 8080
)

$stopped = $false

# 1. По порту — самый надёжный способ (не зависит от имени exe)
$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pid_ = $conn.OwningProcess | Select-Object -First 1
    $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Останавливаю $($proc.Name) (PID $pid_, порт $Port)..." -ForegroundColor Yellow
        Stop-Process -Id $pid_ -Force
        $stopped = $true
    }
}

# 2. По имени процесса — fallback
if (-not $stopped) {
    $procs = Get-Process -Name "llama-server" -ErrorAction SilentlyContinue
    if (-not $procs) {
        $procs = Get-Process -Name "llama*" -ErrorAction SilentlyContinue
    }
    if ($procs) {
        $procs | ForEach-Object {
            Write-Host "Останавливаю $($_.Name) (PID $($_.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $_.Id -Force
        }
        $stopped = $true
    }
}

# 3. Плановая задача (если запускался через Task Scheduler)
Stop-ScheduledTask -TaskName "letar-llm-server" -ErrorAction SilentlyContinue

if ($stopped) {
    Write-Host "✓ LLM сервер остановлен, VRAM свободна" -ForegroundColor Green
} else {
    Write-Host "LLM сервер не найден (уже остановлен?)" -ForegroundColor Gray
}
