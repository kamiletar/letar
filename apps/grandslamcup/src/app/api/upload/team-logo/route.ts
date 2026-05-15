/**
 * API загрузки логотипа команды.
 * POST: FormData (file, teamId)
 * Auth: ADMIN или тренер этой команды.
 */

import { prisma } from '@/lib/db'
import { deleteFileFromDisk, ensureUploadDir, extractAndValidateFile, generateFilename } from '@/lib/upload'
import { MAX_UPLOAD_SIZE, resizeImage } from '@/lib/upload/resize-image'
import { writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const user = await getDbUser(session)

    const result = await extractAndValidateFile(request, 'file', {
      maxSize: MAX_UPLOAD_SIZE,
      allowedTypes: 'image/',
    })
    if (result.error) {
      return result.error
    }

    const { file, formData } = result
    const teamId = formData.get('teamId') as string
    if (!teamId) {
      return NextResponse.json({ error: 'teamId обязателен' }, { status: 400 })
    }

    // Проверяем команду и доступ
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        logo: true,
        teamSeasons: {
          where: { season: { status: 'ACTIVE' } },
          select: {
            playerTeamSeasons: {
              where: { leftAt: null, role: { in: ['COACH', 'ASSISTANT_COACH'] } },
              select: { player: { select: { userId: true } } },
            },
          },
        },
      },
    })
    if (!team) {
      return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 })
    }

    const isAdmin = user.roles?.includes('ADMIN')
    const isCoach = team.teamSeasons.some((ts) => ts.playerTeamSeasons.some((pts) => pts.player.userId === user.id))
    if (!isAdmin && !isCoach) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // Удаляем старый файл
    if (team.logo) {
      await deleteFileFromDisk(team.logo)
    }

    // Ресайз и сохранение
    const filename = generateFilename(file.name)
    const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))
    const subdir = `teams/${teamId}`
    const uploadsDir = await ensureUploadDir(subdir)
    await writeFile(join(uploadsDir, filename), buffer)
    const path = `${subdir}/${filename}`

    // Обновляем в БД
    await prisma.team.update({ where: { id: teamId }, data: { logo: path } })

    return NextResponse.json({ success: true, url: `/api/files/${path}` })
  } catch (error) {
    console.error('[Team Logo Upload] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
