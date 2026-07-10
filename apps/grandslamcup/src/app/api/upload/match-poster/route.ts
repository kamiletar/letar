/**
 * API загрузки постера/афиши матча.
 * POST: FormData (file, matchId) — загрузка
 * DELETE: JSON { matchId } — удаление постера
 * Auth: только ADMIN.
 */

import { prisma } from '@/lib/db'
import { isOrganizerOfCity } from '@/lib/edit-permissions'
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
    const matchId = formData.get('matchId') as string
    if (!matchId) {
      return NextResponse.json({ error: 'matchId обязателен' }, { status: 400 })
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        posterUrl: true,
        homeTeam: { select: { team: { select: { cityId: true } } } },
      },
    })
    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })
    }

    // Доступ: admin или организатор города матча
    const cityId = match.homeTeam.team.cityId
    const isAdmin = user.roles?.includes('ADMIN')
    const isOrg = !isAdmin && (await isOrganizerOfCity(cityId))
    if (!isAdmin && !isOrg) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    // Удаляем старый постер
    if (match.posterUrl) {
      await deleteFileFromDisk(match.posterUrl)
    }

    // Ресайз и сохранение постера
    const filename = generateFilename(file.name)
    const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))
    const subdir = `matches/${matchId}`
    const uploadsDir = await ensureUploadDir(subdir)
    await writeFile(join(uploadsDir, filename), buffer)
    const path = `${subdir}/${filename}`

    // Обновляем в БД
    await prisma.match.update({ where: { id: matchId }, data: { posterUrl: path } })

    return NextResponse.json({ success: true, url: `/api/files/${path}` })
  } catch (error) {
    console.error('[Match Poster Upload] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    const user = await getDbUser(session)

    const { matchId } = await request.json()
    if (!matchId) {
      return NextResponse.json({ error: 'matchId обязателен' }, { status: 400 })
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        posterUrl: true,
        homeTeam: { select: { team: { select: { cityId: true } } } },
      },
    })
    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })
    }

    // Доступ: admin или организатор города матча
    const matchCityId = match.homeTeam.team.cityId
    const isAdminDel = user.roles?.includes('ADMIN')
    const isOrgDel = !isAdminDel && (await isOrganizerOfCity(matchCityId))
    if (!isAdminDel && !isOrgDel) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
    }

    if (match.posterUrl) {
      await deleteFileFromDisk(match.posterUrl)
      await prisma.match.update({ where: { id: matchId }, data: { posterUrl: null } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Match Poster Delete] Error:', error)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
