'use client'

/**
 * Режим чтеца: список стихов поэта, крупное чтение с листанием и правка без сети.
 *
 * Стихи берутся из локальной копии (localStorage) и обновляются с сервера, когда есть сеть.
 * Правки (новые стихи, изменения, удаления) сначала попадают в очередь на телефоне и уходят
 * на сайт сами через несколько секунд, как только сеть есть, — этих секунд хватает, чтобы
 * передумать («Вернуть»). Открытое стихотворение и размер шрифта запоминаются: страница
 * перезагружается сама, когда возвращается интернет (`reloadOnOnline` у Serwist), и
 * выступление не должно сбиваться.
 */

import {
  applySyncResults,
  clampFontSize,
  discardPending,
  keepMine,
  listPendingDeletes,
  loadPending,
  loadPrefs,
  loadSnapshot,
  mergePoems,
  type PendingChange,
  type PoemDraft,
  type ReaderSnapshot,
  recordDelete,
  recordSave,
  savePending,
  savePrefs,
  type SyncResult,
  syncSnapshot,
} from '@/lib/offline/poems-store'
import { Container } from '@chakra-ui/react'
import { useIsHydrated, useOfflineConsent } from '@letar/hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useFullscreen } from '../_hooks/use-fullscreen'
import { useWakeLock } from '../_hooks/use-wake-lock'
import { PoemEditor } from './poem-editor'
import { PoemListView, type SyncState } from './poem-list-view'
import { PoemReadingView } from './poem-reading-view'

/** Тот же ключ, что в root layout: одно согласие на офлайн для всего приложения */
const OFFLINE_CONSENT_KEY = 'grandslamcup-offline-consent'

/** Через сколько после правки она уходит на сайт; пока можно передумать, мс */
const AUTO_SYNC_DELAY_MS = 4000

/** Редактор: id = null — новое стихотворение; key не меняется, даже когда id становится серверным */
interface EditorState {
  id: string | null
  key: number
}

/** Проверяет, лежит ли сама страница чтеца в кэше service worker'а */
async function isShellCached(): Promise<boolean> {
  if (typeof caches === 'undefined') {
    return false
  }
  // precache Serwist хранит записи с суффиксом ?__WB_REVISION__=…, поэтому ignoreSearch
  const hit = await caches.match('/reader', { ignoreSearch: true })
  return hit !== undefined
}

export function PoemReader() {
  // localStorage есть только в браузере: читаем его после гидрации, а не в эффекте
  const hydrated = useIsHydrated()
  return hydrated ? <PoemReaderContent /> : null
}

