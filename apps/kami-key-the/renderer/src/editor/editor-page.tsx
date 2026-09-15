/**
 * Страница редактора маппингов
 *
 * Оркестратор: config state, undo/redo (max 50), dirty detection,
 * горячие клавиши Ctrl+S/Z/Y/Escape (только пока страница активна — см. `isActive`).
 *
 * Toast-уведомления, валидация импорта, flash-анимация клавиш.
 */

import { Box, Flex } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeymapConfig, KeyMapping } from '../../../src/types'
import { toaster } from '../lib/toaster'
import { ActionBar } from './action-bar'
import { parseRoute, stepBack, syncRouteToLocation } from './editor-route'
import { KeyPage } from './key-page'
import { findKeyByVk } from './keyboard-data'
import { KeyboardView } from './keyboard-view'
import { LayoutTabs } from './layout-tabs'
import { describeSymbolConflict, findSymbolConflict } from './symbol-conflict'

const MAX_UNDO = 50

interface EditorPageProps {
  isActive: boolean
}

/** Валидация структуры импортируемой раскладки */
function validateImportData(data: unknown): data is { name: string; mappings: KeyMapping[] } {
  if (!data || typeof data !== 'object') {
    return false
  }
  const d = data as Record<string, unknown>
  if (typeof d.name !== 'string' || !d.name.trim()) {
    return false
  }
  if (!Array.isArray(d.mappings)) {
    return false
  }
  for (const m of d.mappings) {
    if (!m || typeof m !== 'object') {
      return false
    }
    if (typeof (m as Record<string, unknown>).vk !== 'number') {
      return false
    }
    if (typeof (m as Record<string, unknown>).char !== 'string') {
      return false
    }
    if (typeof (m as Record<string, unknown>).label !== 'string') {
      return false
    }
  }
  return true
}

