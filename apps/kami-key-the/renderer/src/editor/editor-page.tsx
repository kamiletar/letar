/**
 * Страница редактора маппингов
 *
 * Оркестратор: config state, undo/redo (max 50), dirty detection,
 * горячие клавиши Ctrl+S/Z/Y/Escape.
 *
 * Toast-уведомления, валидация импорта, flash-анимация клавиш.
 */

import { Box, Flex, Heading } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeymapConfig, KeyMapping } from '../../../src/types'
import { toaster } from '../lib/toaster'
import { EditorPanel } from './editor-panel'
import type { KeyDef } from './keyboard-data'
import { KeyboardView } from './keyboard-view'
import { LayoutTabs } from './layout-tabs'
import { Toolbar } from './toolbar'

const MAX_UNDO = 50

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

export function EditorPage() {
  const [config, setConfig] = useState<KeymapConfig | null>(null)
  const [symbols, setSymbols] = useState<SymbolEntry[]>([])
  const [selectedKey, setSelectedKey] = useState<KeyDef | null>(null)
  const [activeLayoutIndex, setActiveLayoutIndex] = useState(0)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const [flashVk, setFlashVk] = useState<number | null>(null)
  const originalJson = useRef('')
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Загрузка данных
  useEffect(() => {
    Promise.all([window.electronAPI.config.get(), window.electronAPI.symbols.getAll()]).then(([cfg, syms]) => {
      setConfig(cfg)
      setSymbols(syms)
      originalJson.current = JSON.stringify(cfg)
      const idx = Math.max(
        0,
        cfg.layouts.findIndex((l) => l.name === cfg.activeLayout)
      )
      setActiveLayoutIndex(idx)
    })
  }, [])

  // Подписка на изменения конфига из main process
  useEffect(() => {
    return window.electronAPI.on.configChanged((newConfig) => {
      setConfig(newConfig)
      originalJson.current = JSON.stringify(newConfig)
      setUndoStack([])
      setRedoStack([])
    })
  }, [])

  const isDirty = config ? JSON.stringify(config) !== originalJson.current : false

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
      originalJson.current = JSON.stringify(config)
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
    originalJson.current = JSON.stringify(cfg)
    setUndoStack([])
    setRedoStack([])
    setSelectedKey(null)
    const idx = Math.max(
      0,
      cfg.layouts.findIndex((l) => l.name === cfg.activeLayout)
    )
    setActiveLayoutIndex(idx)
    toaster.create({ title: 'Сброшено к сохранённой версии', type: 'info', duration: 2000 })
  }, [])

  // Горячие клавиши
  useEffect(() => {
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
        setSelectedKey(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doUndo, doRedo, doSave])

  // Flash-анимация на клавише
  const triggerFlash = useCallback((vk: number) => {
    clearTimeout(flashTimer.current)
    setFlashVk(vk)
    flashTimer.current = setTimeout(() => setFlashVk(null), 500)
  }, [])

  // Экспорт/Импорт
  const doExport = useCallback(() => {
    if (!config) {
      return
    }
    const layout = config.layouts[activeLayoutIndex]
    const data = JSON.stringify({ name: layout.name, mappings: layout.mappings }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = layout.name.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_') + '.json'
    a.click()
    URL.revokeObjectURL(a.href)
    toaster.success({ title: `Раскладка "${layout.name}" экспортирована`, duration: 2000 })
  }, [config, activeLayoutIndex])

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
          setSelectedKey(null)
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
    [config, pushUndo]
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
    },
    [config, selectedKey, activeLayoutIndex, pushUndo, triggerFlash]
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
    },
    [config, activeLayoutIndex, pushUndo, triggerFlash]
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
    [config, selectedKey, activeLayoutIndex, pushUndo]
  )

  if (!config) {
    return (
      <Flex h="100vh" align="center" justify="center" bg="#1a1a2e" color="#e0e0e0">
        Загрузка...
      </Flex>
    )
  }

  const activeLayout = config.layouts[activeLayoutIndex]
  const mappingByVk = new Map<number, KeyMapping>()
  for (const m of activeLayout.mappings) {
    mappingByVk.set(m.vk, m)
  }

  return (
    <Box bg="#1a1a2e" minH="100vh" p="4" color="#e0e0e0" fontFamily="'Segoe UI', system-ui, sans-serif">
      <Heading as="h1" size="lg" mb="3">
        <Box as="span" color="#6c7ae0">
          KamiKeyThe
        </Box>
        {
          ' \u2014 \u0420\u0435\u0434\u0430\u043A\u0442\u043E\u0440 \u043C\u0430\u043F\u043F\u0438\u043D\u0433\u043E\u0432'
        }
      </Heading>

      <LayoutTabs
        config={config}
        activeIndex={activeLayoutIndex}
        onSelect={(i) => {
          setActiveLayoutIndex(i)
          setSelectedKey(null)
        }}
        onAdd={(name) => {
          pushUndo()
          const newConfig = {
            ...config,
            layouts: [...config.layouts, { name, mappings: [] }],
          }
          setConfig(newConfig)
          setActiveLayoutIndex(newConfig.layouts.length - 1)
          setSelectedKey(null)
          toaster.success({ title: `Раскладка "${name}" создана`, duration: 2000 })
        }}
        onDelete={(i) => {
          pushUndo()
          const deletedName = config.layouts[i].name
          const layouts = config.layouts.filter((_, idx) => idx !== i)
          const newIdx = Math.min(activeLayoutIndex, layouts.length - 1)
          setConfig({ ...config, layouts, activeLayout: layouts[newIdx].name })
          setActiveLayoutIndex(newIdx)
          setSelectedKey(null)
          toaster.create({ title: `Раскладка "${deletedName}" удалена`, type: 'info', duration: 2000 })
        }}
        onRename={(i, name) => {
          pushUndo()
          const layouts = config.layouts.map((l, idx) => (idx === i ? { ...l, name } : l))
          const newConfig = {
            ...config,
            layouts,
            activeLayout: i === activeLayoutIndex ? name : config.activeLayout,
          }
          setConfig(newConfig)
        }}
      />

      <KeyboardView
        mappingByVk={mappingByVk}
        selectedVk={selectedKey?.vk ?? null}
        flashVk={flashVk}
        onKeyClick={setSelectedKey}
        onDropOnKey={dropOnKey}
      />

      {selectedKey && (
        <EditorPanel
          selectedKey={selectedKey}
          mapping={mappingByVk.get(selectedKey.vk) ?? null}
          symbols={symbols}
          isDirty={isDirty}
          onAssign={assignSymbol}
          onRemove={removeMapping}
          onSave={doSave}
        />
      )}

      <Toolbar
        isDirty={isDirty}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        undoCount={undoStack.length}
        redoCount={redoStack.length}
        onSave={doSave}
        onReset={doReset}
        onUndo={doUndo}
        onRedo={doRedo}
        onExport={doExport}
        onImport={doImport}
      />
    </Box>
  )
}
