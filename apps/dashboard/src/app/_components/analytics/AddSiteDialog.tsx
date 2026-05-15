'use client'

import { Button } from '@/app/_components/ui/button'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, CloseButton, Dialog, Fieldset, HStack, Icon, Input, Portal, Text, VStack } from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LuCheck, LuClipboard, LuGlobe, LuPlus } from 'react-icons/lu'
import { fetchSites, writeEnvToServer } from './api'

interface DeployedAppItem {
  name: string
  domain: string | null
  type: string
}

/** Загрузить список приложений из БД */
async function fetchDeployedApps(): Promise<DeployedAppItem[]> {
  const res = await fetch('/api/apps/list?all=true')
  if (!res.ok) {
    return []
  }
  const json = await res.json()
  return json.data ?? []
}

interface CreateSiteResponse {
  data: {
    id: string
    name: string
    domain: string
  }
}

async function createSite(payload: { name: string; domain: string }): Promise<CreateSiteResponse> {
  const res = await fetch('/api/analytics/sites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errorMessage = 'Ошибка создания сайта'
    try {
      const err = JSON.parse(text)
      if (err.error) {
        errorMessage = err.error
      }
    } catch {
      if (text) {
        errorMessage = text
      }
    }
    throw new Error(errorMessage)
  }
  return res.json()
}

