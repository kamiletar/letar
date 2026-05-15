import type { AuditLogEntry } from '@/lib/audit-log'
import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { NextResponse } from 'next/server'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = join(process.cwd(), 'dashboard-data')
const AUDIT_LOG_FILE = join(DATA_DIR, 'audit-log.jsonl')

interface AuditLogResponse {
  success: boolean
  entries: AuditLogEntry[]
  totalCount: number
  fileSize: number
}

/**
 * GET /api/audit-log
 * Получение записей audit log
 *
 * Query params:
 * - limit: number - максимум записей (default: 100)
 * - offset: number - смещение (default: 0)
 * - action: string - фильтр по action
 * - username: string - фильтр по username
 * - success: boolean - фильтр по success
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100', 10)
    const offset = parseInt(url.searchParams.get('offset') || '0', 10)
    const actionFilter = url.searchParams.get('action')
    const usernameFilter = url.searchParams.get('username')
    const successFilter = url.searchParams.get('success')

    // Check if file exists
    if (!existsSync(AUDIT_LOG_FILE)) {
      return NextResponse.json({
        success: true,
        entries: [],
        totalCount: 0,
        fileSize: 0,
      } as AuditLogResponse)
    }

    // Get file size
    const fileStat = await stat(AUDIT_LOG_FILE)
    const fileSize = fileStat.size

    // Read file
    const content = await readFile(AUDIT_LOG_FILE, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    // Parse entries
    let entries: AuditLogEntry[] = lines
      .map((line) => {
        try {
          return JSON.parse(line) as AuditLogEntry
        } catch {
          return null
        }
      })
      .filter((entry): entry is AuditLogEntry => entry !== null)

    // Apply filters
    if (actionFilter) {
      entries = entries.filter((e) => e.action === actionFilter)
    }
    if (usernameFilter) {
      entries = entries.filter((e) => e.username === usernameFilter)
    }
    if (successFilter !== null) {
      const successBool = successFilter === 'true'
      entries = entries.filter((e) => e.success === successBool)
    }

    const totalCount = entries.length

    // Sort by timestamp descending (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Apply pagination
    entries = entries.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      entries,
      totalCount,
      fileSize,
    } as AuditLogResponse)
  } catch (error) {
    console.error('Error reading audit log:', error)
    return NextResponse.json({ error: 'Failed to read audit log' }, { status: 500 })
  }
}

/**
 * DELETE /api/audit-log
 * Очистка audit log (только для ADMIN)
 */
export async function DELETE() {
  try {
    const { writeFile } = await import('fs/promises')

    if (existsSync(AUDIT_LOG_FILE)) {
      await writeFile(AUDIT_LOG_FILE, '', 'utf-8')
    }

    return NextResponse.json({ success: true, message: 'Audit log cleared' })
  } catch (error) {
    console.error('Error clearing audit log:', error)
    return NextResponse.json({ error: 'Failed to clear audit log' }, { status: 500 })
  }
}
