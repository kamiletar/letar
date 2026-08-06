'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { authClient, useSession } from '@/lib/auth-client'
import {
  Box,
  Button,
  Card,
  Collapsible,
  Field,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { LuPlus, LuSend, LuTrash2, LuUsers } from 'react-icons/lu'

interface TeamInviteProps {
  /** Название компании для создания организации */
  companyName: string
}

/**
 * Компонент для приглашения команды после отправки HireRequest
 *
 * Позволяет:
 * 1. Создать организацию (если авторизован)
 * 2. Добавить email'ы коллег
 * 3. Отправить приглашения
 */
export function TeamInvite({ companyName }: TeamInviteProps) {
  const t = useTranslations('hire.teamInvite')
  const { data: session, isPending } = useSession()

  const [isExpanded, setIsExpanded] = useState(false)
  const [emails, setEmails] = useState<string[]>([''])
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Создать организацию
  const handleCreateOrganization = useCallback(async () => {
    if (!session?.user) {
      return
    }

    setCreating(true)
    try {
      // Генерируем slug из названия компании
      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50)

      const result = await authClient.organization.create({
        name: companyName,
        slug: `${slug}-${Date.now()}`,
      })

      if (result.error) {
        toaster.error({ title: t('errors.createFailed') })
        return
      }

      setOrganizationId(result.data?.id ?? null)
      toaster.success({ title: t('orgCreated') })
    } catch (err) {
      console.error('Failed to create organization:', err)
      toaster.error({ title: t('errors.createFailed') })
    } finally {
      setCreating(false)
    }
  }, [session, companyName, t])

  // Добавить email поле
  const addEmailField = useCallback(() => {
    setEmails((prev) => [...prev, ''])
  }, [])

  // Удалить email поле
  const removeEmailField = useCallback((index: number) => {
    setEmails((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Обновить email
  const updateEmail = useCallback((index: number, value: string) => {
    setEmails((prev) => prev.map((email, i) => (i === index ? value : email)))
  }, [])

  // Отправить приглашения
  const handleInvite = useCallback(async () => {
    if (!organizationId) {
      return
    }

    const validEmails = emails.filter((e) => e.trim() && e.includes('@'))
    if (validEmails.length === 0) {
      toaster.error({ title: t('errors.noValidEmails') })
      return
    }

    setInviting(true)
    let successCount = 0

    try {
      for (const email of validEmails) {
        const result = await authClient.organization.inviteMember({
          email: email.trim(),
          role: 'member',
          organizationId,
        })

        if (!result.error) {
          successCount++
        }
      }

      if (successCount > 0) {
        toaster.success({
          title: t('invitesSent', { count: successCount }),
        })
        setEmails([''])
      }
    } catch (err) {
      console.error('Failed to send invites:', err)
      toaster.error({ title: t('errors.inviteFailed') })
    } finally {
      setInviting(false)
    }
  }, [organizationId, emails, t])

  // Загрузка сессии
  if (isPending) {
    return (
      <Box py={4} textAlign="center">
        <Spinner size="sm" />
      </Box>
    )
  }

  // Не авторизован — показываем призыв
  if (!session?.user) {
    return (
      <Card.Root variant="outline" mt={6}>
        <Card.Body>
          <VStack gap={4}>
            <Icon color="brand.500" boxSize={8}>
              <LuUsers />
            </Icon>
            <VStack gap={1}>
              <Heading size="md">{t('authRequired.title')}</Heading>
              <Text color="fg.muted" textAlign="center">
                {t('authRequired.description')}
              </Text>
            </VStack>
            <Button asChild colorPalette="brand" variant="outline">
              <Link href="/sign-in">{t('authRequired.signIn')}</Link>
            </Button>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root variant="outline" mt={6}>
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Заголовок с toggle */}
          <HStack justify="space-between" cursor="pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <HStack gap={3}>
              <Icon color="brand.500" boxSize={6}>
                <LuUsers />
              </Icon>
              <VStack gap={0} align="start">
                <Heading size="sm">{t('title')}</Heading>
                <Text fontSize="sm" color="fg.muted">
                  {t('subtitle')}
                </Text>
              </VStack>
            </HStack>
            <Icon transition="transform 0.2s" transform={isExpanded ? 'rotate(45deg)' : undefined}>
              <LuPlus />
            </Icon>
          </HStack>

          {/* Контент */}
          <Collapsible.Root open={isExpanded}>
            <Collapsible.Content>
              <VStack gap={4} pt={4} align="stretch">
                {/* Шаг 1: Создание организации */}
                {!organizationId
                  ? (
                    <Box p={4} bg="bg.subtle" borderRadius="lg" borderWidth="1px" borderColor="border.subtle">
                      <VStack gap={3}>
                        <Text fontSize="sm">{t('createOrgDescription')}</Text>
                        <Button colorPalette="brand" onClick={handleCreateOrganization} loading={creating} size="sm">
                          {t('createOrg')}
                        </Button>
                      </VStack>
                    </Box>
                  )
                  : (
                    <>
                      {/* Шаг 2: Добавление email'ов */}
                      <VStack gap={3} align="stretch">
                        {/* oxlint-disable-next-line react/no-array-index-key -- Редактируемый список */}
                        {emails.map((email, index) => (
                          <HStack key={index} gap={2}>
                            <Field.Root flex={1}>
                              <Input
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                value={email}
                                onChange={(e) => updateEmail(index, e.target.value)}
                              />
                            </Field.Root>
                            {emails.length > 1 && (
                              <IconButton
                                aria-label={t('removeEmail')}
                                variant="ghost"
                                colorPalette="red"
                                size="sm"
                                onClick={() => removeEmailField(index)}
                              >
                                <LuTrash2 />
                              </IconButton>
                            )}
                          </HStack>
                        ))}

                        <Button variant="ghost" size="sm" onClick={addEmailField} alignSelf="start">
                          <LuPlus />
                          {t('addEmail')}
                        </Button>
                      </VStack>

                      {/* Кнопка отправки */}
                      <Button
                        colorPalette="brand"
                        onClick={handleInvite}
                        loading={inviting}
                        disabled={!emails.some((e) => e.trim())}
                      >
                        <LuSend />
                        {t('sendInvites')}
                      </Button>
                    </>
                  )}
              </VStack>
            </Collapsible.Content>
          </Collapsible.Root>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
