'use server'

import { prisma } from '@/lib/db'
import { requirePoetAction } from '@/lib/roles'
import { transliterate } from '@/lib/transliterate'
import { mkdir, rename } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import { join } from 'path'
import { z } from 'zod/v4'

// ─── Схемы валидации ───────────────────────────────────────────────────────

const CreateAlbumSchema = z
  .object({
    title: z.string().min(1, 'Введите название').max(200),
    coverImage: z.string().nullable().optional(),
    publishedAt: z.string().nullable().optional(),
  })
  .strip()

const UpdateAlbumSchema = z
  .object({
    albumId: z.string().min(1),
    title: z.string().min(1, 'Введите название').max(200),
    coverImage: z.string().nullable().optional(),
    publishedAt: z.string().nullable().optional(),
  })
  .strip()

const AlbumPoemSchema = z
  .object({
    albumId: z.string().min(1),
    poemId: z.string().min(1),
  })
  .strip()

const ReorderSchema = z
  .object({
    albumId: z.string().min(1),
    poemIds: z.array(z.string()),
  })
  .strip()

// ─── Утилиты ───────────────────────────────────────────────────────────────

async function generateAlbumSlug(title: string, excludeId?: string): Promise<string> {
  const base = transliterate(title)
  const existing = await prisma.album.findUnique({ where: { slug: base }, select: { id: true } })
  if (!existing || existing.id === excludeId) {
    return base
  }

  const suffix = `-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const withSuffix = `${base}${suffix}`
  const existingSuffix = await prisma.album.findUnique({ where: { slug: withSuffix }, select: { id: true } })
  if (!existingSuffix || existingSuffix.id === excludeId) {
    return withSuffix
  }

  let counter = 2
  while (true) {
    const candidate = `${withSuffix}-${counter}`
    const ex = await prisma.album.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!ex) {
      return candidate
    }
    counter++
  }
}

async function moveAlbumCover(tempPath: string, albumId: string): Promise<string> {
  const filename = tempPath.split('/').pop()!
  const destDir = join(process.cwd(), 'uploads', 'albums', albumId)
  await mkdir(destDir, { recursive: true })
  const destPath = `albums/${albumId}/${filename}`
  await rename(join(process.cwd(), 'uploads', tempPath), join(process.cwd(), 'uploads', destPath))
  return destPath
}

function revalidateAlbumPaths(citySlug: string | null, playerSlug: string) {
  revalidatePath('/my/poems')
  if (citySlug) {
    revalidatePath(`/${citySlug}/players/${playerSlug}`)
    revalidatePath(`/${citySlug}/players/${playerSlug}/albums`)
  }
  revalidatePath(`/players/${playerSlug}`)
}

// ─── Actions ───────────────────────────────────────────────────────────────

export async function createAlbumAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = CreateAlbumSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { title, coverImage, publishedAt } = parsed.data
  const slug = await generateAlbumSlug(title)

  let finalCoverImage = coverImage ?? null

  const album = await prisma.album.create({
    data: {
      title,
      slug,
      playerId: auth.poet.playerId,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      coverImage: null,
    },
  })

  // Переместить временную обложку в папку альбома
  if (finalCoverImage?.startsWith('albums/temp/')) {
    try {
      finalCoverImage = await moveAlbumCover(finalCoverImage, album.id)
      await prisma.album.update({ where: { id: album.id }, data: { coverImage: finalCoverImage } })
    } catch {
      // Обложка не критична — продолжаем без неё
    }
  }

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: { albumId: album.id, slug: album.slug } }
}

export async function updateAlbumAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = UpdateAlbumSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { albumId, title, coverImage, publishedAt } = parsed.data

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { playerId: true, slug: true },
  })
  if (!album) {
    return { error: 'Альбом не найден' }
  }
  if (album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  const slug = await generateAlbumSlug(title, albumId)

  await prisma.album.update({
    where: { id: albumId },
    data: {
      title,
      slug,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      coverImage: coverImage ?? undefined,
    },
  })

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: { slug } }
}

export async function deleteAlbumAction(albumId: string) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { playerId: true },
  })
  if (!album) {
    return { error: 'Альбом не найден' }
  }
  if (album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  await prisma.album.delete({ where: { id: albumId } })

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: true }
}

export async function toggleAlbumPublishAction(albumId: string) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { playerId: true, publishedAt: true },
  })
  if (!album) {
    return { error: 'Альбом не найден' }
  }
  if (album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  const publishedAt = album.publishedAt ? null : new Date()
  await prisma.album.update({ where: { id: albumId }, data: { publishedAt } })

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: { publishedAt } }
}

export async function addPoemToAlbumAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = AlbumPoemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { albumId, poemId } = parsed.data

  const [album, poem] = await Promise.all([
    prisma.album.findUnique({ where: { id: albumId }, select: { playerId: true } }),
    prisma.poem.findUnique({ where: { id: poemId }, select: { playerId: true } }),
  ])

  if (!album || album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав на альбом' }
  }
  if (!poem || poem.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав на стихотворение' }
  }

  const maxOrder = await prisma.albumPoem.aggregate({
    where: { albumId },
    _max: { sortOrder: true },
  })

  await prisma.albumPoem.create({
    data: { albumId, poemId, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  })

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: true }
}

export async function removePoemFromAlbumAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = AlbumPoemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { albumId, poemId } = parsed.data

  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { playerId: true } })
  if (!album || album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  await prisma.albumPoem.deleteMany({ where: { albumId, poemId } })

  revalidateAlbumPaths(auth.poet.citySlug, auth.poet.playerSlug)
  return { data: true }
}

export async function reorderAlbumPoemsAction(input: unknown) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = ReorderSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const { albumId, poemIds } = parsed.data

  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { playerId: true } })
  if (!album || album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  await prisma.$transaction(
    poemIds.map((poemId, index) =>
      prisma.albumPoem.updateMany({
        where: { albumId, poemId },
        data: { sortOrder: index },
      })
    )
  )

  revalidatePath('/my/poems')
  return { data: true }
}

export async function getMyAlbumsAction() {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const albums = await prisma.album.findMany({
    where: { playerId: auth.poet.playerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      publishedAt: true,
      _count: { select: { albumPoems: true } },
    },
  })

  return { data: albums }
}

export async function getAlbumForEditAction(albumId: string) {
  const auth = await requirePoetAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const album = await prisma.album.findUnique({
    where: { id: albumId },
    include: {
      albumPoems: {
        orderBy: { sortOrder: 'asc' },
        include: {
          poem: { select: { id: true, title: true, slug: true, published: true } },
        },
      },
    },
  })

  if (!album) {
    return { error: 'Альбом не найден' }
  }
  if (album.playerId !== auth.poet.playerId) {
    return { error: 'Нет прав' }
  }

  const allPoems = await prisma.poem.findMany({
    where: { playerId: auth.poet.playerId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, published: true },
  })

  return { data: { album, allPoems } }
}
