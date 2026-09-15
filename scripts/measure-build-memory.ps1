#requires -Version 7.0
<#
.SYNOPSIS
    Замер пикового потребления памяти `next build` (Turbopack) по дереву процессов сборки.

.DESCRIPTION
    Инструмент из разбора OOM на компиляции Turbopack при включённом
    `experimental.turbopackFileSystemCacheForBuild` (см. .claude/docs/turbopack-build-filesystem-cache-oom.md).

    Запускает `next build` напрямую из корневого node_modules/.bin/next.exe (в обход nx —
    обвязка Nx для замера не нужна и на память самого Turbopack не влияет), с cwd внутри
    приложения и отдельным distDir, и поллит суммарную PrivateMemorySize64 по всему дереву
    процессов сборки (node_modules/.bin/next.exe порождает дочерние воркеры).

    Два варианта замера (с персистентным кешем сборки / без него) скрипт НЕ переключает сам —
    флаг `experimental.turbopackFileSystemCacheForBuild` в next.config.* приложения правится
    вручную между прогонами, скрипт просто измеряет то, что получилось.

.PARAMETER AppPath
    Путь к приложению — относительно корня монорепо (например "apps/dsperevod") или абсолютный.

.PARAMETER DistDir
    Имя distDir для этого прогона (передаётся дочернему процессу через NEXT_DIST_DIR).
    По умолчанию ".next-memcheck" — уже покрыт шаблоном ".next*" в .nxignore.
    Работает только если next.config.* приложения читает `process.env.NEXT_DIST_DIR` для
    `distDir` (см. WARNING в выводе, если это не так — на время замера такую строку добавляют
    временно, см. domwellbes/svoichuzhie/dsperevod как образец).

.PARAMETER SafetyLimitMb
    Аварийный порог (МБ) для суммы PrivateMemorySize64 дерева процессов сборки. При превышении
    дерево немедленно убивается (taskkill /T /F) — это защита рабочей машины от system-wide OOM,
    не измерение "настоящего" пика: сборка на сброшенном кеше может уйти далеко за разумные
    пределы (см. таблицу в документе — >23 ГБ и не закончила компиляцию за отведённое время).

.PARAMETER MinFreeSystemMemoryMb
    Второй, независимый предохранитель: если свободная физическая память системы
    (Win32_OperatingSystem.FreePhysicalMemory) падает ниже этого порога — тоже аварийная
    остановка, даже если сумма по дереву процессов ещё не дотянула до SafetyLimitMb (сборка
    может раздувать чужую страничную/кеш-память ОС, не только собственный private-набор).

.PARAMETER TimeoutSec
    Таймаут всего прогона. При превышении — аварийная остановка с пометкой "таймаут".

.PARAMETER PollIntervalSec
    Интервал опроса дерева процессов, секунды.

.PARAMETER Parallelism
    Значение TURBO_TASKS_AVAILABLE_PARALLELISM — прижимает параллелизм Turbopack к числу vCPU
    целевого сервера (см. turbopack/crates/turbo-tasks/src/parallel.rs), чтобы локальный замер
    был сопоставим с прод-хостом, а не с числом ядер машины разработчика.

.PARAMETER StartDevDb
    Перед сборкой поднять dev-БД приложения (`docker compose -f <ComposeFile> up -d
    <ComposeService>`). Нужно приложениям, которые на фазе "Collecting page data" обращаются к
    БД (getEnhancedPrisma, соц-провайдеры и т.п.) — без поднятой БД сборка падает там
    ECONNREFUSED раньше конца интересующей фазы (компиляции), хотя частичный пик всё равно
    виден в логе.

.PARAMETER ComposeFile
    Имя compose-файла с dev-БД внутри AppPath. По умолчанию "docker-compose.dev.yml".

.PARAMETER ComposeService
    Имя сервиса БД в этом compose-файле. По умолчанию "db".

.PARAMETER LogDir
    Куда писать stdout/stderr сборки. По умолчанию .claude/artifacts (см. .claude/rules/artifacts.md
    — временные файлы сессии не должны засорять корень репо или каталоги приложений).

.EXAMPLE
    pwsh scripts/measure-build-memory.ps1 -AppPath apps/svoichuzhie -SafetyLimitMb 20000 -TimeoutSec 900

.EXAMPLE
    # Приложению нужна поднятая dev-БД на фазе сбора данных страниц
    pwsh scripts/measure-build-memory.ps1 -AppPath apps/dsperevod -StartDevDb -SafetyLimitMb 20000

