/**
 * Переключатель автозагрузки
 */

import { Box, Flex, Switch, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function AutostartToggle() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    window.electronAPI.system.isAutostartEnabled().then(setEnabled)
  }, [])

  const toggle = async () => {
    const newState = !enabled
    await window.electronAPI.system.setAutostart(newState)
    setEnabled(newState)
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
