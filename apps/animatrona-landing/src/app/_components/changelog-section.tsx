'use client'

import type { ParsedRelease, ReleaseChange } from '@/types/release'
import { Badge, Box, Card, Container, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { LuArrowRight, LuSparkles, LuWrench, LuZap } from 'react-icons/lu'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChangelogSectionProps {
  releases: ParsedRelease[]
}

function getChangeIcon(type: ReleaseChange['type']) {
  switch (type) {
    case 'feature':
      return LuSparkles
    case 'fix':
      return LuWrench
    case 'breaking':
      return LuZap
    default:
      return LuSparkles
  }
}

function getChangeColor(type: ReleaseChange['type']) {
  switch (type) {
    case 'feature':
      return 'green.400'
    case 'fix':
      return 'orange.400'
    case 'breaking':
      return 'red.400'
    default:
      return 'gray.400'
  }
}

export function ChangelogSection({ releases }: ChangelogSectionProps) {
  // Показываем только последние 5 релизов
  const displayReleases = releases.slice(0, 5)

  if (displayReleases.length === 0) {
    return null
  }

  return (
    <Box as="section" id="changelog" py={{ base: 16, md: 24 }} bg="gray.900/50">
      <Container maxW="container.lg">
        <VStack gap={12}>
          {/* Заголовок */}
          <VStack gap={4} textAlign="center">
            <Heading as="h2" size={{ base: '2xl', md: '3xl' }}>
              История изменений
            </Heading>
            <Text color="gray.400" fontSize="lg">
              Последние обновления и улучшения
            </Text>
          </VStack>

          {/* Список релизов */}
          <VStack gap={4} w="full">
            {displayReleases.map((release) => (
              <Card.Root key={release.version} className="glass" borderRadius="xl" w="full">
                <Card.Body p={6}>
                  <VStack align="stretch" gap={4}>
                    {/* Заголовок релиза */}
                    <HStack justify="space-between" wrap="wrap" gap={2}>
                      <HStack gap={3}>
                        <Badge colorPalette="purple" px={3} py={1} borderRadius="full" fontSize="sm">
                          v{release.version}
                        </Badge>
                        <Text color="gray.500" fontSize="sm">
                          {release.date}
                        </Text>
                      </HStack>
                    </HStack>

                    {/* Список изменений */}
                    {release.changes.length > 0 && (
                      <VStack align="start" gap={2}>
                        {release.changes.slice(0, 5).map((change) => (
                          <HStack key={`${release.version}-${change.text.slice(0, 30)}`} gap={2} align="start">
                            <Icon
                              as={getChangeIcon(change.type)}
                              color={getChangeColor(change.type)}
                              boxSize={4}
                              mt={0.5}
                              flexShrink={0}
                            />
                            <Text fontSize="sm" color="gray.300">
                              {change.text}
                            </Text>
                          </HStack>
                        ))}
                        {release.changes.length > 5 && (
                          <Text fontSize="xs" color="gray.500">
                            ... и ещё {release.changes.length - 5} изменений
                          </Text>
                        )}
                      </VStack>
                    )}

                    {/* Если нет структурированных изменений — рендерим rawBody */}
                    {release.changes.length === 0 && release.rawBody && (
                      <Box
                        className="changelog-markdown"
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
                          '& h1, & h2, & h3': { fontWeight: 'bold', marginTop: '0.5em', marginBottom: '0.25em' },
                        }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.rawBody}</ReactMarkdown>
                      </Box>
                    )}

                    {/* Если вообще нет данных */}
                    {release.changes.length === 0 && !release.rawBody && (
                      <Text fontSize="sm" color="gray.500">
                        Подробности на GitHub
                      </Text>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>

          {/* Ссылка на все релизы */}
          <Link
            href="https://github.com/kamiletar/animatrona/releases"
            target="_blank"
            rel="noopener noreferrer"
            color="brand.400"
            fontSize="sm"
            display="flex"
            alignItems="center"
            gap={1}
            _hover={{ color: 'brand.300' }}
          >
            Все релизы на GitHub
            <Icon as={LuArrowRight} />
          </Link>
        </VStack>
      </Container>
    </Box>
  )
}
