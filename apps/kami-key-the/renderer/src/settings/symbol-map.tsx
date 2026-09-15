/**
 * Шпаргалка раскладки — таблица «клавиша → AltGr → AltGr+Shift» в порядке клавиатуры
 */

import { chakra, Table, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { KeymapConfig, KeyMapping } from '../../../src/types'
import { ARROW_KEYS, displayChar, KEYBOARD_ROWS } from '../editor/keyboard-data'
import type { KeyDef } from '../editor/keyboard-data'
import { SettingsCard } from './settings-card'

const ORDERED_KEYS: KeyDef[] = [
  ...KEYBOARD_ROWS.flat(),
  ARROW_KEYS.up,
  ARROW_KEYS.left,
  ARROW_KEYS.down,
  ARROW_KEYS.right,
]

/** Убрать повтор символа в начале подписи («— длинное тире» → «длинное тире») */
function stripLeadingChar(char: string, label: string): string {
  return label.startsWith(char) ? label.slice(char.length).trim() : label
}

export function SymbolMap() {
  const [config, setConfig] = useState<KeymapConfig | null>(null)

  useEffect(() => {
    window.electronAPI.config.get().then(setConfig)
    return window.electronAPI.on.configChanged(setConfig)
  }, [])

  if (!config) {
    return null
  }

  const layout = config.layouts.find((l) => l.name === config.activeLayout) ?? config.layouts[0]
  if (!layout) {
    return null
  }

  const mappingByVk = new Map<number, KeyMapping>(layout.mappings.map((m) => [m.vk, m]))
  const rows = ORDERED_KEYS.filter((k) => mappingByVk.has(k.vk))

  return (
    <SettingsCard title="Шпаргалка раскладки" description={`Раскладка «${layout.name}»`}>
      {rows.length === 0
        ? (
          <Text fontSize="sm" color="fg.subtle" fontStyle="italic">
            В этой раскладке нет назначений
          </Text>
        )
        : (
          <Table.ScrollArea borderWidth="1px" borderColor="border" rounded="l2">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Клавиша</Table.ColumnHeader>
                  <Table.ColumnHeader>AltGr</Table.ColumnHeader>
                  <Table.ColumnHeader>AltGr+Shift</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {rows.map((key) => {
                  const m = mappingByVk.get(key.vk)
                  if (!m) {
                    return null
                  }
                  return (
                    <Table.Row key={key.vk}>
                      <Table.Cell>
                        <Text fontSize="sm" color="fg">
                          {key.label || 'Пробел'}
                          {key.ru && (
                            <chakra.span color="fg.subtle" ml="1">
                              / {key.ru}
                            </chakra.span>
                          )}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="brand.fg">
                          {displayChar(m.char)}
                          <chakra.span color="fg.subtle" ml="1.5" fontSize="xs">
                            {stripLeadingChar(m.char, m.label)}
                          </chakra.span>
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {m.shiftChar
                          ? (
                            <Text fontSize="sm" color="accent.fg">
                              {displayChar(m.shiftChar)}
                              <chakra.span color="fg.subtle" ml="1.5" fontSize="xs">
                                {stripLeadingChar(m.shiftChar, m.shiftLabel ?? '')}
                              </chakra.span>
                            </Text>
                          )
                          : (
                            <Text fontSize="sm" color="fg.subtle">
                              —
                            </Text>
                          )}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        )}
    </SettingsCard>
  )
}
