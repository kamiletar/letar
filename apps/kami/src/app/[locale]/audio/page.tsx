import { prisma } from '@/lib/db'
import { Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ru' ? 'Аудио' : 'Audio',
    description: locale === 'ru'
      ? 'Коллекция аудиозаписей Ками — музыка, миксы и подкасты для прослушивания онлайн'
      : "Kami's audio collection — music, mixes and podcasts to listen online",
    alternates: {
      canonical: `/${locale}/audio`,
      languages: { ru: '/ru/audio', en: '/en/audio' },
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'}/${locale}/audio` },
  }
}

/** Форматирование размера */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export default async function AudioListPage({ params }: PageProps) {
  const { locale } = await params

  const audioFiles = await prisma.audioFile.findMany({
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      artist: true,
      size: true,
      uploadedAt: true,
    },
  })

  return (
    <Box maxW="600px" mx="auto" py={12} px={4}>
      <VStack gap={6} align="stretch">
        <Heading as="h1" size="2xl" textAlign="center">
          Аудио
        </Heading>

        {audioFiles.length === 0
          ? (
            <Text color="fg.muted" textAlign="center">
              Аудиозаписей пока нет.
            </Text>
          )
          : (
            <VStack gap={3} align="stretch">
              {audioFiles.map((audio) => (
                <Link key={audio.id} href={`/${locale}/audio/${audio.slug}`}>
                  <Card.Root
                    _hover={{ shadow: 'md', borderColor: 'purple.200' }}
                    transitionProperty="box-shadow, border-color"
                    transitionDuration="0.2s"
                    cursor="pointer"
                  >
                    <Card.Body py={3} px={4}>
                      <HStack justify="space-between">
                        <VStack gap={0} align="start">
                          <Text fontWeight="medium">{audio.title}</Text>
                          {audio.artist && (
                            <Text fontSize="sm" color="fg.muted">
                              {audio.artist}
                            </Text>
                          )}
                        </VStack>
                        <HStack gap={3} color="fg.muted" fontSize="sm">
                          <Text>{formatSize(audio.size)}</Text>
                          <Text>{new Date(audio.uploadedAt).toLocaleDateString('ru-RU')}</Text>
                        </HStack>
                      </HStack>
                    </Card.Body>
                  </Card.Root>
                </Link>
              ))}
            </VStack>
          )}
      </VStack>
    </Box>
  )
}