.NOTES
    ⚠️ Съедает столько же RAM, сколько сама сборка — на измерениях сессии 2026-09-15 до ~12 ГБ
    на одно приложение. Не запускать на рабочей машине без явного понимания, что происходит —
    и без запаса свободной памяти сверх SafetyLimitMb/MinFreeSystemMemoryMb.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AppPath,

    [string]$DistDir = '.next-memcheck',

    [int]$SafetyLimitMb = 20000,

    [int]$MinFreeSystemMemoryMb = 1500,

    [int]$TimeoutSec = 900,

    [int]$PollIntervalSec = 2,

    [int]$Parallelism = 8,

    [switch]$StartDevDb,

    [string]$ComposeFile = 'docker-compose.dev.yml',

    [string]$ComposeService = 'db',

    [string]$LogDir
)

$ErrorActionPreference = 'Stop'

# ── Пути ──────────────────────────────────────────────────────────────────
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$appFullPath = if ([System.IO.Path]::IsPathRooted($AppPath)) { $AppPath } else { Join-Path $repoRoot $AppPath }
if (-not (Test-Path $appFullPath)) {
    throw "Приложение не найдено: $appFullPath"
}
$appFullPath = (Resolve-Path $appFullPath).Path
$appName = Split-Path $appFullPath -Leaf

$nextConfigCandidates = Get-ChildItem -Path $appFullPath -Filter 'next.config.*' -File -ErrorAction SilentlyContinue
if (-not $nextConfigCandidates) {
    throw "В $appFullPath нет next.config.* — это не Next.js приложение?"
}

$nextExe = Join-Path $repoRoot 'node_modules\.bin\next.exe'
if (-not (Test-Path $nextExe)) {
    throw "Не найден $nextExe — запусти bun install в корне монорепо"
}

# distDir из env читается только если next.config.* сам это делает — предупреждаем, если нет
$distDirWired = $false
foreach ($cfg in $nextConfigCandidates) {
    if ((Get-Content $cfg.FullName -Raw) -match 'NEXT_DIST_DIR') {
        $distDirWired = $true
        break
    }
}
if (-not $distDirWired) {
    Write-Warning ("next.config.* приложения '$appName' не читает process.env.NEXT_DIST_DIR — " +
        "параметр -DistDir будет проигнорирован, сборка пойдёт в обычный .next. " +
        "Добавь временно `distDir: process.env.NEXT_DIST_DIR ?? '.next'` на время замера " +
        '(см. domwellbes/svoichuzhie/dsperevod как образец).')
}

if (-not $LogDir) { $LogDir = Join-Path $repoRoot '.claude\artifacts' }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdoutLog = Join-Path $LogDir "measure-build-memory-$appName-$timestamp.stdout.log"
$stderrLog = Join-Path $LogDir "measure-build-memory-$appName-$timestamp.stderr.log"

# ── Очистка distDir ─────────────────────────────────────────────────────
$distFullPath = Join-Path $appFullPath $DistDir
if (Test-Path $distFullPath) {
    Write-Host "Чищу $distFullPath ..."
    Remove-Item -Recurse -Force $distFullPath
}

# ── Опционально — поднять dev-БД ────────────────────────────────────────
if ($StartDevDb) {
    $composeFullPath = Join-Path $appFullPath $ComposeFile
    if (-not (Test-Path $composeFullPath)) {
        throw "-StartDevDb указан, но $composeFullPath не найден"
    }
    Write-Host "Поднимаю сервис '$ComposeService' из $ComposeFile ..."
    docker compose -f $composeFullPath up -d $ComposeService
    Start-Sleep -Seconds 5
}

# ── Запуск next build ────────────────────────────────────────────────────
Write-Host ''
Write-Host "⚠️  Замер съедает RAM пропорционально самой сборке (наблюдалось до ~12 ГБ/приложение)."
Write-Host "Запускаю next build: приложение=$appName distDir=$DistDir parallelism=$Parallelism safety=${SafetyLimitMb}МБ timeout=${TimeoutSec}с"
Write-Host ''

$env:NEXT_DIST_DIR = $DistDir
$env:TURBO_TASKS_AVAILABLE_PARALLELISM = "$Parallelism"

$proc = Start-Process -FilePath $nextExe -ArgumentList 'build' -WorkingDirectory $appFullPath `
    -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog `
    -PassThru -WindowStyle Hidden

Remove-Item Env:\NEXT_DIST_DIR, Env:\TURBO_TASKS_AVAILABLE_PARALLELISM -ErrorAction SilentlyContinue

