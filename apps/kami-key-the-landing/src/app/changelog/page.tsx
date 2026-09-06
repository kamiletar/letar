import { Footer } from '@/app/_components/footer'
import { Navbar } from '@/app/_components/navbar'
import { getReleases } from '@/lib/github'
import { Badge, Box, Card, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuArrowUpRight } from 'react-icons/lu'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const metadata: Metadata = {
  title: 'История изменений',
  description: 'Ченджлог KamiKeyThe — что изменилось в каждой версии.',
  robots: { index: true, follow: true },
}

/**
 * Страница истории изменений — релизы подтягиваются с GitHub Releases
 * (kamiletar/letar, тег kami-key-the-v*) на этапе сборки/ISR, без своей БД.
 */
export default async function ChangelogPage() {
  const releases = await getReleases()

  return (
    <Box asChild>
      <main>
        <Navbar />
        <Container maxW="3xl" py={{ base: 16, md: 24 }}>
          <VStack gap={10} align="stretch">
            <VStack gap={2} align="start">
              <Heading size="xl">История изменений</Heading>
              <Text color="fg.muted" fontSize="sm">
                Релизы KamiKeyThe — что изменилось в каждой версии
              </Text>
            </VStack>

            {releases.length === 0 && (
              <Text color="fg.muted">
                Релизы пока не опубликованы. Актуальная версия для скачивания — на{' '}
                <Box asChild color="brand.400" textDecoration="underline">
                  <a href="/#downloads">странице загрузки</a>
                </Box>
                .
              </Text>
            )}

            <VStack gap={4} align="stretch">
              {releases.map((release) => (
                <Card.Root key={release.version} className="glass" borderRadius="xl">
                  <Card.Body p={6}>
                    <VStack align="stretch" gap={3}>
                      <HStack justify="space-between" wrap="wrap" gap={2}>
                        <HStack gap={3}>
                          <Badge colorPalette="green" px={3} py={1} borderRadius="full" fontSize="sm">
                            v{release.version}
                          </Badge>
                          <Text color="gray.500" fontSize="sm">
                            {release.date}
                          </Text>
                        </HStack>
                        {release.exeUrl && (
                          <Box
                            asChild
                            display="inline-flex"
                            alignItems="center"
                            gap={1}
                            fontSize="xs"
                            color="gray.500"
                            _hover={{ color: 'brand.400' }}
                          >
                            <a href={release.exeUrl}>
                              Скачать .exe{release.exeSize ? ` (${release.exeSize})` : ''}
                              <LuArrowUpRight size={12} />
                            </a>
                          </Box>
                        )}
                      </HStack>

                      {release.body
                        ? (
                          <Box
                            fontSize="sm"
                            color="gray.300"
                            css={{
                              '& p': { marginBottom: '0.5em' },
                              '& ul, & ol': { marginLeft: '1.5em', marginBottom: '0.5em' },
                              '& li': { marginBottom: '0.25em' },
                              '& a': { color: 'var(--chakra-colors-brand-400)', textDecoration: 'underline' },
                              '& code': {
                                background: 'rgba(255,255,255,0.1)',
                                padding: '0.1em 0.3em',
                                borderRadius: '3px',
                              },
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.body}</ReactMarkdown>
                          </Box>
                        )
                        : (
                          <Text fontSize="sm" color="gray.500">
                            Без описания.
                          </Text>
                        )}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              ))}
            </VStack>
          </VStack>
        </Container>
        <Footer />
      </main>
    </Box>
  )
}
