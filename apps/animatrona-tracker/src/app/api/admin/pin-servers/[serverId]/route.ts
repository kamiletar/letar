import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ serverId: string }>

/**
 * PATCH /api/admin/pin-servers/[serverId]
 * Обновить поля пин-сервера: status (ONLINE ↔ MAINTENANCE), name, capacityBytes.
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { serverId } = await params
  const body = await request.json()
  const { status, name, capacityBytes } = body

  const updateData: Record<string, unknown> = {}

  if (status !== undefined) {
    if (status !== 'ONLINE' && status !== 'MAINTENANCE') {
      return NextResponse.json({ error: 'Допустимые статусы: ONLINE, MAINTENANCE' }, { status: 400 })
    }
    updateData.status = status
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Название не может быть пустым' }, { status: 400 })
    }
    updateData.name = name.trim()
  }

  if (capacityBytes !== undefined) {
    if (typeof capacityBytes !== 'number' || capacityBytes < 0) {
      return NextResponse.json({ error: 'capacityBytes должен быть неотрицательным числом' }, { status: 400 })
    }
    updateData.capacityBytes = capacityBytes
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
  }

  const server = await prisma.pinServer.findUnique({ where: { id: serverId } })
  if (!server) {
    return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
  }

  const updated = await prisma.pinServer.update({
    where: { id: serverId },
    data: updateData,
  })

  return NextResponse.json({ ok: true, name: updated.name, status: updated.status })
}

/**
 * DELETE /api/admin/pin-servers/[serverId]
 * Удалить пин-сервер и все его задания (только админ).
 * Активные задания (QUEUED/PINNING) отменяются на pin-queue перед удалением.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { serverId } = await params

  // Загружаем сервер с активными заданиями
  const server = await prisma.pinServer.findUnique({
    where: { id: serverId },
    include: {
      pinJobs: {
        where: { status: { in: ['QUEUED', 'PINNING'] } },
        select: { id: true, cid: true },
      },
      _count: { select: { pinJobs: true } },
    },
  })

  if (!server) {
    return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
  }

  // Отменяем активные задания на pin-queue (если настроен)
  let cancelledJobs = 0
  if (server.pinQueueUrl && server.pinJobs.length > 0) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (server.pinQueueSecret) {
      headers['Authorization'] = `Bearer ${server.pinQueueSecret}`
    }

    await Promise.allSettled(
      server.pinJobs.map(async (job) => {
        try {
          await fetch(`${server.pinQueueUrl}/api/pin?cid=${encodeURIComponent(job.cid)}`, {
            method: 'DELETE',
            headers,
            signal: AbortSignal.timeout(10000),
          })
          cancelledJobs++
        } catch {
          // Ошибка отмены не блокирует удаление сервера
        }
      })
    )
  }

  // Удаляем сервер (cascade удалит все PinJob)
  await prisma.pinServer.delete({ where: { id: serverId } })

  return NextResponse.json({
    deleted: true,
    cancelledJobs,
    deletedJobs: server._count.pinJobs,
  })
}
