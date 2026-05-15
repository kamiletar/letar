'use client'

/**
 * Карточка профилей кодирования
 */

import { Badge, Box, Button, Card, Heading, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCopy, LuFilm, LuPlay, LuPlus, LuStar } from 'react-icons/lu'

import { duplicateEncodingProfile, setDefaultEncodingProfile } from '@/app/_actions/encoding-profile.action'
import { toaster } from '@/components/ui/toaster'
import { Tooltip } from '@/components/ui/tooltip'
import type { EncodingProfile } from '@/generated/prisma'

interface EncodingProfilesCardProps {
  profiles: EncodingProfile[] | undefined
  isLoading: boolean
  onRefetch: () => void
}

/**
 * Список профилей кодирования
 */
export function EncodingProfilesCard({ profiles, isLoading, onRefetch }: EncodingProfilesCardProps) {
  const handleSetDefault = async (profile: EncodingProfile) => {
    await setDefaultEncodingProfile(profile.id)
    onRefetch()
    toaster.success({ title: `${profile.name} установлен по умолчанию` })
  }

  const handleDuplicate = async (profile: EncodingProfile) => {
    await duplicateEncodingProfile(profile.id)
    onRefetch()
    toaster.success({ title: `Создана копия: ${profile.name}` })
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon as={LuFilm} color="purple.400" boxSize={5} />
            <Heading size="md">Профили кодирования</Heading>
          </HStack>
          <HStack gap={2}>
            <Button asChild size="sm" variant="outline">
              <Link href="/test-encoding">
                <Icon as={LuPlay} />
                Тестировать
              </Link>
            </Button>
            <Button asChild size="sm" colorPalette="purple">
              <Link href="/settings/profiles/new">
                <Icon as={LuPlus} />
                Создать
              </Link>
            </Button>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        {isLoading ? (
          <HStack justify="center" py={4}>
            <Spinner size="sm" />
            <Text color="fg.subtle">Загрузка профилей...</Text>
          </HStack>
        ) : profiles && profiles.length > 0 ? (
          <VStack gap={2} align="stretch">
            {profiles.map((profile) => (
              <Box key={profile.id} p={3} bg="bg.subtle" borderRadius="md" transition="background 0.2s">
                <HStack justify="space-between">
                  <Link href={`/settings/profiles/${profile.id}`} style={{ flex: 1 }}>
                    <HStack gap={3} _hover={{ opacity: 0.8 }} cursor="pointer">
                      {profile.isDefault && <Icon as={LuStar} color="yellow.400" boxSize={4} />}
                      <Box>
                        <HStack gap={2}>
                          <Text fontWeight="medium">{profile.name}</Text>
                          {profile.isBuiltIn && (
                            <Badge size="sm" colorPalette="purple" variant="subtle">
                              Встроенный
                            </Badge>
                          )}
                        </HStack>
                        <HStack gap={2} mt={1}>
                          <Badge size="xs" variant="outline">
                            CQ:{profile.cq}
                          </Badge>
                          <Badge size="xs" variant="outline">
                            {profile.preset}
                          </Badge>
                          {profile.tune !== 'NONE' && (
                            <Badge size="xs" variant="outline">
                              {profile.tune.toLowerCase()}
                            </Badge>
                          )}
                          <Badge size="xs" variant="outline">
                            {profile.rateControl}
                          </Badge>
                        </HStack>
                      </Box>
                    </HStack>
                  </Link>
                  <HStack gap={1}>
                    {/* Сделать по умолчанию */}
                    {!profile.isDefault && (
                      <Tooltip content="Сделать по умолчанию">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault()
                            handleSetDefault(profile)
                          }}
                        >
                          <Icon as={LuStar} boxSize={4} />
                        </Button>
                      </Tooltip>
                    )}
                    {/* Копировать */}
                    <Tooltip content="Копировать профиль">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDuplicate(profile)
                        }}
                      >
                        <Icon as={LuCopy} boxSize={4} />
                      </Button>
                    </Tooltip>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        ) : (
          <Text color="fg.subtle" textAlign="center" py={4}>
            Нет профилей кодирования
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  )
}
