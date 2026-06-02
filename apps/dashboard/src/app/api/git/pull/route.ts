import { spawn } from 'child_process'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Выполняет команду на хосте через docker
 * Использует nsenter для выхода из контейнера и выполнения команды на хосте
 */
async function runOnHost(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    // Используем nsenter для выполнения команды в namespace хоста
    // PID 1 - это init процесс хоста
    const proc = spawn('nsenter', ['-t', '1', '-m', '-u', '-i', '-n', '-p', '--', 'sh', '-c', command], {
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 })
    })

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, code: 1 })
    })

    // Таймаут 30 секунд
    setTimeout(() => {
      proc.kill()
      resolve({ stdout, stderr: stderr + '\nTimeout', code: 1 })
    }, 30000)
  })
}

// Allow-list валидация пути для защиты от command injection
const ALLOWED_WORKSPACES = ['/web/letar', '/home/deploy/letar'] as const

/**
 * POST /api/git/pull
 * Выполняет git pull на хосте через nsenter
 */
export async function POST() {
  try {
    const workspaceDir = process.env.WORKSPACE_DIR || '/web/letar'

    // Валидация пути — защита от command injection
    if (!ALLOWED_WORKSPACES.includes(workspaceDir as (typeof ALLOWED_WORKSPACES)[number])) {
      return NextResponse.json({ success: false, error: 'Invalid workspace path' }, { status: 400 })
    }

    const result = await runOnHost(`cd ${workspaceDir} && git pull 2>&1`)

    if (result.code !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: result.stderr || result.stdout || 'Git pull failed',
        },
        { status: 500 }
      )
    }

    // Парсим вывод git pull
    const output = result.stdout
    const isUpToDate = output.includes('Already up to date') || output.includes('Already up-to-date')

    return NextResponse.json({
      success: true,
      upToDate: isUpToDate,
      output: output.trim(),
    })
  } catch (error) {
    console.error('Error in /api/git/pull:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
