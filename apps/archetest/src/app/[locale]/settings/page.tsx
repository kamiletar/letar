'use client'

import { useSession } from '@/lib/auth-client'
import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Heading,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuLink, LuShieldOff, LuTrash2, LuTriangleAlert, LuUser } from 'react-icons/lu'
import { deleteMyQuizDataAction } from '../_actions/data-deletion.action'
import {
  getMyLinkedPsychologistsAction,
  linkPsychologistAction,
  revokePsychologistAction,
} from '../_actions/psychologist.action'

/**
 * Страница настроек пользователя — привязка психолога
 */
export default function SettingsPage() {
  const { data: session } = useSession()
  const t = useTranslations('settings')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [links, setLinks] = useState<Awaited<ReturnType<typeof getMyLinkedPsychologistsAction>>['data']>([])
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  // Удаление своих данных (152-ФЗ, право на удаление)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteCancelRef = useRef<HTMLButtonElement>(null)

  const loadLinks = useCallback(async () => {
    const result = await getMyLinkedPsychologistsAction()
    setLinks(result.data)
  }, [])

  useEffect(() => {
    if (session?.user) {
      loadLinks()
    }
  }, [session?.user, loadLinks])

  const handleLink = async () => {
    if (!email.trim()) {
      return
    }
    setLoading(true)
    setMessage(null)

    const result = await linkPsychologistAction({ email: email.trim() })
    setLoading(false)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({
        type: 'success',
        text: `${result.data?.psychologistName || result.data?.psychologistEmail} привязан`,
      })
      setEmail('')
      loadLinks()
    }
  }

  const handleDeleteData = async () => {
    setDeleting(true)
    const result = await deleteMyQuizDataAction()
    setDeleting(false)
    setDeleteOpen(false)
    if (result.error) {
      setMessage({ type: 'error', text: t('deleteDataError') })
    } else {
      setMessage({ type: 'success', text: t('deleteDataSuccess', { count: result.deleted ?? 0 }) })
    }
  }

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) {
      return
    }
    const result = await revokePsychologistAction(revokeTarget.id)
    setRevokeTarget(null)
    if (!result.error) {
      loadLinks()
    }
  }

  if (!session?.user) {
    return (
      <Container maxW="2xl" py={12}>
        <Text color="fg.muted">{t('title')}</Text>
      </Container>
    )
  }

  const activeLinks = links.filter((l) => l.status === 'ACTIVE')

  return (
    <Container maxW="2xl" py={12}>
      <VStack gap={8} align="start" w="100%">
        <Heading size="xl">{t('title')}</Heading>

        {/* Секция привязки психолога */}
        <Card.Root w="100%" variant="outline">
          <Card.Body>
            <VStack align="start" gap={4}>
              <HStack gap={2}>
                <LuUser size={20} />
                <Heading size="md">{t('myPsychologist')}</Heading>
              </HStack>

              <Text fontSize="sm" color="fg.muted">
                {t('myPsychologistDesc')}
              </Text>

              <Box p={3} bg="bg.subtle" borderRadius="md" w="100%">
                <Text fontSize="xs" color="fg.subtle">
                  {t('whatSees')}
                </Text>
              </Box>

              {/* Активные связи */}
              {activeLinks.map((link) => (
                <Card.Root key={link.id} w="100%" variant="subtle">
                  <Card.Body>
                    <HStack justify="space-between" w="100%">
                      <VStack align="start" gap={0}>
                        <Text fontWeight="bold">{link.psychologist.name || link.psychologist.email}</Text>
                        <Text fontSize="sm" color="fg.muted">
                          {link.psychologist.email}
                        </Text>
                      </VStack>
                      <Button
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        onClick={() =>
                          setRevokeTarget({
                            id: link.id,
                            name: link.psychologist.name || link.psychologist.email,
                          })
                        }
                      >
                        <LuShieldOff size={14} />
                        {t('revoke')}
                      </Button>
                    </HStack>
                  </Card.Body>
                </Card.Root>
              ))}

              {/* Форма привязки */}
              <HStack w="100%" gap={2}>
                <Input
                  placeholder={t('psychologistEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                  flex={1}
                />
                <Button onClick={handleLink} loading={loading} colorPalette="blue">
                  <LuLink size={14} />
                  {t('link')}
                </Button>
              </HStack>

              {message && (
                <Alert.Root status={message.type === 'error' ? 'error' : 'success'} variant="outline" borderRadius="md">
                  {message.type === 'error' && (
                    <Alert.Indicator>
                      <LuTriangleAlert />
                    </Alert.Indicator>
                  )}
                  <Alert.Description>{message.text}</Alert.Description>
                </Alert.Root>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Секция управления своими данными (152-ФЗ: право на удаление) */}
        <Card.Root w="100%" variant="outline">
          <Card.Body>
            <VStack align="start" gap={4}>
              <HStack gap={2}>
                <LuTrash2 size={20} />
                <Heading size="md">{t('myData')}</Heading>
              </HStack>

              <Text fontSize="sm" color="fg.muted">
                {t('myDataDesc')}
              </Text>

              <Button variant="outline" colorPalette="red" onClick={() => setDeleteOpen(true)}>
                <LuTrash2 size={14} />
                {t('deleteData')}
              </Button>
            </VStack>
          </Card.Body>
        </Card.Root>
      </VStack>

      {/* Диалог подтверждения удаления данных */}
      <Dialog.Root
        open={deleteOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            setDeleteOpen(false)
          }
        }}
        initialFocusEl={() => deleteCancelRef.current}
        role="alertdialog"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{t('deleteDataTitle')}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{t('deleteDataConfirm')}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button ref={deleteCancelRef} variant="outline" onClick={() => setDeleteOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button colorPalette="red" onClick={handleDeleteData} loading={deleting} ml={3}>
                  {t('deleteDataAction')}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог подтверждения отзыва */}
      <Dialog.Root
        open={!!revokeTarget}
        onOpenChange={(e) => {
          if (!e.open) {
            setRevokeTarget(null)
          }
        }}
        initialFocusEl={() => cancelRef.current}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{t('revokeTitle')}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>{t('revokeConfirm', { name: revokeTarget?.name ?? '' })}</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button ref={cancelRef} variant="outline" onClick={() => setRevokeTarget(null)}>
                  {t('cancel')}
                </Button>
                <Button colorPalette="red" onClick={handleRevokeConfirm} ml={3}>
                  {t('revokeAction')}
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Container>
  )
}
