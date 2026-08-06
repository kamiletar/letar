'use client'

import { Box, Button, Checkbox, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { LuCheck, LuSave } from 'react-icons/lu'

import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  updateSubscription,
} from '@/app/_actions/subscription.action'
import { useRouter } from '@/i18n/navigation'
import { useSession } from '@/lib/auth-client'

type SubscriptionSettings = {
  notifyMonth: boolean
  notifyWeek: boolean
  notifyDay: boolean
  notifyHour: boolean
  notify5Min: boolean
}

export default function ProfilePage() {
  const t = useTranslations('profile')
  const locale = useLocale()
  const { data: session } = useSession()
  const router = useRouter()

  const [settings, setSettings] = useState<SubscriptionSettings>({
    notifyMonth: true,
    notifyWeek: true,
    notifyDay: true,
    notifyHour: true,
    notify5Min: true,
  })
  const [hasSubscription, setHasSubscription] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      router.push('/sign-in')
      return
    }

    getSubscription().then((result) => {
      if (result.data) {
        setHasSubscription(true)
        setSettings({
          notifyMonth: result.data.notifyMonth,
          notifyWeek: result.data.notifyWeek,
          notifyDay: result.data.notifyDay,
          notifyHour: result.data.notifyHour,
          notify5Min: result.data.notify5Min,
        })
      }
      setLoading(false)
    })
  }, [session, router])

  if (!session || loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="md" />
      </Box>
    )
  }

  async function handleSave() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await updateSubscription({ ...settings, locale, timezone })
    if (!result.error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleCreate() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const result = await createSubscription({ locale, timezone })
    if (!result.error) {
      setHasSubscription(true)
    }
  }

  async function handleUnsubscribe() {
    const result = await deleteSubscription()
    if (!result.error) {
      setHasSubscription(false)
    }
  }

  const checkboxes: Array<{ key: keyof SubscriptionSettings; label: string }> = [
    { key: 'notifyMonth', label: t('notifyMonth') },
    { key: 'notifyWeek', label: t('notifyWeek') },
    { key: 'notifyDay', label: t('notifyDay') },
    { key: 'notifyHour', label: t('notifyHour') },
    { key: 'notify5Min', label: t('notify5Min') },
  ]

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" px={4}>
      <VStack gap={6} maxW="400px" w="full">
        <Text fontSize="xl" fontWeight="300" letterSpacing="0.08em">
          {t('title')}
        </Text>

        <HStack w="full" justify="space-between">
          <Text fontWeight="100" color="fg.muted">
            {t('email')}
          </Text>
          <Text fontWeight="200">{session.user.email}</Text>
        </HStack>

        {hasSubscription
          ? (
            <>
              <VStack w="full" align="start" gap={3}>
                {checkboxes.map(({ key, label }) => (
                  <Checkbox.Root
                    key={key}
                    checked={settings[key]}
                    onCheckedChange={(details) => {
                      setSettings((prev) => ({ ...prev, [key]: !!details.checked }))
                      setSaved(false)
                    }}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label fontWeight="100">{label}</Checkbox.Label>
                  </Checkbox.Root>
                ))}
              </VStack>

              <HStack w="full" gap={3}>
                <Button flex={1} variant="outline" fontWeight="200" onClick={handleSave}>
                  {saved ? <LuCheck /> : <LuSave />}
                  {saved ? t('saved') : t('save')}
                </Button>
                <Button flex={1} variant="ghost" fontWeight="100" colorPalette="red" onClick={handleUnsubscribe}>
                  {t('unsubscribe')}
                </Button>
              </HStack>
            </>
          )
          : (
            <VStack gap={3}>
              <Text fontWeight="100" color="fg.muted" textAlign="center">
                {t('noSubscription')}
              </Text>
              <Button variant="outline" fontWeight="200" onClick={handleCreate}>
                {t('createSubscription')}
              </Button>
            </VStack>
          )}
      </VStack>
    </Box>
  )
}
