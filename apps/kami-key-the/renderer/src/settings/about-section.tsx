/**
 * Секция «О программе» — версия, раскладка, статистика
 */

import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { LayoutInfo, StatEntry } from '../../../shared/ipc-types'
import { displayChar } from '../editor/keyboard-data'

export function AboutSection() {
  const [version, setVersion] = useState('')
  const [layoutInfo, setLayoutInfo] = useState<LayoutInfo | null>(null)
  const [topStats, setTopStats] = useState<StatEntry[]>([])

  useEffect(() => {
    window.electronAPI.system.getVersion().then(setVersion)
    window.electronAPI.system.getLayoutInfo().then(setLayoutInfo)
    window.electronAPI.stats.getTop(10).then(setTopStats)
  }, [])

  return (
    <Box bg="#222244" borderRadius="8px" p="4" border="1px solid #3a3a5a">
      <Heading as="h3" size="sm" mb="3" color="white">
        О программе
      </Heading>

      <Flex direction="column" gap="1" fontSize="sm">
        <Text>
          <Text as="span" color="#6c7ae0">
            Версия:
          </Text>{' '}
          {version}
        </Text>
        {layoutInfo && (
          <Text>
            <Text as="span" color="#6c7ae0">
              Раскладка:
            </Text>{' '}
            {layoutInfo.name} ({layoutInfo.count} доступно)
          </Text>
        )}
      </Flex>

      {topStats.length > 0 && (
        <Box mt="3">
          <Text fontSize="sm" color="#6c7ae0" mb="1">
            Топ символов:
          </Text>
          <Flex gap="2" flexWrap="wrap">
            {topStats.map((s) => (
              <Box
                key={s.char}
                px="2"
                py="0.5"
                borderRadius="4px"
                bg="#2a2a4a"
                border="1px solid #3a3a5a"
                fontSize="xs"
              >
                <Text as="span" fontSize="md" color="#6c7ae0" mr="1">
                  {displayChar(s.char)}
                </Text>
                <Text as="span" color="#888">
                  {s.count}
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      )}
    </Box>
  )
}
