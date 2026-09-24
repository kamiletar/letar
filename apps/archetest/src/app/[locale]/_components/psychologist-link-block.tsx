'use client'

import { Link } from '@/i18n/navigation'
import { useSession } from '@/lib/auth-client'
import { Alert, Button, Card, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { LuLink, LuSettings, LuShieldCheck, LuUser } from 'react-icons/lu'
import { getMyLinkedPsychologistsAction, linkPsychologistAction } from '../_actions/psychologist.action'

/**
 * Блок привязки психолога на странице результатов
 */
export function PsychologistLinkBlock() {
  const { data: session } = useSession()
  const t = useTranslations('psychologistLink')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasActiveLink, setHasActiveLink] = useState(false)
  const [psychologistName, setPsychologistName] = useState<string | null>(null)

  const loadLinks = useCallback(async () => {
    const result = await getMyLinkedPsychologistsAction()
    const active = result.data.find((l) => l.status === 'ACTIVE')
    if (active) {
      setHasActiveLink(true)
      setPsychologistName(active.psychologist.name || active.psychologist.email)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      // Загрузка данных с сервера при монтировании/смене сессии, не производное
      // от пропсов значение
      // oxlint-disable-next-line react/set-state-in-effect
      loadLinks()
    }
  }, [session?.user, loadLinks])

  // Не показываем незалогиненным
  if (!session?.user) {
    return null
  }

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
      setMessage({ type: 'success', text: t('linked') })
      setEmail('')
      setHasActiveLink(true)
      setPsychologistName(result.data?.psychologistName || result.data?.psychologistEmail || null)
    }
  }

  // Уже привязан
  if (hasActiveLink) {
    return (
      <Card.Root w="100%" variant="subtle">
        <Card.Body py={3}>
          <HStack gap={2}>
            <LuShieldCheck size={16} />
            <Text fontSize="sm">
              {t('canSee', { psychologistName: psychologistName ?? '' })}
            </Text>
            <Button asChild variant="ghost" size="xs">
              <Link href="/settings">
                <LuSettings size={12} />
              </Link>
            </Button>
          </HStack>
        </Card.Body>
      </Card.Root>
    )
  }

  // Не привязан — показываем компактную форму
  return (
    <Card.Root w="100%" variant="outline" borderColor="border">
      <Card.Body py={3}>
        <VStack align="start" gap={2}>
          <HStack gap={2}>
            <LuUser size={16} />
            <Text fontSize="sm" fontWeight="bold">
              {t('title')}
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted">
            {t('hint')}
          </Text>
          <HStack w="100%" gap={2}>
            <Input
              size="sm"
              placeholder={t('emailLabel')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLink()}
              flex={1}
            />
            <Button size="sm" onClick={handleLink} loading={loading} colorPalette="brand">
              <LuLink size={14} />
            </Button>
          </HStack>
          {message && (
            <Alert.Root
              status={message.type === 'error' ? 'error' : 'success'}
              variant="outline"
              borderRadius="md"
              py={2}
            >
              <Alert.Description fontSize="xs">{message.text}</Alert.Description>
            </Alert.Root>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
