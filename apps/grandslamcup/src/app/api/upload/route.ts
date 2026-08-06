/**
 * API загрузки фото к матчу.
 * POST: FormData (file, matchId, caption?)
 * Auth: ADMIN или тренер команды матча.
 */

import { prisma } from '@/lib/db'
import { getPhotoUrl } from '@/lib/images'
import { ensureUploadDir } from '@/lib/upload'
import { MAX_UPLOAD_SIZE, resizeImage } from '@/lib/upload/resize-image'
import { writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    // Авторизация
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const user = await getDbUser(session)

    const formData = await request.formData()
    const file = formData.get('file') as File
    const matchId = formData.get('matchId') as string
    const caption = formData.get('caption') as string | null

    if (!file || !matchId) {
      return NextResponse.json({ error: 'Файл и matchId обязательны' }, { status: 400 })
    }

    // Проверка типа
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Файл должен быть изображением' }, { status: 400 })
    }

    // Проверка размера (15 МБ)
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `Максимальный размер 15 МБ (файл: ${(file.size / 1024 / 1024).toFixed(1)} МБ)` },
        { status: 400 },
      )
    }

    // Проверяем что матч существует
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        homeTeamId: true,
        awayTeamId: true,
        homeTeam: {
          select: { playerTeamSeasons: { where: { leftAt: null }, select: { player: { select: { userId: true } } } } },
        },
        awayTeam: {
          select: { playerTeamSeasons: { where: { leftAt: null }, select: { player: { select: { userId: true } } } } },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })
    }

    // Проверяем доступ: ADMIN или тренер одной из команд
    const isAdmin = user.roles?.includes('ADMIN')
    const isTeamMember = match.homeTeam.playerTeamSeasons.some((pts) => pts.player.userId === user.id)
      || match.awayTeam.playerTeamSeasons.some((pts) => pts.player.userId === user.id)

    if (!isAdmin && !isTeamMember) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // Генерируем имя файла
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${timestamp}-${random}.${ext}`

    // Ресайз и сохранение фото матча
    const subdir = `matches/${matchId}`
    const uploadsDir = await ensureUploadDir(subdir)
    const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))
    await writeFile(join(uploadsDir, filename), buffer)

    const path = `matches/${matchId}/${filename}`

    // Считаем порядок
    const lastPhoto = await prisma.matchPhoto.findFirst({
      where: { matchId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    // Создаём запись
    const photo = await prisma.matchPhoto.create({
      data: {
        matchId,
        filename,
        path,
        mimeType: file.type,
        size: file.size,
        caption: caption || null,
        order: (lastPhoto?.order ?? -1) + 1,
        uploadedById: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      id: photo.id,
      url: getPhotoUrl(path),
      filename,
    })
  } catch (error) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
