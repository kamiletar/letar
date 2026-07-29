import { isAllowedWorkspace, runOnHost } from '@/lib/host-exec'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/git/pull
 * Выполняет git pull на хосте через nsenter
 */
export async function POST() {
  try {
    const workspaceDir = process.env.WORKSPACE_DIR || '/web/letar'

    // Валидация пути — защита от command injection
    if (!isAllowedWorkspace(workspaceDir)) {
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
