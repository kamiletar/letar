import { prisma } from '@/lib/db'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AudioPageClient } from './_components/audio-page-client'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

/** Форматирование размера файла */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/** Форматирование длительности */
function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/** Построение описания для SEO */
function buildDescription(audio: {
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  size: number
}): string {
  const parts: string[] = []
  if (audio.artist) {
    parts.push(audio.artist)
  }
  if (audio.album) {
    parts.push(audio.album)
  }
  if (audio.duration) {
    parts.push(formatDuration(audio.duration))
  }
  parts.push('MP3')
  parts.push(formatSize(audio.size))
  return parts.join(' · ')
}

/** Поиск аудио по slug с fallback на id */
async function findAudio(slug: string) {
  // Сначала ищем по slug
  const bySlug = await prisma.audioFile.findUnique({ where: { slug } })
  if (bySlug) {
    return bySlug
  }

  // Fallback — ищем по id для обратной совместимости
  return prisma.audioFile.findUnique({ where: { id: slug } })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const audio = await findAudio(slug)

  if (!audio) {
    return { title: 'Аудио не найдено' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const audioUrl = `${baseUrl}/api/files/${audio.path}`
  const description = buildDescription(audio)

  return {
    title: `${audio.title}${audio.artist ? ` — ${audio.artist}` : ''}`,
    description,
    alternates: {
      canonical: `/${locale}/audio/${slug}`,
      languages: {
        ru: `/ru/audio/${slug}`,
        en: `/en/audio/${slug}`,
      },
    },
    openGraph: {
      title: audio.title,
      description: `Слушайте: ${audio.title}`,
      type: 'music.song',
      url: `${baseUrl}/${locale}/audio/${slug}`,
      audio: {
        url: audioUrl,
        secureUrl: audioUrl,
        type: 'audio/mpeg',
      },
      ...(audio.coverPath && {
        images: [{ url: `${baseUrl}/api/files/${audio.coverPath}`, width: 300, height: 300 }],
      }),
    },
  }
}

export default async function AudioPage({ params }: PageProps) {
  const { locale, slug } = await params

  const audio = await findAudio(slug)

  if (!audio) {
    notFound()
  }

  return (
    <AudioPageClient
      audio={{
        title: audio.title,
        artist: audio.artist,
        album: audio.album,
        duration: audio.duration,
        size: audio.size,
        bitrate: audio.bitrate,
        coverPath: audio.coverPath,
        path: audio.path,
        uploadedAt: audio.uploadedAt,
      }}
      locale={locale}
    />
  )
}
