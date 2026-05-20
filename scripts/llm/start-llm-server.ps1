# =============================================================================
# Запуск llama-server для letar-consultant
# RTX 5080 Laptop, 16 ГБ VRAM
#
# МОДЕЛИ (выбирай по VRAM):
#   Qwen2.5-Coder-14B Q4_K_M  (~8.5 ГБ) — ДЕФОЛТ, оставляет 7+ ГБ свободными
#   Gemma 4 26B MXFP4         (~15.5 ГБ) — почти весь VRAM, overflow в RAM!
#   Qwen3-Coder 30B Q4_K_M   (~17 ГБ)   — часть в RAM через --n-cpu-moe
#
# Скачать Qwen2.5-Coder-14B:
#   huggingface-cli download bartowski/Qwen2.5-Coder-14B-Instruct-GGUF \
#     Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf --local-dir C:\models\
#
# Запуск: .\scripts\llm\start-llm-server.ps1
# Запуск с Gemma 4: .\scripts\llm\start-llm-server.ps1 -UseGemma4
# =============================================================================

param(
    [string]$LlamaServerPath = "C:\tools\llama-server.exe",

    # Дефолт: Qwen2.5-Coder-14B — ~8.5 ГБ VRAM, 7+ ГБ остаётся свободным
    [string]$ModelPath = "C:\models\Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf",

    [int]$Port = 8080,

    # 4096 достаточно для letar-consultant
    [int]$CtxSize = 4096,

    # Gemma 4 26B MXFP4 — только если не нужны другие приложения
    # ВНИМАНИЕ: занимает 15.5 ГБ VRAM, overflow в RAM неизбежен
    [switch]$UseGemma4,
    [string]$Gemma4Path = "C:\models\gemma-4-26B-A4B-it-MXFP4_MOE.gguf",

    # Qwen3-Coder 30B — часть экспертов в RAM через --n-cpu-moe
    [switch]$UseQwenCoder,
    [string]$QwenCoderPath = "C:\models\Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf"
)

# ─── Выгрузить модели из Ollama чтобы освободить RAM ────────────────────────
$ollamaRunning = $null -ne (Get-Process "ollama" -ErrorAction SilentlyContinue)
if ($ollamaRunning) {
    Write-Host "Выгружаю модели из Ollama (освобождаю RAM)..." -ForegroundColor Yellow
    $unloadBody = '{"model":"nomic-embed-text","keep_alive":"0"}'
    try { Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -ContentType "application/json" -Body $unloadBody -ErrorAction SilentlyContinue | Out-Null } catch { }
    Write-Host "OK Ollama RAM освобождена" -ForegroundColor Green
}

# ─── Выбор модели ────────────────────────────────────────────────────────────

if ($UseGemma4) {
    $selectedModel = $Gemma4Path
    $modelLabel = "Gemma 4 26B MXFP4 (~15.5 GB VRAM — overflow в RAM возможен!)"
    $modelArgs = @("--n-gpu-layers", "999")
    Write-Host "Запуск $modelLabel" -ForegroundColor Yellow
} elseif ($UseQwenCoder) {
    $selectedModel = $QwenCoderPath
    $modelLabel = "Qwen3-Coder 30B Q4_K_M (с --n-cpu-moe 14)"
    $modelArgs = @("--n-gpu-layers", "999", "--n-cpu-moe", "14")
    Write-Host "Запуск $modelLabel" -ForegroundColor Yellow
} else {
    $selectedModel = $ModelPath
    $modelLabel = "Qwen2.5-Coder-14B Q4_K_M (~8.5 GB VRAM, 7+ GB свободно)"
    $modelArgs = @("--n-gpu-layers", "999")
    Write-Host "Запуск $modelLabel" -ForegroundColor Green
}

# ─── Проверки ────────────────────────────────────────────────────────────────

if (-not (Test-Path $LlamaServerPath)) {
    Write-Error "llama-server.exe не найден: $LlamaServerPath`nСкачай: https://github.com/ggerganov/llama.cpp/releases/latest"
    exit 1
}

if (-not (Test-Path $selectedModel)) {
    Write-Error "Модель не найдена: $selectedModel`nСкачай через: huggingface-cli download bartowski/Qwen2.5-Coder-14B-Instruct-GGUF Qwen2.5-Coder-14B-Instruct-Q4_K_M.gguf --local-dir C:\models\"
    exit 1
}

# ─── Параметры запуска ────────────────────────────────────────────────────────

$commonArgs = @(
    "--model", $selectedModel,
    "--port", $Port,
    "--host", "127.0.0.1",
    "--ctx-size", $CtxSize,
    "--flash-attn", "on",
    "--cache-type-k", "q4_0",
    "--cache-type-v", "q4_0",
    "--batch-size", "512",        # для 14B нормально, compute buffer небольшой
    "--ubatch-size", "128",
    "--jinja",
    "--parallel", "1",
    "--log-disable"
)

$allArgs = $commonArgs + $modelArgs

# ─── Запуск ──────────────────────────────────────────────────────────────────

Write-Host "Модель: $selectedModel" -ForegroundColor Cyan
Write-Host "Порт: $Port | Контекст: $CtxSize токенов" -ForegroundColor Cyan
Write-Host ""
Write-Host "letar-consultant: http://localhost:$Port/v1/chat/completions" -ForegroundColor Green
Write-Host "Ctrl+C для остановки." -ForegroundColor Gray
Write-Host ""

& $LlamaServerPath @allArgs
