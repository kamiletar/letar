/**
 * Поиск символов по названию/синонимам с debounce 300мс
 *
 * Возможности:
 * - Виртуализация списка результатов (рендерятся только видимые строки + запас)
 * - Клавиатурная навигация (стрелки вверх/вниз, Enter)
 * - Недавно использованные символы
 * - Фильтрация по категориям Unicode-блоков
 * - Drag-and-drop символов на клавиши клавиатуры (доступен только на клавиатуре — здесь клавиши
 *   не видны, компонент используется со страницы одной клавиши; код DnD оставлен рабочим на
 *   будущее, см. PLAN.md)
 *
 * Производительность на ~1700 символах: `toLowerCase()`/`parseInt(hex)` для каждого символа
 * посчитаны один раз в `searchIndex` (при загрузке `symbols`, а не на каждое нажатие) — сам поиск
 * остаётся линейным сканом, но без повторной строковой обработки при каждом фильтре. Полноценный
 * инвертированный индекс по ключевым словам не заведён сознательно: на 1700 записях линейный скан
 * по предвычисленным строкам укладывается в доли миллисекунды, а поддержка индекса (токенизация,
 * инвалидация при обновлении базы символов) добавила бы сложность без измеримой выгоды.
 */

import { Box, chakra, Flex, Input, InputGroup, Kbd, Text } from '@chakra-ui/react'
import { useDebounce } from '@letar/hooks'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LuSearch } from 'react-icons/lu'
import type { SymbolEntry } from '../../../shared/ipc-types'
import { matchesCategory, SYMBOL_CATEGORIES } from './symbol-categories'

const RECENT_KEY = 'kami-key-the-recent-symbols'
const MAX_RECENT = 8
/** Оценка высоты строки для виртуализатора — уточняется через measureElement (описание может занять 2 строки) */
const ROW_HEIGHT_ESTIMATE = 44

const EMPTY_STATE_SUGGESTIONS = ['тире', 'кавычки', 'стрелка', 'градус', 'валюта']

/** Загрузить недавние символы из localStorage */
function loadRecent(): string[] {
  try {
    const data = localStorage.getItem(RECENT_KEY)
    return data ? (JSON.parse(data) as string[]) : []
  } catch {
    return []
  }
}