export function EditorPage({ isActive }: EditorPageProps) {
  const [config, setConfig] = useState<KeymapConfig | null>(null)
  const [symbols, setSymbols] = useState<SymbolEntry[]>([])
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  const selectedKey = route.keyVk != null ? findKeyByVk(route.keyVk) ?? null : null
  const [activeLayoutIndex, setActiveLayoutIndex] = useState(0)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [flashVk, setFlashVk] = useState<number | null>(null)
  const [originalJson, setOriginalJson] = useState('')
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Загрузка данных
  useEffect(() => {
    Promise.all([window.electronAPI.config.get(), window.electronAPI.symbols.getAll()]).then(([cfg, syms]) => {
      setConfig(cfg)
      setSymbols(syms)
      setOriginalJson(JSON.stringify(cfg))
      const idx = Math.max(
        0,
        cfg.layouts.findIndex((l) => l.name === cfg.activeLayout),
      )
      setActiveLayoutIndex(idx)
    })
  }, [])

  // Подписка на изменения конфига из main process
  useEffect(() => {
    return window.electronAPI.on.configChanged((newConfig) => {
      setConfig(newConfig)
      setOriginalJson(JSON.stringify(newConfig))
      setUndoStack([])
      setRedoStack([])
    })
  }, [])

  // Зеркалим route в адресную строку — только пока страница активна, иначе перезапишет #settings
  useEffect(() => {
    if (isActive) {
      syncRouteToLocation(route)
    }
  }, [route, isActive])

  const goBack = useCallback(() => {
    setRoute(stepBack)
  }, [])

  const onCategoryChange = useCallback((id: string) => {
    setRoute((prev) => ({ ...prev, category: id === 'all' ? null : id }))
  }, [])

  const isDirty = config ? JSON.stringify(config) !== originalJson : false

  const pushUndo = useCallback(() => {
    if (!config) {
      return
    }
    setUndoStack((prev) => {
      const next = [...prev, JSON.stringify(config)]
      return next.length > MAX_UNDO ? next.slice(1) : next
    })
    setRedoStack([])
  }, [config])

  const doUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) {
        return prev
      }
      const last = prev[prev.length - 1]
      setRedoStack((r) => [...r, JSON.stringify(config)])
      const restored = JSON.parse(last) as KeymapConfig
      setConfig(restored)
      setActiveLayoutIndex((i) => Math.min(i, restored.layouts.length - 1))
      return prev.slice(0, -1)
    })
  }, [config])

  const doRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) {
        return prev
      }
      const last = prev[prev.length - 1]
      setUndoStack((u) => [...u, JSON.stringify(config)])
      const restored = JSON.parse(last) as KeymapConfig
      setConfig(restored)
      setActiveLayoutIndex((i) => Math.min(i, restored.layouts.length - 1))
      return prev.slice(0, -1)
    })
  }, [config])

  const doSave = useCallback(async () => {
    if (!config) {
      return
    }
    try {
      await window.electronAPI.config.save(config)
      setOriginalJson(JSON.stringify(config))
      setUndoStack([])
      setRedoStack([])
      toaster.success({ title: 'Сохранено', duration: 2000 })
    } catch {
      toaster.error({ title: 'Ошибка сохранения', duration: 3000 })
    }
  }, [config])

  const doReset = useCallback(async () => {
    const cfg = await window.electronAPI.config.get()
    setConfig(cfg)
    setOriginalJson(JSON.stringify(cfg))
    setUndoStack([])
    setRedoStack([])
    setRoute({ keyVk: null, category: null })
    const idx = Math.max(
      0,
      cfg.layouts.findIndex((l) => l.name === cfg.activeLayout),
    )
    setActiveLayoutIndex(idx)
    toaster.create({ title: 'Сброшено к сохранённой версии', type: 'info', duration: 2000 })
  }, [])

  // Горячие клавиши — только пока страница активна
  useEffect(() => {
    if (!isActive) {
      return
    }
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        doUndo()
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault()
        doRedo()
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        doSave()
      } else if (e.key === 'Escape') {
        goBack()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, doUndo, doRedo, doSave, goBack])

  // Flash-анимация на клавише
  const triggerFlash = useCallback((vk: number) => {
    clearTimeout(flashTimer.current)
    setFlashVk(vk)
    flashTimer.current = setTimeout(() => setFlashVk(null), 500)
  }, [])

  // Экспорт/Импорт
  const doExport = useCallback(
    (layoutIndex: number) => {
      if (!config) {
        return
      }
      const layout = config.layouts[layoutIndex]
      const data = JSON.stringify({ name: layout.name, mappings: layout.mappings }, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = layout.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') + '.json'
      a.click()
      URL.revokeObjectURL(a.href)
      toaster.success({ title: `Раскладка "${layout.name}" экспортирована`, duration: 2000 })
    },
    [config],
  )

  const doImport = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string)
          if (!validateImportData(raw)) {
            toaster.error({
              title: 'Невалидный файл',
              description: 'JSON должен содержать поля name (строка) и mappings (массив с vk, char, label)',
              duration: 5000,
            })
            return
          }
          if (!config) {
            return
          }
          pushUndo()
          let name = raw.name
          const existing = config.layouts.map((l) => l.name)
          let n = 1
          while (existing.includes(name)) {
            name = `${raw.name} (${++n})`
          }
          const newConfig = {
            ...config,
            layouts: [...config.layouts, { name, mappings: raw.mappings }],
          }
          setConfig(newConfig)
          setActiveLayoutIndex(newConfig.layouts.length - 1)
          setRoute({ keyVk: null, category: null })
          toaster.success({
            title: `Раскладка "${name}" импортирована`,
            description: `${raw.mappings.length} маппингов`,
            duration: 3000,
          })
        } catch {
          toaster.error({ title: 'Ошибка чтения файла', description: 'Файл не является валидным JSON', duration: 4000 })
        }
      }
      reader.readAsText(file)
    },
    [config, pushUndo],
  )

  // Назначение символа
  const assignSymbol = useCallback(
    (char: string, name: string, slot: 'char' | 'shiftChar') => {
      if (!config || !selectedKey) {
        return
      }
      pushUndo()
      const layout = config.layouts[activeLayoutIndex]
      const mappings = [...layout.mappings]
      const idx = mappings.findIndex((m) => m.vk === selectedKey.vk)

      const conflict = findSymbolConflict(layout.mappings, char, selectedKey.vk, slot)

      if (slot === 'char') {
        if (idx === -1) {
          mappings.push({ vk: selectedKey.vk, char, label: name })
        } else {
          mappings[idx] = { ...mappings[idx], char, label: name }
        }
      } else {
        if (idx === -1) {
          // AltGr ещё нет — создаём оба слота сразу
          mappings.push({ vk: selectedKey.vk, char, label: name, shiftChar: char, shiftLabel: name })
        } else {
          mappings[idx] = { ...mappings[idx], shiftChar: char, shiftLabel: name }
        }
      }

      const layouts = config.layouts.map((l, i) => (i === activeLayoutIndex ? { ...l, mappings } : l))
      setConfig({ ...config, layouts })
      triggerFlash(selectedKey.vk)
      if (conflict) {
        toaster.create({ title: describeSymbolConflict(conflict), type: 'warning', duration: 4000 })
      }
    },
    [config, selectedKey, activeLayoutIndex, pushUndo, triggerFlash],
  )

  // Drag-and-drop: назначение символа на произвольную клавишу
  const dropOnKey = useCallback(
    (vk: number, char: string, name: string, slot: 'char' | 'shiftChar') => {
      if (!config) {
        return
      }
      pushUndo()
      const layout = config.layouts[activeLayoutIndex]
      const mappings = [...layout.mappings]
      const idx = mappings.findIndex((m) => m.vk === vk)

      const conflict = findSymbolConflict(layout.mappings, char, vk, slot)

      if (slot === 'char') {
        if (idx === -1) {
          mappings.push({ vk, char, label: name })
        } else {
          mappings[idx] = { ...mappings[idx], char, label: name }
        }
      } else {
        if (idx === -1) {
          // Для shiftChar нужен основной маппинг — создаём оба
          mappings.push({ vk, char, label: name, shiftChar: char, shiftLabel: name })
        } else {
          mappings[idx] = { ...mappings[idx], shiftChar: char, shiftLabel: name }
        }
      }

      const layouts = config.layouts.map((l, i) => (i === activeLayoutIndex ? { ...l, mappings } : l))
      setConfig({ ...config, layouts })
      triggerFlash(vk)
      if (conflict) {
        toaster.create({ title: describeSymbolConflict(conflict), type: 'warning', duration: 4000 })
      }
    },
    [config, activeLayoutIndex, pushUndo, triggerFlash],
  )

  const removeMapping = useCallback(
    (slot: 'char' | 'shiftChar') => {
      if (!config || !selectedKey) {
        return
      }
      pushUndo()
      const layout = config.layouts[activeLayoutIndex]
      let mappings = [...layout.mappings]
      const idx = mappings.findIndex((m) => m.vk === selectedKey.vk)
      if (idx === -1) {
        return
      }

      if (slot === 'char') {
        mappings = mappings.filter((_, i) => i !== idx)
      } else {
        const m = { ...mappings[idx] }
        delete m.shiftChar
        delete m.shiftLabel
        mappings[idx] = m
      }

      const layouts = config.layouts.map((l, i) => (i === activeLayoutIndex ? { ...l, mappings } : l))
      setConfig({ ...config, layouts })
    },
    [config, selectedKey, activeLayoutIndex, pushUndo],
  )

  return (
    <Flex direction="column" h="full" display={isActive ? 'flex' : 'none'}>
      {!config
        ? (
          <Flex flex="1" align="center" justify="center" color="fg.subtle">
            Загрузка...
          </Flex>
        )
        : (
          <>
            <Box px="5" pt="4" pb="3" flexShrink={0}>
              <LayoutTabs
                config={config}
                activeIndex={activeLayoutIndex}
                onSelect={(i) => {
                  setActiveLayoutIndex(i)
                  setRoute({ keyVk: null, category: null })
                }}
                onAdd={(name) => {
                  pushUndo()
                  const newConfig = {
                    ...config,
                    layouts: [...config.layouts, { name, mappings: [] }],
                  }
                  setConfig(newConfig)
                  setActiveLayoutIndex(newConfig.layouts.length - 1)
                  setRoute({ keyVk: null, category: null })
                  toaster.success({ title: `Раскладка "${name}" создана`, duration: 2000 })
                }}
                onDelete={(i) => {
                  pushUndo()
                  const deletedName = config.layouts[i].name
                  const layouts = config.layouts.filter((_, idx) => idx !== i)
                  const wasActiveLayoutDeleted = config.layouts[i].name === config.activeLayout
                  const newActiveLayout = wasActiveLayoutDeleted ? layouts[0].name : config.activeLayout
                  setConfig({ ...config, layouts, activeLayout: newActiveLayout })
                  setActiveLayoutIndex((prev) => (i <= prev ? Math.max(0, prev - 1) : prev))
                  setRoute({ keyVk: null, category: null })
                  toaster.create({ title: `Раскладка "${deletedName}" удалена`, type: 'info', duration: 2000 })
                }}
                onRename={(i, name) => {
                  pushUndo()
                  const layouts = config.layouts.map((l, idx) => (idx === i ? { ...l, name } : l))
                  const newConfig = {
                    ...config,
                    layouts,
                    activeLayout: config.layouts[i].name === config.activeLayout ? name : config.activeLayout,
                  }
                  setConfig(newConfig)
                }}
                onMakeActive={(i) => {
                  pushUndo()
                  setConfig({ ...config, activeLayout: config.layouts[i].name })
                  toaster.success({ title: `Раскладка "${config.layouts[i].name}" теперь активна`, duration: 2000 })
                }}
                onExport={doExport}
                onImport={doImport}
              />
            </Box>

            <Box flex="1" minH="0" overflowY="auto" px="5" pb="4">
              {selectedKey
                ? (
                  <KeyPage
                    keyDef={selectedKey}
                    mapping={config.layouts[activeLayoutIndex].mappings.find((m) => m.vk === selectedKey.vk) ?? null}
                    symbols={symbols}
                    isDirty={isDirty}
                    category={route.category}
                    onCategoryChange={onCategoryChange}
                    onAssign={assignSymbol}
                    onRemove={removeMapping}
                    onSave={doSave}
                    onBack={goBack}
                  />
                )
                : (
                  <KeyboardView
                    mappingByVk={new Map<number, KeyMapping>(
                      config.layouts[activeLayoutIndex].mappings.map((m) => [m.vk, m]),
                    )}
                    selectedVk={null}
                    flashVk={flashVk}
                    onKeyClick={(key) => setRoute({ keyVk: key.vk, category: null })}
                    onDropOnKey={dropOnKey}
                  />
                )}
            </Box>

            <ActionBar
              isDirty={isDirty}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              onSave={doSave}
              onReset={doReset}
              onUndo={doUndo}
              onRedo={doRedo}
            />
          </>
        )}
    </Flex>
  )
}
