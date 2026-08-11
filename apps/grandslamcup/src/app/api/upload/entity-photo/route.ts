/**
 * Универсальный API загрузки фото сущности (player, venue).
 * POST: FormData (file, entityType, entityId)
 * Auth: ADMIN (всё), Coach (фото игроков своей команды).
 */

import { prisma } from '@/lib/db'
import { deleteFileFromDisk, ensureUploadDir, extractAndValidateFile, generateFilename } from '@/lib/upload'
import { MAX_UPLOAD_SIZE, resizeAvatar, resizeImage } from '@/lib/upload/resize-image'
import { writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) { return NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) }
    const user = await getDbUser(session)

    const result = await extractAndValidateFile(request, 'file', {
      maxSize: MAX_UPLOAD_SIZE,
      allowedTypes: 'image/',
    })
    if (result.error) { return result.error }

    const { file, formData } = result
    const entityType = formData.get('entityType') as string
    const entityId = formData.get('entityId') as string

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType и entityId обязательны' }, { status: 400 })
    }

    const isAdmin = user.roles?.includes('ADMIN')

    if (entityType === 'player') {
      const player = await prisma.player.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          photo: true,
          playerTeamSeasons: {
            where: { leftAt: null },
            select: {
              teamSeason: {
                select: {
                  season: { select: { status: true } },
                  playerTeamSeasons: {
                    where: { leftAt: null, role: { in: ['COACH', 'ASSISTANT_COACH'] } },
                    select: { player: { select: { userId: true } } },
                  },
                },
              },
            },
          },
        },
      })
      if (!player) { return NextResponse.json({ error: 'Поэт не найден' }, { status: 404 }) }

      if (!isAdmin) {
        const isCoach = player.playerTeamSeasons.some(
          (pts) =>
            pts.teamSeason.season.status === 'ACTIVE'
            && pts.teamSeason.playerTeamSeasons.some((c) => c.player.userId === user.id),
        )
        if (!isCoach) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }
      }

      if (player.photo) { await deleteFileFromDisk(player.photo) }
      const filename = generateFilename(file.name)
      // Ресайз аватара игрока (квадратный кроп 400x400)
      const buffer = await resizeAvatar(Buffer.from(await file.arrayBuffer()))
      const subdir = `players/${entityId}`
      const uploadsDir = await ensureUploadDir(subdir)
      await writeFile(join(uploadsDir, filename), buffer)
      const path = `${subdir}/${filename}`
      await prisma.player.update({ where: { id: entityId }, data: { photo: path } })

      return NextResponse.json({ success: true, url: `/api/files/${path}` })
    }

    if (entityType === 'venue') {
      if (!isAdmin) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }

      const venue = await prisma.venue.findUnique({
        where: { id: entityId },
        select: { id: true, photo: true },
      })
      if (!venue) { return NextResponse.json({ error: 'Стадион не найден' }, { status: 404 }) }

      if (venue.photo) { await deleteFileFromDisk(venue.photo) }
      const filename = generateFilename(file.name)
      // Ресайз фото стадиона (сохраняет пропорции, макс 1920px)
      const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))
      const subdir = `venues/${entityId}`
      const uploadsDir = await ensureUploadDir(subdir)
      await writeFile(join(uploadsDir, filename), buffer)
      const path = `${subdir}/${filename}`
      await prisma.venue.update({ where: { id: entityId }, data: { photo: path } })

      return NextResponse.json({ success: true, url: `/api/files/${path}` })
    }

    if (entityType === 'team') {
      if (!isAdmin) {
        // Проверяем что пользователь — тренер этой команды
        const coachCheck = await prisma.playerTeamSeason.findFirst({
          where: {
            teamSeason: { teamId: entityId, season: { status: 'ACTIVE' } },
            player: { userId: user.id },
            role: { in: ['COACH', 'ASSISTANT_COACH'] },
            leftAt: null,
          },
        })
        if (!coachCheck) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }
      }

      const team = await prisma.team.findUnique({
        where: { id: entityId },
        select: { id: true, logo: true },
      })
      if (!team) { return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 }) }

      if (team.logo) { await deleteFileFromDisk(team.logo) }
      const filename = generateFilename(file.name)
      // Ресайз логотипа (квадратный кроп 400x400)
      const buffer = await resizeAvatar(Buffer.from(await file.arrayBuffer()))
      const subdir = `teams/${entityId}`
      const uploadsDir = await ensureUploadDir(subdir)
      await writeFile(join(uploadsDir, filename), buffer)
      const path = `${subdir}/${filename}`
      await prisma.team.update({ where: { id: entityId }, data: { logo: path } })

      return NextResponse.json({ success: true, url: `/api/files/${path}` })
    }

    return NextResponse.json({ error: `Неизвестный тип: ${entityType}` }, { status: 400 })
  } catch (error) {
    console.error('[Entity Photo Upload] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}

/** Удаление фото сущности */
export async function DELETE(request: NextRequest) {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) { return NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) }
    const user = await getDbUser(session)
    const isAdmin = user.roles?.includes('ADMIN')

    const body = await request.json()
    const { entityType, entityId } = body as { entityType: string; entityId: string }

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType и entityId обязательны' }, { status: 400 })
    }

    if (entityType === 'player') {
      if (!isAdmin) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }
      const player = await prisma.player.findUnique({ where: { id: entityId }, select: { photo: true } })
      if (!player) { return NextResponse.json({ error: 'Поэт не найден' }, { status: 404 }) }
      if (player.photo) { await deleteFileFromDisk(player.photo) }
      await prisma.player.update({ where: { id: entityId }, data: { photo: null } })
      return NextResponse.json({ success: true })
    }

    if (entityType === 'venue') {
      if (!isAdmin) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }
      const venue = await prisma.venue.findUnique({ where: { id: entityId }, select: { photo: true } })
      if (!venue) { return NextResponse.json({ error: 'Стадион не найден' }, { status: 404 }) }
      if (venue.photo) { await deleteFileFromDisk(venue.photo) }
      await prisma.venue.update({ where: { id: entityId }, data: { photo: null } })
      return NextResponse.json({ success: true })
    }

    if (entityType === 'team') {
      if (!isAdmin) { return NextResponse.json({ error: 'Нет доступа' }, { status: 403 }) }
      const team = await prisma.team.findUnique({ where: { id: entityId }, select: { logo: true } })
      if (!team) { return NextResponse.json({ error: 'Команда не найдена' }, { status: 404 }) }
      if (team.logo) { await deleteFileFromDisk(team.logo) }
      await prisma.team.update({ where: { id: entityId }, data: { logo: null } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: `Неизвестный тип: ${entityType}` }, { status: 400 })
  } catch (error) {
    console.error('[Entity Photo Delete] Error:', error)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
