/**
 * Переключатель автозагрузки
 */

import { Box, Flex, Switch, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { toaster } from '../lib/toaster'

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
    <Box bg="#222244" borderRadius="8px" p="4" border="1px solid #3a3a5a">
      <Flex align="center" gap="3">
        <Switch.Root checked={enabled} onCheckedChange={() => toggle()}>
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
        <Text>Автозагрузка при старте Windows</Text>
      </Flex>
    </Box>
  )
}
