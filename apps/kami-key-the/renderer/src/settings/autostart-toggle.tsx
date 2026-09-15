/**
 * Переключатель автозагрузки — вместе со справочником горячих клавиш, секция «Общие»
 */

import { Flex, Kbd, Stack, Switch, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { toaster } from '../lib/toaster'
import { SettingsCard } from './settings-card'

export function AutostartToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    window.electronAPI.system.isAutostartEnabled().then(setEnabled)
  }, [])

  const toggle = async () => {
    const newState = !enabled
    try {
      const actual = await window.electronAPI.system.setAutostart(newState)
      setEnabled(actual)
      if (actual !== newState) {
        toaster.create({
          title: 'Не удалось изменить автозагрузку',
          description: 'Windows отклонила изменение — проверь права или Диспетчер задач → Автозагрузка',
          type: 'error',
        })
      }
    } catch {
      toaster.create({
        title: 'Ошибка автозагрузки',
        description: 'Не удалось обратиться к системным настройкам',
        type: 'error',
      })
    }
  }

  return (
    <SettingsCard title="Общие">
      <Stack gap="3">
        <Flex align="center" justify="space-between">
          <Text fontSize="sm" color="fg">
            Запускать вместе с Windows
          </Text>
          <Switch.Root checked={enabled} onCheckedChange={() => toggle()}>
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Root>
        </Flex>

        <Stack gap="1.5" fontSize="xs" color="fg.subtle" pt="2" borderTopWidth="1px" borderColor="border.subtle">
          <Flex align="center" gap="2">
            <Kbd size="sm">AltGr+Ё</Kbd>
            следующая раскладка
          </Flex>
          <Flex align="center" gap="2">
            <Kbd size="sm">AltGr+Shift+Ё</Kbd>
            открыть это окно
          </Flex>
          <Flex align="center" gap="2">
            <Kbd size="sm">AltGr+Shift+Backspace</Kbd>
            «Камикадзе» — очистка строки
          </Flex>
        </Stack>
      </Stack>
    </SettingsCard>
  )
}
