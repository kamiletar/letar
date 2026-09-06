/**
 * Поиск символов по названию/синонимам с debounce 300мс
 *
 * Возможности:
 * - Виртуализация списка результатов (рендерятся только видимые строки + запас)
 * - Клавиатурная навигация (стрелки вверх/вниз, Enter)
 * - Недавно использованные символы
 * - Фильтрация по категориям Unicode-блоков
 * - Drag-and-drop символов на клавиши клавиатуры
 *
 * Производительность на ~1700 символах: `toLowerCase()`/`parseInt(hex)` для каждого символа
 * посчитаны один раз в `searchIndex` (при загрузке `symbols`, а не на каждое нажатие) — сам поиск
 * остаётся линейным сканом, но без повторной строковой обработки при каждом фильтре. Полноценный
 * инвертированный индекс по ключевым словам не заведён сознательно: на 1700 записях линейный скан
 * по предвычисленным строкам укладывается в доли миллисекунды, а поддержка индекса (токенизация,
 * инвалидация при обновлении базы символов) добавила бы сложность без измеримой выгоды.
 */

import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import { matchesCategory, SYMBOL_CATEGORIES } from './symbol-categories'

const RECENT_KEY = 'kami-key-the-recent-symbols'
const MAX_RECENT = 8
/** Оценка высоты строки для виртуализатора — уточняется через measureElement (описание может занять 2 строки) */
const ROW_HEIGHT_ESTIMATE = 44

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
  const [results, setResults] = useState<SymbolEntry[]>([])
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const categoryId = category ?? 'all'
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Недавно использованные
  const [recentCodes] = useState(loadRecent)
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
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query.trim()), 300)
    return () => clearTimeout(timerRef.current)
  }, [query, search])

  // Сброс подсветки при смене категории (сама категория теперь управляется извне)
  useEffect(() => {
    setHighlightIndex(-1)
  }, [categoryId])

  const handleAssign = (entry: SymbolEntry, slot: 'char' | 'shiftChar') => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    pushRecent(entry.c)
    onAssign(ch, entry.n, slot)
  }

  // Drag-and-drop: начало перетаскивания символа
  const handleDragStart = (e: React.DragEvent, entry: SymbolEntry) => {
    const cp = parseInt(entry.c, 16)
    const ch = String.fromCodePoint(cp)
    e.dataTransfer.setData('application/json', JSON.stringify({ char: ch, name: entry.n }))
    e.dataTransfer.effectAllowed = 'copy'
    // Визуальный drag-preview: символ крупно
    const preview = document.createElement('div')
    preview.textContent = ch
    preview.style.cssText =
      'font-size:32px;padding:4px 8px;background:#1e2a4a;color:#6c7ae0;border-radius:6px;position:absolute;top:-1000px'
    document.body.appendChild(preview)
    e.dataTransfer.setDragImage(preview, 24, 24)
    requestAnimationFrame(() => document.body.removeChild(preview))
  }

  const fullList = results.length > 0 ? results : query.trim().length < 2 && categoryId === 'all' ? recentSymbols : []
  const showingRecent = results.length === 0 && query.trim().length < 2 && categoryId === 'all'
    && recentSymbols.length > 0

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
    <Box>
      {/* Фильтр по категориям */}
      <Flex gap="1" mb="2" flexWrap="wrap">
        {visibleCategories.map((cat) => (
          <Box
            key={cat.id}
            px="2"
            py="0.5"
            borderRadius="4px"
            fontSize="xs"
            cursor="pointer"
            userSelect="none"
            bg={categoryId === cat.id ? '#3a3a6a' : 'transparent'}
            color={categoryId === cat.id ? '#8a9af0' : '#666'}
            border={categoryId === cat.id ? '1px solid #5a5a8a' : '1px solid transparent'}
            _hover={{ color: '#aaa', bg: '#2a2a4a' }}
            onClick={() => onCategoryChange(cat.id)}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <Text as="span" color="#555" ml="1">
                {categoryCounts.get(cat.id)}
              </Text>
            )}
          </Box>
        ))}
      </Flex>

      <Input
        placeholder="Поиск символа по названию..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        bg="#1a1a2e"
        border="1px solid #3a3a5a"
        color="white"
        mb="2"
        _focus={{ borderColor: '#6c7ae0' }}
        _placeholder={{ color: '#666' }}
      />

      {showingRecent && (
        <Text color="#666" fontSize="xs" mb="1" px="1">
          Недавние:
        </Text>
      )}

      {fullList.length > 0 && (
        <Box ref={resultsRef} maxH="300px" overflowY="auto" border="1px solid #3a3a5a" borderRadius="6px">
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
                  borderBottom="1px solid #2a2a4a"
                  bg={isHighlighted ? '#3a3a6a' : 'transparent'}
                  _hover={{ bg: '#2a2a4a' }}
                  cursor="grab"
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  onMouseEnter={() =>
                    setHighlightIndex(virtualRow.index)}
                  onClick={() =>
                    handleAssign(s, 'char')}
                >
                  <Text fontSize="2xl" w="36px" textAlign="center" pointerEvents="none">
                    {ch}
                  </Text>
                  <Text color="#6c7ae0" fontSize="xs" fontFamily="monospace" w="60px" pointerEvents="none">
                    U+{s.c}
                  </Text>
                  <Text flex="1" fontSize="sm" pointerEvents="none">
                    {s.n}
                    {s.s && (
                      <Text as="span" color="#888">
                        {' — '}
                        {s.s}
                      </Text>
                    )}
                  </Text>
                  <Flex gap="1">
                    <Button
                      size="xs"
                      bg="#1e3a4a"
                      color="#4ac"
                      border="1px solid #2a5a6a"
                      _hover={{ bg: '#2a5a6a' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssign(s, 'char')
                      }}
                      title={`Назначить на AltGr+${keyLabel}`}
                    >
                      AltGr+{keyLabel}
                    </Button>
                    <Button
                      size="xs"
                      bg="#1e2a4a"
                      color="#6c7ae0"
                      border="1px solid #3a4a7a"
                      _hover={{ bg: '#2a3a6a' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAssign(s, 'shiftChar')
                      }}
                      title={`Назначить на AltGr+Shift+${keyLabel}`}
                    >
                      +Shift+{keyLabel}
                    </Button>
                  </Flex>
                </Flex>
              )
            })}
          </Box>
        </Box>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <Text color="#666" p="2" fontSize="sm">
          Ничего не найдено
        </Text>
      )}

      {fullList.length > 0 && (
        <Text color="#555" fontSize="xs" mt="1" px="1">
          {'↑↓'} навигация, Enter — AltGr, Shift+Enter — +Shift, перетащи на клавишу
        </Text>
      )}
    </Box>
  )
}