$rootProcId = $proc.Id
$startTime = Get-Date
$peakMb = 0.0
$killedReason = $null

function Get-ProcessTreeIds {
    param([int]$RootId)

    $table = Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId
    $byParent = @{}
    foreach ($p in $table) {
        $ppid = [int]$p.ParentProcessId
        if (-not $byParent.ContainsKey($ppid)) {
            $byParent[$ppid] = [System.Collections.Generic.List[int]]::new()
        }
        $byParent[$ppid].Add([int]$p.ProcessId)
    }

    $result = [System.Collections.Generic.List[int]]::new()
    $queue = [System.Collections.Generic.Queue[int]]::new()
    $queue.Enqueue($RootId)
    while ($queue.Count -gt 0) {
        $current = $queue.Dequeue()
        $result.Add($current)
        if ($byParent.ContainsKey($current)) {
            foreach ($child in $byParent[$current]) { $queue.Enqueue($child) }
        }
    }
    return $result
}

function Get-TreeMemoryMb {
    param([int[]]$ProcessIds)

    $totalBytes = 0L
    foreach ($procId in $ProcessIds) {
        try {
            $p = Get-Process -Id $procId -ErrorAction Stop
            $totalBytes += $p.PrivateMemorySize64
        } catch {
            # процесс уже завершился между снимком дерева и опросом — пропускаем
        }
    }
    return [math]::Round($totalBytes / 1MB, 1)
}

try {
    while (-not $proc.HasExited) {
        Start-Sleep -Seconds $PollIntervalSec

        $elapsed = (Get-Date) - $startTime
        if ($elapsed.TotalSeconds -gt $TimeoutSec) {
            $killedReason = "таймаут (> $TimeoutSec с)"
            break
        }

        $treeIds = Get-ProcessTreeIds -RootId $rootProcId
        $currentMb = Get-TreeMemoryMb -ProcessIds $treeIds
        if ($currentMb -gt $peakMb) { $peakMb = $currentMb }

        $freeMb = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1KB, 1)

        Write-Host ("[{0,6:N1} с] дерево: {1,8:N1} МБ   пик: {2,8:N1} МБ   свободно в системе: {3,8:N1} МБ" -f `
                $elapsed.TotalSeconds, $currentMb, $peakMb, $freeMb)

        if ($peakMb -gt $SafetyLimitMb) {
            $killedReason = "превышен safety-лимит ($SafetyLimitMb МБ)"
            break
        }
        if ($freeMb -lt $MinFreeSystemMemoryMb) {
            $killedReason = "свободной памяти системы меньше $MinFreeSystemMemoryMb МБ"
            break
        }
    }
} finally {
    if ($killedReason) {
        Write-Warning "Аварийная остановка: $killedReason. Убиваю дерево процессов (PID $rootProcId)..."
        try { taskkill /PID $rootProcId /T /F | Out-Null } catch {}
        Start-Sleep -Seconds 1
    }
}

$elapsedFinal = ((Get-Date) - $startTime).TotalSeconds
$exitCode = if ($killedReason) { -1 } elseif ($proc.HasExited) { $proc.ExitCode } else { $null }

Write-Host ''
Write-Host '══════════════════════════════════════════════════════════'
Write-Host "Итог: $appName (distDir=$DistDir)"
Write-Host ("  Пик памяти дерева процессов: {0:N1} МБ" -f $peakMb)
Write-Host ("  Время: {0:N1} с" -f $elapsedFinal)
if ($killedReason) {
    Write-Host "  Статус: аварийно остановлен — $killedReason"
} else {
    Write-Host "  Статус: завершился сам, exit code $exitCode"
}
Write-Host "  Лог stdout: $stdoutLog"
Write-Host "  Лог stderr: $stderrLog"
Write-Host '──────────────────────────────────────────────────────────'
Write-Host 'Хвост stdout (последние 30 строк):'
if (Test-Path $stdoutLog) { Get-Content $stdoutLog -Tail 30 }
if ((Test-Path $stderrLog) -and (Get-Item $stderrLog).Length -gt 0) {
    Write-Host '──────────────────────────────────────────────────────────'
    Write-Host 'Хвост stderr (последние 30 строк):'
    Get-Content $stderrLog -Tail 30
}
Write-Host '══════════════════════════════════════════════════════════'

if ($killedReason) { exit 2 }
if ($null -ne $exitCode) { exit $exitCode }
exit 0