/** Сохранить символ в недавние */
function pushRecent(codeHex: string) {
  const recent = loadRecent().filter((c) => c !== codeHex)
  recent.unshift(codeHex)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface SymbolSearchProps {
  symbols: SymbolEntry[]
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  keyLabel: string
  /** Активная категория (id из SYMBOL_CATEGORIES), null — «Все». Управляется извне — часть route. */
  category: string | null
  onCategoryChange: (id: string) => void
}

export function SymbolSearch({ symbols, onAssign, keyLabel, category, onCategoryChange }: SymbolSearchProps) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = useState<SymbolEntry[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const categoryId = category ?? 'all'
  const resultsRef = useRef<HTMLDivElement>(null)

  // Недавно использованные — читаются из localStorage, обновляются после каждого назначения
  // (см. handleAssign), иначе список «Недавние» не отражает символ, назначенный в этой же сессии
  // на другую клавишу, пока компонент не перемонтируется
  const [recentCodes, setRecentCodes] = useState(loadRecent)
  const recentSymbols = recentCodes.map((c) => symbols.find((s) => s.c === c)).filter((s): s is SymbolEntry => !!s)

  // Категория для фильтрации
  const activeCategory = SYMBOL_CATEGORIES.find((c) => c.id === categoryId) ?? SYMBOL_CATEGORIES[0]

  // Предвычисленные lowercase-строки и codepoint — считаются один раз при загрузке базы символов,
  // а не на каждое нажатие/смену категории (см. заметку о производительности в шапке файла)
  const searchIndex = useMemo(
    () =>
      symbols.map((s) => ({
        entry: s,
        nameLower: s.n.toLowerCase(),
        synLower: s.s ? s.s.toLowerCase() : '',
        codepoint: parseInt(s.c, 16),
      })),
    [symbols],
  )

  // Количество символов в каждой категории (мемоизировано)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const cat of SYMBOL_CATEGORIES) {
      if (cat.id === 'all') {
        counts.set(cat.id, searchIndex.length)
      } else {
        counts.set(cat.id, searchIndex.filter((s) => matchesCategory(s.codepoint, cat)).length)
      }
    }
    return counts
  }, [searchIndex])

  // Видимые категории — только те, в которых есть символы
  const visibleCategories = SYMBOL_CATEGORIES.filter((c) => (categoryCounts.get(c.id) ?? 0) > 0)

  const search = useCallback(
    (q: string) => {
      if (!q || q.length < 2) {
        // Если выбрана категория — показать все символы этой категории
        if (categoryId !== 'all') {
          const catResults = searchIndex.filter((s) => matchesCategory(s.codepoint, activeCategory)).map((s) => s.entry)
          setResults(catResults)
        } else {
          setResults([])
        }
        setHighlightIndex(-1)
        return
      }
      const lower = q.toLowerCase()
      let matches = searchIndex.filter((s) => s.nameLower.includes(lower) || s.synLower.includes(lower))
      // Фильтр по категории
      if (categoryId !== 'all') {
        matches = matches.filter((s) => matchesCategory(s.codepoint, activeCategory))
      }
      setResults(matches.map((s) => s.entry))
      setHighlightIndex(-1)
    },
    [searchIndex, categoryId, activeCategory],
  )

  useEffect(() => {
    search(debouncedQuery.trim())
  }, [debouncedQuery, search])

  // Сброс подсветки при смене категории (сама категория теперь управляется извне)
  useEffect(() => {
    setHighlightIndex(-1)
  }, [categoryId])

  const handleAssign = (entry: SymbolEntry, slot: 'char' | 'shiftChar') => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    pushRecent(entry.c)
    setRecentCodes(loadRecent())
    onAssign(ch, entry.n, slot)
  }

  // Drag-and-drop: начало перетаскивания символа
  const handleDragStart = (e: React.DragEvent, entry: SymbolEntry) => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    e.dataTransfer.setData('application/json', JSON.stringify({ char: ch, name: entry.n }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const fullList = results.length > 0 ? results : query.trim().length < 2 && categoryId === 'all' ? recentSymbols : []
  const showingRecent = results.length === 0 && query.trim().length < 2 && categoryId === 'all'
    && recentSymbols.length > 0
  const isEmptyState = query.trim().length === 0 && categoryId === 'all' && recentSymbols.length === 0

  // oxlint-disable-next-line react/incompatible-library -- @tanstack/react-virtual возвращает немемоизируемые функции (getVirtualItems/measureElement) намеренно; строки ниже не обёрнуты в memo, устаревший UI не грозит
  const virtualizer = useVirtualizer({
    count: fullList.length,
    getScrollElement: () => resultsRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
    getItemKey: (index) => fullList[index]?.c ?? index,
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (fullList.length === 0) {
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev < fullList.length - 1 ? prev + 1 : 0
        virtualizer.scrollToIndex(next, { align: 'auto' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev > 0 ? prev - 1 : fullList.length - 1
        virtualizer.scrollToIndex(next, { align: 'auto' })
        return next
      })
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      const entry = fullList[highlightIndex]
      // Shift+Enter → назначить в shiftChar, Enter → в char
      handleAssign(entry, e.shiftKey ? 'shiftChar' : 'char')
    }
  }

  return (
    <Flex direction="column" flex="1" minH="0" w="full">
      {/* Фильтр по категориям */}
      <Flex gap="1" mb="2" flexWrap="wrap" flexShrink={0}>
        {visibleCategories.map((cat) => (
          <chakra.button
            key={cat.id}
            type="button"
            aria-pressed={categoryId === cat.id}
            px="2.5"
            py="1"
            rounded="l1"
            fontSize="xs"
            bg={categoryId === cat.id ? 'brand.subtle' : 'transparent'}
            color={categoryId === cat.id ? 'brand.fg' : 'fg.subtle'}
            borderWidth="1px"
            borderColor={categoryId === cat.id ? 'brand.border' : 'transparent'}
            _hover={{ bg: 'bg.muted', color: 'fg' }}
            onClick={() => onCategoryChange(cat.id)}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <chakra.span color="fg.subtle" ml="1">
                {categoryCounts.get(cat.id)}
              </chakra.span>
            )}
          </chakra.button>
        ))}
      </Flex>

      <InputGroup startElement={<LuSearch size={15} />} flexShrink={0} mb="2">
        <Input
          autoFocus
          placeholder="Поиск символа по названию..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </InputGroup>

      {showingRecent && (
        <Text color="fg.subtle" fontSize="xs" mb="1" px="1" flexShrink={0}>
          Недавние:
        </Text>
      )}

      {isEmptyState && (
        <Flex direction="column" gap="2" flex="1" align="center" justify="center" px="4">
          <Text color="fg.subtle" fontSize="sm" textAlign="center">
            Начните вводить название или выберите категорию
          </Text>
          <Flex gap="1.5" flexWrap="wrap" justify="center">
            {EMPTY_STATE_SUGGESTIONS.map((s) => (
              <chakra.button
                key={s}
                type="button"
                px="2.5"
                py="1"
                rounded="l1"
                fontSize="xs"
                bg="bg.muted"
                color="fg.muted"
                _hover={{ bg: 'bg.emphasized', color: 'fg' }}
                onClick={() => setQuery(s)}
              >
                {s}
              </chakra.button>
            ))}
          </Flex>
        </Flex>
      )}

      {fullList.length > 0 && (
        <Box ref={resultsRef} flex="1" minH="0" overflowY="auto" borderWidth="1px" borderColor="border" rounded="l2">
          <Box position="relative" width="100%" height={`${virtualizer.getTotalSize()}px`}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const s = fullList[virtualRow.index]
              const cp = parseInt(s.c, 16)
              const ch = String.fromCodePoint(cp)
              const isHighlighted = virtualRow.index === highlightIndex
              return (
                <Flex
                  key={s.c}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  position="absolute"
                  top={0}
                  left={0}
                  width="100%"
                  transform={`translateY(${virtualRow.start}px)`}
                  align="center"
                  gap="2"
                  px="3"
                  py="1.5"
                  borderBottomWidth="1px"
                  borderColor="border.subtle"
                  bg={isHighlighted ? 'bg.muted' : 'transparent'}
                  _hover={{ bg: 'bg.muted' }}
                  cursor="grab"
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  onMouseEnter={() =>
                    setHighlightIndex(virtualRow.index)}
                  onClick={() =>
                    handleAssign(s, 'char')}
                >
                  <Flex align="center" justify="center" w="36px" h="36px" rounded="l1" bg="bg.muted" flexShrink={0}>
                    <chakra.span fontSize="xl" pointerEvents="none">
                      {ch}
                    </chakra.span>
                  </Flex>
                  <Box flex="1" minW="0" pointerEvents="none">
                    <Text fontSize="sm" color="fg" truncate>
                      {s.n}
                      {s.s && (
                        <chakra.span color="fg.subtle">
                          {' — '}
                          {s.s}
                        </chakra.span>
                      )}
                    </Text>
                    <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                      U+{s.c}
                    </Text>
                  </Box>
                  <Flex gap="1" flexShrink={0}>
                    <chakra.button
                      type="button"
                      px="2"
                      py="1"
                      rounded="l1"
                      fontSize="xs"
                      bg="brand.subtle"
                      color="brand.fg"
                      _hover={{ bg: 'brand.emphasized' }}
                      title={`Назначить на AltGr+${keyLabel}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssign(s, 'char')
                      }}
                    >
                      AltGr
                    </chakra.button>
                    <chakra.button
                      type="button"
                      px="2"
                      py="1"
                      rounded="l1"
                      fontSize="xs"
                      bg="accent.subtle"
                      color="accent.fg"
                      _hover={{ bg: 'accent.emphasized' }}
                      title={`Назначить на AltGr+Shift+${keyLabel}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssign(s, 'shiftChar')
                      }}
                    >
                      +Shift
                    </chakra.button>
                  </Flex>
                </Flex>
              )
            })}
          </Box>
        </Box>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <Text color="fg.subtle" p="2" fontSize="sm">
          Ничего не найдено
        </Text>
      )}

      {fullList.length > 0 && (
        <Flex gap="1.5" align="center" mt="1.5" px="1" fontSize="xs" color="fg.subtle" flexShrink={0}>
          <Kbd size="sm">↑↓</Kbd>
          выбор
          <Kbd size="sm">Enter</Kbd>
          AltGr
          <Kbd size="sm">Shift+Enter</Kbd>
          AltGr+Shift
        </Flex>
      )}
    </Flex>
  )
}
