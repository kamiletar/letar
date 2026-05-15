'use client'

import { createProxyHostAction } from '@/app/_actions/npm-actions'
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/app/_components/ui/dialog'
import { Switch } from '@/app/_components/ui/switch'
import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Box, Button, Field, Fieldset, HStack, Input, NativeSelect, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useTransition } from 'react'
import { LuPlus, LuServer } from 'react-icons/lu'

import {
  createProxyHostDefaults,
  type CreateProxyHostFormData,
  transformFormDataToApi,
} from '../../nginx/_schemas/create-proxy-host.schema'

interface AppInfo {
  name: string
  displayName: string
  port?: number
  domain?: string
  hasDocker: boolean
  containerName?: string
  type: 'web' | 'cli'
}

interface CreateProxyHostDialogProps {
  apps: AppInfo[]
  serverId?: string | null
  /** Уже настроенные proxy hosts — для фильтрации уже добавленных приложений */
  existingHosts?: { forward_host: string }[]
}

/**
 * Диалог создания нового proxy host с prefilled данными из конфигурации приложения
 */
export function CreateProxyHostDialog({ apps, serverId, existingHosts = [] }: CreateProxyHostDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<string>('')
  const [formData, setFormData] = useState<CreateProxyHostFormData>(createProxyHostDefaults)
  const [isPending, startTransition] = useTransition()

  const queryClient = useQueryClient()

  // Контейнеры, для которых уже есть proxy host
  const usedContainerNames = new Set(existingHosts.map((h) => h.forward_host))

  // Фильтруем только web приложения с Docker, которые ещё не имеют proxy host
  const webApps = apps.filter(
    (app) => app.type === 'web' && app.hasDocker && !usedContainerNames.has(app.containerName ?? '')
  )

  /**
   * Выбор приложения — заполняет форму данными из БД (props)
   */
  const handleAppSelect = (appName: string) => {
    setSelectedApp(appName)

    if (!appName) {
      setFormData(createProxyHostDefaults)
      return
    }

    const app = apps.find((a) => a.name === appName)
    if (!app) {
      return
    }

    setFormData({
      ...createProxyHostDefaults,
      domain_names: app.domain ?? '',
      forward_host: app.containerName ?? '',
      forward_port: app.port ?? 3000,
    })
  }

  /**
   * Обновление поля формы
   */
  const updateField = <K extends keyof CreateProxyHostFormData>(field: K, value: CreateProxyHostFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  /**
   * Создание proxy host
   */
  const handleSubmit = () => {
    startTransition(async () => {
      const apiData = transformFormDataToApi(formData)

      if (apiData.domain_names.length === 0) {
        toaster.create({
          title: 'Укажите хотя бы один домен',
          type: 'error',
        })
        return
      }

      const result = await createProxyHostAction(apiData, serverId)

      if (result.success) {
        toaster.create({
          title: 'Proxy host создан',
          description: apiData.domain_names.join(', '),
          type: 'success',
        })
        queryClient.invalidateQueries({ queryKey: ['npm-proxy-hosts', serverId] })
        setOpen(false)
        resetForm()
      } else {
        toaster.create({
          title: 'Ошибка создания',
          description: result.error,
          type: 'error',
        })
      }
    })
  }

  /**
   * Сброс формы
   */
  const resetForm = () => {
    setSelectedApp('')
    setFormData(createProxyHostDefaults)
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => {
        setOpen(e.open)
        if (!e.open) {
          resetForm()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" colorPalette="blue">
          <LuPlus />
          Создать Proxy Host
        </Button>
      </DialogTrigger>

      <DialogContent maxW="2xl">
        <DialogHeader>
          <DialogTitle>Создать Proxy Host</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <VStack gap="6" align="stretch">
            {/* Выбор приложения */}
            <Box>
              <Text fontWeight="medium" mb="2">
                Выберите приложение
              </Text>
              <HStack gap="2" flexWrap="wrap">
                {webApps.map((app) => (
                  <Badge
                    key={app.name}
                    size="lg"
                    variant={selectedApp === app.name ? 'solid' : 'outline'}
                    colorPalette={selectedApp === app.name ? 'blue' : 'gray'}
                    cursor="pointer"
                    onClick={() => handleAppSelect(app.name)}
                    px="3"
                    py="1"
                  >
                    <LuServer size={14} />
                    {app.displayName}
                  </Badge>
                ))}
              </HStack>
            </Box>

            {/* Основные поля */}
            <Fieldset.Root>
              <Fieldset.Legend>Основные настройки</Fieldset.Legend>
              <Fieldset.Content>
                <Field.Root>
                  <Field.Label>Домены (через запятую)</Field.Label>
                  <Input
                    value={formData.domain_names}
                    onChange={(e) => updateField('domain_names', e.target.value)}
                    placeholder="example.com, www.example.com"
                  />
                  <Field.HelperText>Все домены, которые должны указывать на это приложение</Field.HelperText>
                </Field.Root>

                <HStack gap="4">
                  <Field.Root flex="1">
                    <Field.Label>Forward Host</Field.Label>
                    <Input
                      value={formData.forward_host}
                      onChange={(e) => updateField('forward_host', e.target.value)}
                      placeholder="container-name"
                    />
                  </Field.Root>

                  <Field.Root w="120px">
                    <Field.Label>Port</Field.Label>
                    <Input
                      type="number"
                      value={formData.forward_port}
                      onChange={(e) => updateField('forward_port', parseInt(e.target.value) || 3000)}
                    />
                  </Field.Root>

                  <Field.Root w="120px">
                    <Field.Label>Scheme</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={formData.forward_scheme}
                        onChange={(e) => updateField('forward_scheme', e.target.value as 'http' | 'https')}
                      >
                        <option value="http">http</option>
                        <option value="https">https</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                </HStack>
              </Fieldset.Content>
            </Fieldset.Root>

            {/* SSL настройки */}
            <Fieldset.Root>
              <Fieldset.Legend>SSL настройки</Fieldset.Legend>
              <Fieldset.Content>
                <Field.Root>
                  <Field.Label>SSL Certificate</Field.Label>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={formData.certificate_id === undefined ? 'none' : formData.certificate_id.toString()}
                      onChange={(e) => {
                        const val = e.target.value
                        updateField(
                          'certificate_id',
                          val === 'new' ? 'new' : val === 'none' ? undefined : parseInt(val)
                        )
                      }}
                    >
                      <option value="new">Request a new Certificate (Let&apos;s Encrypt)</option>
                      <option value="none">None</option>
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                <HStack gap="6" flexWrap="wrap">
                  <HStack gap="2">
                    <Switch
                      checked={formData.ssl_forced}
                      onCheckedChange={(e) => updateField('ssl_forced', e.checked)}
                    />
                    <Text fontSize="sm">Force SSL</Text>
                  </HStack>

                  <HStack gap="2">
                    <Switch
                      checked={formData.hsts_enabled}
                      onCheckedChange={(e) => updateField('hsts_enabled', e.checked)}
                    />
                    <Text fontSize="sm">HSTS Enabled</Text>
                  </HStack>
                </HStack>
              </Fieldset.Content>
            </Fieldset.Root>

            {/* Дополнительные настройки */}
            <Fieldset.Root>
              <Fieldset.Legend>Дополнительные настройки</Fieldset.Legend>
              <Fieldset.Content>
                <HStack gap="6" flexWrap="wrap">
                  <HStack gap="2">
                    <Switch
                      checked={formData.http2_support}
                      onCheckedChange={(e) => updateField('http2_support', e.checked)}
                    />
                    <Text fontSize="sm">HTTP/2 Support</Text>
                  </HStack>

                  <HStack gap="2">
                    <Switch
                      checked={formData.allow_websocket_upgrade}
                      onCheckedChange={(e) => updateField('allow_websocket_upgrade', e.checked)}
                    />
                    <Text fontSize="sm">WebSocket</Text>
                  </HStack>

                  <HStack gap="2">
                    <Switch
                      checked={formData.block_exploits}
                      onCheckedChange={(e) => updateField('block_exploits', e.checked)}
                    />
                    <Text fontSize="sm">Block Exploits</Text>
                  </HStack>

                  <HStack gap="2">
                    <Switch
                      checked={formData.caching_enabled}
                      onCheckedChange={(e) => updateField('caching_enabled', e.checked)}
                    />
                    <Text fontSize="sm">Caching</Text>
                  </HStack>
                </HStack>
              </Fieldset.Content>
            </Fieldset.Root>
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Отмена
          </Button>
          <Button
            colorPalette="blue"
            onClick={handleSubmit}
            disabled={isPending || !formData.domain_names || !formData.forward_host}
            loading={isPending}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}
