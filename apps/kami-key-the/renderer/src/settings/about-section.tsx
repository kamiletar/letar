/**
 * Секция «О программе» — версия, раскладка, статистика, проверка обновлений
 */

import { chakra, Flex, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import type { LayoutInfo, StatEntry } from '../../../shared/ipc-types'
import { displayChar } from '../editor/keyboard-data'
import { toaster } from '../lib/toaster'
import { SettingsCard } from './settings-card'

export function AboutSection() {
  const [version, setVersion] = useState('')
  const [layoutInfo, setLayoutInfo] = useState<LayoutInfo | null>(null)
  const [topStats, setTopStats] = useState<StatEntry[]>([])
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    window.electronAPI.system.getVersion().then(setVersion)
    window.electronAPI.system.getLayoutInfo().then(setLayoutInfo)
    window.electronAPI.stats.getTop(10).then(setTopStats)
  }, [])

  const checkForUpdates = async () => {
    setChecking(true)
    try {
      await window.electronAPI.system.checkForUpdates()
    } catch {
      toaster.error({ title: 'Не удалось проверить обновления', duration: 3000 })
    } finally {
      setChecking(false)
    }
  }

  return (
    <SettingsCard title="О программе">
      <Stack gap="3">
        <Stack gap="1" fontSize="sm">
          <Text color="fg">
            <chakra.span color="fg.subtle">Версия:</chakra.span>
            {version}
          </Text>
          {layoutInfo && (
            <Text color="fg">
              <chakra.span color="fg.subtle">Раскладка:</chakra.span>
              {layoutInfo.name} ({layoutInfo.count} доступно)
            </Text>
          )}
        </Stack>

        {topStats.length > 0 && (
          <Stack gap="1.5">
            <Text fontSize="xs" color="fg.subtle">
              Топ символов:
            </Text>
            <Flex gap="2" flexWrap="wrap">
              {topStats.map((s) => (
                <Flex key={s.char} align="center" gap="1" px="2" py="1" rounded="l1" bg="bg.muted" fontSize="xs">
                  <chakra.span fontSize="md" color="brand.fg">
                    {displayChar(s.char)}
                  </chakra.span>
                  <chakra.span color="fg.subtle">{s.count}</chakra.span>
                </Flex>
              ))}
            </Flex>
          </Stack>
        )}

        <chakra.button
          type="button"
          alignSelf="flex-start"
          display="flex"
          alignItems="center"
          gap="2"
          px="3"
          py="1.5"
          rounded="l2"
          fontSize="sm"
          borderWidth="1px"
          borderColor="border"
          color="fg.muted"
          _hover={{ color: 'brand.fg', borderColor: 'brand.border' }}
          _disabled={{ opacity: 0.6, cursor: 'default' }}
          disabled={checking}
          onClick={checkForUpdates}
        >
          <LuRefreshCw size={14} />
          {checking ? 'Проверка...' : 'Проверить обновления'}
        </chakra.button>
      </Stack>
    </SettingsCard>
  )
}