/** Диалог добавления нового сайта в Umami */
export function AddSiteDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [createdSite, setCreatedSite] = useState<{ id: string; name: string; domain: string } | null>(null)
  const [envWritten, setEnvWritten] = useState(false)
  const [envWriting, setEnvWriting] = useState(false)
  const queryClient = useQueryClient()

  // Загружаем существующие сайты Umami для фильтрации кнопок
  const { data: existingSites } = useQuery({
    queryKey: ['analytics-sites'],
    queryFn: fetchSites,
    staleTime: 60 * 1000,
  })

  // Загружаем приложения из БД (единый реестр)
  const { data: deployedApps } = useQuery({
    queryKey: ['deployed-apps'],
    queryFn: fetchDeployedApps,
    staleTime: 5 * 60 * 1000,
  })

  // Приложения с доменами из БД
  const knownApps = (deployedApps ?? [])
    .filter((app): app is DeployedAppItem & { domain: string } => !!app.domain && app.type === 'web')
    .map((app) => ({ name: app.name, domain: app.domain }))

  // Имена уже добавленных сайтов
  const existingNames = new Set((existingSites ?? []).map((s) => s.name))

  // Приложения, которых ещё нет в Umami
  const availableApps = knownApps.filter((app) => !existingNames.has(app.name))

  const mutation = useMutation({
    mutationFn: createSite,
    onSuccess: (response) => {
      setCreatedSite(response.data)
      queryClient.invalidateQueries({ queryKey: ['analytics-sites'] })
      toaster.create({
        title: 'Сайт создан',
        description: `${response.data.name} (${response.data.domain})`,
        type: 'success',
      })
    },
    onError: (error) => {
      toaster.create({
        title: 'Ошибка',
        description: error.message,
        type: 'error',
      })
    },
  })

  /** Выбрать приложение из быстрого списка */
  const handleQuickSelect = (app: { name: string; domain: string }) => {
    setName(app.name)
    setDomain(app.domain)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !domain.trim()) {
      return
    }
    mutation.mutate({ name: name.trim(), domain: domain.trim() })
  }

  const handleClose = () => {
    setOpen(false)
    setName('')
    setDomain('')
    setCreatedSite(null)
    setEnvWritten(false)
  }

  /** Записать в .env.docker */
  const handleWriteEnv = async () => {
    if (!createdSite) {
      return
    }
    setEnvWriting(true)
    const { ok, error } = await writeEnvToServer(createdSite.domain, createdSite.id)
    setEnvWriting(false)
    if (ok) {
      setEnvWritten(true)
      toaster.create({ title: '.env.docker обновлён!', type: 'success' })
    } else {
      toaster.create({
        title: 'Не удалось записать',
        description: `${error}\nСкопируй вручную`,
        type: 'warning',
      })
    }
  }

  const envLine = createdSite
    ? `NEXT_PUBLIC_UMAMI_SCRIPT_URL=https://stats.letar.best/script.js\nNEXT_PUBLIC_UMAMI_WEBSITE_ID=${createdSite.id}`
    : ''

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(envLine)
    toaster.create({ title: 'Скопировано!', type: 'info' })
  }

  return (
    <Dialog.Root open={open} onOpenChange={(e) => (e.open ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <Button size="sm" colorPalette="brand">
          <Icon>
            <LuPlus />
          </Icon>
          Добавить сайт
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md">
            <Dialog.Header>
              <Dialog.Title>Добавить сайт в Umami</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild position="absolute" top="3" right="3">
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
            <Dialog.Body>
              {createdSite ? (
                /* Результат создания */
                <VStack align="stretch" gap="4">
                  <Text fontSize="sm" color="green.500" fontWeight="medium">
                    Сайт создан!
                  </Text>
                  <Box>
                    <Text fontSize="xs" color="fg.muted" mb="1">
                      Website ID:
                    </Text>
                    <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                      {createdSite.id}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="fg.muted" mb="1">
                      .env.docker:
                    </Text>
                    <Box
                      bg="bg.subtle"
                      borderRadius="md"
                      p="3"
                      fontFamily="mono"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                      wordBreak="break-all"
                    >
                      {envLine}
                    </Box>
                  </Box>
                  <HStack gap="2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard} flex="1">
                      <Icon>
                        <LuClipboard />
                      </Icon>
                      Копировать
                    </Button>
                    <Button
                      size="sm"
                      colorPalette={envWritten ? 'green' : 'brand'}
                      onClick={handleWriteEnv}
                      loading={envWriting}
                      disabled={envWritten}
                      flex="1"
                    >
                      <Icon>
                        <LuCheck />
                      </Icon>
                      {envWritten ? 'Записано' : 'Записать в .env.docker'}
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                /* Форма создания */
                <form onSubmit={handleSubmit}>
                  <VStack gap="4" align="stretch">
                    {/* Быстрый выбор приложений */}
                    {availableApps.length > 0 && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb="2">
                          Быстрый выбор
                        </Text>
                        <HStack gap="2" flexWrap="wrap">
                          {availableApps.map((app) => (
                            <Badge
                              key={app.name}
                              size="lg"
                              variant={name === app.name ? 'solid' : 'outline'}
                              colorPalette={name === app.name ? 'brand' : 'gray'}
                              cursor="pointer"
                              onClick={() => handleQuickSelect(app)}
                              px="3"
                              py="1"
                            >
                              <LuGlobe size={14} />
                              {app.name}
                            </Badge>
                          ))}
                        </HStack>
                      </Box>
                    )}

                    <Fieldset.Root>
                      <Fieldset.Content>
                        <VStack gap="4">
                          <Box w="full">
                            <Text fontSize="sm" fontWeight="medium" mb="1">
                              Название
                            </Text>
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-app" />
                          </Box>
                          <Box w="full">
                            <Text fontSize="sm" fontWeight="medium" mb="1">
                              Домен
                            </Text>
                            <Input
                              value={domain}
                              onChange={(e) => setDomain(e.target.value)}
                              placeholder="example.com"
                            />
                          </Box>
                        </VStack>
                      </Fieldset.Content>
                    </Fieldset.Root>

                    <HStack justify="end" gap="3">
                      <Button variant="ghost" onClick={handleClose}>
                        Отмена
                      </Button>
                      <Button
                        type="submit"
                        colorPalette="brand"
                        loading={mutation.isPending}
                        disabled={!name.trim() || !domain.trim()}
                      >
                        Создать
                      </Button>
                    </HStack>
                  </VStack>
                </form>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
