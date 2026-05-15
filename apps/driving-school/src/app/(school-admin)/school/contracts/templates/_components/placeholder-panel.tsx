'use client'

import { Accordion, Badge, Box, HStack, IconButton, Input, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuBuilding, LuCopy, LuFileText, LuSearch, LuUser } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { getGroupedPlaceholders, type PlaceholderInfo } from '@letar/contract-generator'

const GROUP_ICONS = {
  student: LuUser,
  school: LuBuilding,
  contract: LuFileText,
}

const GROUP_LABELS = {
  student: 'Данные ученика',
  school: 'Данные школы',
  contract: 'Данные договора',
}

interface PlaceholderPanelProps {
  onInsert?: (placeholder: string) => void
}

export function PlaceholderPanel({ onInsert }: PlaceholderPanelProps) {
  const [search, setSearch] = useState('')

  const groupedPlaceholders = useMemo(() => getGroupedPlaceholders(), [])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) {
      return groupedPlaceholders
    }

    const searchLower = search.toLowerCase()
    const filtered: typeof groupedPlaceholders = {
      student: [],
      school: [],
      contract: [],
    }

    for (const [group, placeholders] of Object.entries(groupedPlaceholders) as [string, PlaceholderInfo[]][]) {
      const matches = placeholders.filter(
        (p: PlaceholderInfo) =>
          p.key.toLowerCase().includes(searchLower) ||
          p.label.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      )
      filtered[group as keyof typeof filtered] = matches
    }

    return filtered
  }, [groupedPlaceholders, search])

  const handleCopy = (key: string) => {
    const placeholder = `{{${key}}}`
    navigator.clipboard.writeText(placeholder)
    toaster.success({ title: 'Скопировано', description: placeholder })

    if (onInsert) {
      onInsert(placeholder)
    }
  }

  const totalFiltered = Object.values(filteredGroups).flat().length

  return (
    <VStack align="stretch" gap={4}>
      <Box position="relative">
        <Input placeholder="Поиск плейсхолдера..." value={search} onChange={(e) => setSearch(e.target.value)} pl={10} />
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted">
          <LuSearch size={16} />
        </Box>
      </Box>

      {search && totalFiltered === 0 && (
        <Text color="fg.muted" textAlign="center" py={4}>
          Ничего не найдено
        </Text>
      )}

      <Accordion.Root multiple defaultValue={['student', 'school', 'contract']} variant="enclosed">
        {(Object.entries(filteredGroups) as [keyof typeof GROUP_LABELS, PlaceholderInfo[]][]).map(
          ([group, placeholders]) => {
            if (placeholders.length === 0) {
              return null
            }

            const Icon = GROUP_ICONS[group]

            return (
              <Accordion.Item key={group} value={group}>
                <Accordion.ItemTrigger>
                  <HStack flex={1}>
                    <Icon size={16} />
                    <Text fontWeight="medium">{GROUP_LABELS[group]}</Text>
                    <Badge size="sm" variant="subtle">
                      {placeholders.length}
                    </Badge>
                  </HStack>
                  <Accordion.ItemIndicator />
                </Accordion.ItemTrigger>
                <Accordion.ItemContent>
                  <VStack align="stretch" gap={1} py={2}>
                    {placeholders.map((p: PlaceholderInfo) => (
                      <HStack
                        key={p.key}
                        p={2}
                        borderRadius="md"
                        _hover={{ bg: 'bg.subtle' }}
                        cursor="pointer"
                        onClick={() => handleCopy(p.key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleCopy(p.key)
                          }
                        }}
                      >
                        <VStack align="start" gap={0} flex={1} minW={0}>
                          <HStack gap={2}>
                            <Text fontFamily="mono" fontSize="sm" color="blue.fg">
                              {`{{${p.key}}}`}
                            </Text>
                            {p.required && (
                              <Badge colorPalette="red" size="xs">
                                *
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                            {p.label}
                          </Text>
                        </VStack>
                        <IconButton
                          variant="ghost"
                          size="xs"
                          aria-label="Копировать"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(p.key)
                          }}
                        >
                          <LuCopy size={14} />
                        </IconButton>
                      </HStack>
                    ))}
                  </VStack>
                </Accordion.ItemContent>
              </Accordion.Item>
            )
          }
        )}
      </Accordion.Root>
    </VStack>
  )
}