function PoemReaderContent() {
  const [snapshot, setSnapshot] = useState<ReaderSnapshot | null>(loadSnapshot)
  const [pending, setPending] = useState<PendingChange[]>(loadPending)
  const [prefs] = useState(loadPrefs)
  const [syncState, setSyncState] = useState<SyncState>('syncing')
  const [openId, setOpenId] = useState<string | null>(prefs.poemId)
  const [fontSize, setFontSize] = useState(prefs.fontSize)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [shellCached, setShellCached] = useState(false)
  const { isAccepted, accept } = useOfflineConsent(OFFLINE_CONSENT_KEY)
  const { supported: fullscreenSupported, isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  // Актуальная очередь для асинхронных обработчиков: замыкание с прошлого рендера её не видит
  const pendingRef = useRef(pending)
  const syncingRef = useRef(false)
  const editorKey = useRef(0)

  const serverPoems = useMemo(() => snapshot?.poems ?? [], [snapshot])
  const poems = useMemo(() => mergePoems(serverPoems, pending), [serverPoems, pending])
  const pendingDeletes = useMemo(() => listPendingDeletes(serverPoems, pending), [serverPoems, pending])
  const sendable = pending.filter((change) => !change.conflict)
  const conflictCount = pending.length - sendable.length

  // Если открытого стихотворения больше нет (удалили на сайте) — openIndex = -1, виден список
  const openIndex = poems.findIndex((poem) => poem.id === openId)
  const openPoem = openIndex >= 0 ? poems[openIndex]! : null

  useWakeLock(openPoem !== null && editor === null)

  /** Новая очередь: в память, в ref и на диск сразу — вкладку могут закрыть в любой момент */
  const commitPending = useCallback((next: PendingChange[]) => {
    pendingRef.current = next
    setPending(next)
    savePending(next)
  }, [])

  const handleSyncResult = useCallback((result: SyncResult) => {
    syncingRef.current = false
    setSyncState(result.status === 'ok' ? 'ok' : result.status)
    if (result.status !== 'ok') {
      return
    }

    setSnapshot(result.snapshot)
    const applied = applySyncResults(pendingRef.current, result.sent, result.results)
    commitPending(applied.pending)

    // Новое стихотворение получило серверный id — переносим на него открытый экран
    const { idMap } = applied
    if (Object.keys(idMap).length > 0) {
      setOpenId((current) => (current && idMap[current]) || current)
      setEditor((current) => (current?.id && idMap[current.id] ? { ...current, id: idMap[current.id]! } : current))
    }
  }, [commitPending])

  const startSync = useCallback(() => {
    if (syncingRef.current) {
      return
    }
    syncingRef.current = true
    void syncSnapshot(pendingRef.current).then(handleSyncResult)
  }, [handleSyncResult])

  const refresh = useCallback(() => {
    setSyncState('syncing')
    startSync()
  }, [startSync])

  // Свежие данные с сервера: при открытии и каждый раз, когда возвращается сеть
  useEffect(() => {
    startSync()

    // Просим браузер не вычищать копию стихов при нехватке места
    void navigator.storage?.persist?.()

    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [refresh, startSync])

  // Правка уходит на сайт сама через несколько секунд (без сети попытка просто вернёт «офлайн»)
  useEffect(() => {
    if (sendable.length === 0) {
      return
    }
    const timer = setTimeout(refresh, AUTO_SYNC_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pending, sendable.length, refresh])

  // Запоминаем, что открыто и каким шрифтом
  useEffect(() => {
    savePrefs({ poemId: openId, fontSize })
  }, [openId, fontSize])

  // После согласия service worker ставится и кладёт страницу в кэш не сразу — проверяем несколько раз
  useEffect(() => {
    if (!isAccepted || !('serviceWorker' in navigator)) {
      return
    }

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const check = async () => {
      const cached = await isShellCached()
      if (cancelled) {
        return
      }
      setShellCached(cached)
      attempts += 1
      if (!cached && attempts < 20) {
        timer = setTimeout(check, 1500)
      }
    }
    timer = setTimeout(check, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isAccepted])

  const goTo = useCallback((index: number) => {
    const target = poems[index]
    if (target) {
      setOpenId(target.id)
    }
  }, [poems])

  const changeFont = useCallback((delta: number) => {
    setFontSize((current) => clampFontSize(current + delta))
  }, [])

  const openEditor = useCallback((id: string | null) => {
    editorKey.current += 1
    setEditor({ id, key: editorKey.current })
  }, [])

  // Листание стрелками клавиатуры и Escape — удобно на планшете и компьютере
  useEffect(() => {
    if (openPoem === null || editor !== null) {
      return
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goTo(openIndex + 1)
      } else if (event.key === 'ArrowLeft') {
        goTo(openIndex - 1)
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        setOpenId(null)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [editor, goTo, openIndex, openPoem])

  const handleSave = (draft: PoemDraft) => {
    if (!editor) {
      return
    }
    const saved = recordSave(pendingRef.current, serverPoems, editor.id, draft)
    commitPending(saved.pending)
    setEditor(null)
    if (editor.id === null) {
      setOpenId(saved.id)
    }
  }

  const handleDelete = () => {
    if (!editor?.id) {
      return
    }
    commitPending(recordDelete(pendingRef.current, serverPoems, editor.id))
    setEditor(null)
    setOpenId(null)
  }

  // ───────────────────────── Редактор ─────────────────────────
  if (editor) {
    const editing = editor.id === null ? null : poems.find((poem) => poem.id === editor.id) ?? null
    return (
      <Container maxW="720px" py={6}>
        <PoemEditor
          key={editor.key}
          initial={editing && { title: editing.title, text: editing.text, published: editing.published }}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
          onDelete={editing ? handleDelete : undefined}
        />
      </Container>
    )
  }

  // ───────────────────────── Чтение ─────────────────────────
  if (openPoem) {
    return (
      <PoemReadingView
        poem={openPoem}
        index={openIndex}
        total={poems.length}
        fontSize={fontSize}
        fullscreenSupported={fullscreenSupported}
        isFullscreen={isFullscreen}
        onClose={() => setOpenId(null)}
        onGoTo={goTo}
        onFontChange={changeFont}
        onToggleFullscreen={toggleFullscreen}
        onEdit={() => openEditor(openPoem.id)}
        onKeepMine={() => {
          commitPending(keepMine(pendingRef.current, openPoem.id))
          refresh()
        }}
        onTakeServer={() => commitPending(discardPending(pendingRef.current, openPoem.id))}
      />
    )
  }

  // ───────────────────────── Список ─────────────────────────
  return (
    <PoemListView
      snapshot={snapshot}
      poems={poems}
      pendingDeletes={pendingDeletes}
      pendingCount={sendable.length}
      conflictCount={conflictCount}
      syncState={syncState}
      offlineConsentGiven={isAccepted}
      shellCached={shellCached}
      fullscreenSupported={fullscreenSupported}
      isFullscreen={isFullscreen}
      onOpen={setOpenId}
      onCreate={() => openEditor(null)}
      onRestore={(id) => commitPending(discardPending(pendingRef.current, id))}
      onRefresh={refresh}
      onAcceptOffline={accept}
      onToggleFullscreen={toggleFullscreen}
    />
  )
}
