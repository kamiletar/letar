# =============================================================================
# Запуск llama-server с Gemma 4 26B (MXFP4) для letar-consultant
# RTX 5080 Laptop, 16 ГБ VRAM — Blackwell, нативный MXFP4 через Tensor Cores
#
# Требования:
#   1. llama.cpp CUDA-build: скачать из
#      https://github.com/ggerganov/llama.cpp/releases/latest
#      → llama-bXXXX-bin-win-cuda-cu12.X-x64.zip
#      → распаковать в C:\tools\llama.cpp\
#
#   2. Модель Gemma 4 26B MXFP4: скачать с HuggingFace
#      huggingface-cli download unsloth/gemma-4-26B-GGUF \
#        gemma-4-26B-A4B-it-MXFP4_MOE.gguf \
#        --local-dir C:\models\
#      (или через браузер: https://huggingface.co/unsloth/gemma-4-26B-GGUF)
#
# Запуск: .\scripts\llm\start-llm-server.ps1
# =============================================================================

param(
    # Путь к llama-server.exe
    [string]$LlamaServerPath = "C:\tools\llama.cpp\llama-server.exe",

    # Путь к GGUF-файлу модели
    [string]$ModelPath = "C:\models\gemma-4-26B-A4B-it-MXFP4_MOE.gguf",

    # Порт сервера (letar-consultant смотрит на 8080)
    [int]$Port = 8080,

    # Размер контекста в токенах
    [int]$CtxSize = 8192,

    # Альтернативная модель (Qwen3-Coder, не помещается целиком, нужен --n-cpu-moe)
    [switch]$UseQwenCoder,
    [string]$QwenCoderPath = "C:\models\Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf"
)

# ─── Проверки ────────────────────────────────────────────────────────────────

if (-not (Test-Path $LlamaServerPath)) {
    Write-Error @"
llama-server.exe не найден: $LlamaServerPath

Скачай llama.cpp CUDA-build:
  1. Открой: https://github.com/ggerganov/llama.cpp/releases/latest
  2. Скачай: llama-bXXXX-bin-win-cuda-cu12.X-x64.zip
  3. Распакуй в: C:\tools\llama.cpp\
"@
    exit 1
}

$selectedModel = if ($UseQwenCoder) { $QwenCoderPath } else { $ModelPath }

if (-not (Test-Path $selectedModel)) {
    $modelName = if ($UseQwenCoder) { "Qwen3-Coder-30B-A3B-Instruct-Q4_K_M.gguf" } else { "gemma-4-26B-A4B-it-MXFP4_MOE.gguf" }
    Write-Error @"
Модель не найдена: $selectedModel

Скачай модель через huggingface-cli:
  pip install huggingface-hub
  huggingface-cli download unsloth/gemma-4-26B-GGUF $modelName --local-dir C:\models\

Или вручную: https://huggingface.co/unsloth/gemma-4-26B-GGUF
"@
    exit 1
}

# ─── Параметры запуска ────────────────────────────────────────────────────────

$commonArgs = @(
    "--model", $selectedModel,
    "--port", $Port,
    "--host", "127.0.0.1",
    "--ctx-size", $CtxSize,
    "--flash-attn",                    # Flash Attention — критично для скорости
    "--cache-type-k", "q8_0",          # Кэш ключей в q8_0 — баланс памяти/скорости
    "--cache-type-v", "q8_0",          # Кэш значений
    "--jinja",                         # Нужен для корректного tool calling
    "--parallel", "1",                 # Один параллельный запрос (для нашего сценария достаточно)
    "--log-disable"                    # Отключить спам в консоль
)

if ($UseQwenCoder) {
    # Qwen3-Coder 30B (17.3 ГБ) — не влезает целиком, часть экспертов в RAM
    # --n-gpu-layers 999 = всё в VRAM (shared params + attention)
    # --n-cpu-moe 14 = 14 экспертных блоков в RAM
    # Подбирать опытным путём: цель — пик VRAM ~14.5-15.3 ГБ
    $modelArgs = @(
        "--n-gpu-layers", "999",
        "--n-cpu-moe", "14"            # Подбери: если OOM — увеличь, если < 14 ГБ — уменьши
    )
    Write-Host "🚀 Запуск Qwen3-Coder 30B (с --n-cpu-moe 14)..." -ForegroundColor Yellow
} else {
    # Gemma 4 26B MXFP4 (15.5 ГБ) — полностью в VRAM на RTX 5080
    # Нативные Tensor Cores Blackwell = максимальная скорость
    $modelArgs = @(
        "--n-gpu-layers", "999"        # Все слои в VRAM
    )
    Write-Host "🚀 Запуск Gemma 4 26B MXFP4 (полный VRAM, Blackwell Tensor Cores)..." -ForegroundColor Green
}

$allArgs = $commonArgs + $modelArgs

# ─── Запуск ──────────────────────────────────────────────────────────────────

Write-Host "Модель: $selectedModel" -ForegroundColor Cyan
Write-Host "Порт: $Port | Контекст: $CtxSize токенов" -ForegroundColor Cyan
Write-Host ""
Write-Host "После запуска letar-consultant доступен через:"
Write-Host "  http://localhost:$Port/v1/chat/completions" -ForegroundColor Green
Write-Host ""
Write-Host "Нажми Ctrl+C для остановки сервера." -ForegroundColor Gray
Write-Host ""

& $LlamaServerPath @allArgs
