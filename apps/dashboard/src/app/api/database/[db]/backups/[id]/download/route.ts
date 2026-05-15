import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { type NextRequest, NextResponse } from 'next/server'
import path from 'path'

export const dynamic = 'force-dynamic'

const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd()
const backupsDir = path.join(workspaceRoot, 'backups')

/**
 * GET /api/database/[db]/backups/[id]/download
 * Скачивание файла бэкапа
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ db: string; id: string }> }) {
  try {
    const { db, id } = await params

    // Validate that id starts with db name (security check)
    if (!id.startsWith(db)) {
      return NextResponse.json({ success: false, error: 'Invalid backup id for this database' }, { status: 400 })
    }

    // Only allow .sql.gz files (security check)
    if (!id.endsWith('.sql.gz')) {
      return NextResponse.json({ success: false, error: 'Invalid backup file format' }, { status: 400 })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedId = path.basename(id)
    const backupPath = path.join(backupsDir, sanitizedId)

    // Verify the file exists and is within backups directory
    const resolvedPath = path.resolve(backupPath)
    if (!resolvedPath.startsWith(path.resolve(backupsDir))) {
      return NextResponse.json({ success: false, error: 'Invalid backup path' }, { status: 400 })
    }

    // Get file stats
    let fileStats
    try {
      fileStats = await stat(backupPath)
    } catch {
      return NextResponse.json({ success: false, error: 'Backup file not found' }, { status: 404 })
    }

    // Create a readable stream
    const stream = createReadStream(backupPath)

    // Convert Node.js stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        stream.on('end', () => {
          controller.close()
        })
        stream.on('error', (err) => {
          controller.error(err)
        })
      },
      cancel() {
        stream.destroy()
      },
    })

    // Return the file as a download
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${sanitizedId}"`,
        'Content-Length': fileStats.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
