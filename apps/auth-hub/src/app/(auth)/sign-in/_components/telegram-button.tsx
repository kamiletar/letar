'use client'

import { Box, Button, CloseButton, Dialog, Spinner, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaTelegram } from 'react-icons/fa'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'

type Status = 'idle' | 'waiting' | 'success' | 'error' | 'expired'

const POLL_INTERVAL_MS = 2000
const TOKEN_TTL_MS = 10 * 60 * 1000 // 10 минут

/** Форматирует секунды в mm:ss */
function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Кнопка «Войти через Telegram».
 *
 * Флоу: нажали → сервер создаёт one-time токен → открываем диалог со ссылкой
 * `t.me/<bot>?start=<token>` → поллим /api/auth/telegram/status каждые 2 сек →
 * при статусе success редиректим (cookie уже выставлена сервером).
 */
export function TelegramSignInButton() {
  const router = useRouter()
  const callbackUrl = usePostSignInCallback()

  const [status, setStatus] = useState<Status>('idle')
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null)
  const [_token, setToken] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState(TOKEN_TTL_MS)
  const [dialogOpen, setDialogOpen] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenRef = useRef<string | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
    }
    pollRef.current = null
    countdownRef.current = null
  }, [])

  // Запускаем поллинг статуса
  const startPolling = useCallback(
    (tok: string) => {
      tokenRef.current = tok

      // Обратный отсчёт таймера
      const startedAt = Date.now()
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt
        setRemainingMs(Math.max(0, TOKEN_TTL_MS - elapsed))
      }, 1000)

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/auth/telegram/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenRef.current }),
          })
          const data = await res.json()

          if (data.status === 'success') {
            stopPolling()
            setStatus('success')
            setDialogOpen(false)
            // Небольшая пауза чтобы cookie 100% записалась перед навигацией
            setTimeout(() => {
              router.push(callbackUrl || '/auth/post-login')
              router.refresh()
            }, 300)
          } else if (data.status === 'expired' || data.status === 'invalid') {
            stopPolling()
            setStatus('expired')
          } else if (data.status === 'error') {
            stopPolling()
            setStatus('error')
            setErrorMsg(data.message ?? 'Ошибка')
          }
          // status === 'pending' → продолжаем поллить
        } catch {
          // Сетевая ошибка — продолжаем поллить, не сбрасываем статус
        }
      }, POLL_INTERVAL_MS)
    },
    [callbackUrl, router, stopPolling],
  )

  const handleStart = useCallback(async () => {
    setStatus('waiting')
    setErrorMsg(null)
    setRemainingMs(TOKEN_TTL_MS)

    try {
      const res = await fetch('/api/auth/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (!res.ok || !data.token || !data.url) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Не удалось создать ссылку')
        return
      }

      setToken(data.token)
      setTelegramUrl(data.url)
      setDialogOpen(true)
      startPolling(data.token)
    } catch {
      setStatus('error')
      setErrorMsg('Ошибка сети')
    }
  }, [startPolling])

  const handleClose = useCallback(() => {
    stopPolling()
    setDialogOpen(false)
    setStatus('idle')
    setToken(null)
    setTelegramUrl(null)
    setErrorMsg(null)
    setRemainingMs(TOKEN_TTL_MS)
  }, [stopPolling])

  // Чистим таймеры при размонтировании
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return (
    <>
      <Button
        onClick={handleStart}
        loading={status === 'waiting' && !dialogOpen}
        disabled={status === 'success'}
        colorPalette="blue"
        variant="outline"
        w="full"
        gap={2}
      >
        <FaTelegram />
        Войти через Telegram
      </Button>

      <Dialog.Root
        open={dialogOpen}
        onOpenChange={(e) => {
          if (!e.open) {
            handleClose()
          }
        }}
        placement="center"
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="sm">
            <Dialog.Header>
              <Dialog.Title>Вход через Telegram</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <Stack gap={4} align="center" py={2}>
                {status === 'waiting' && (
                  <>
                    <Text textAlign="center" color="fg.muted" fontSize="sm">
                      Нажмите кнопку ниже, чтобы открыть бота и нажать&nbsp;
                      <Text as="span" fontWeight="semibold">
                        START
                      </Text>
                      . Страница обновится автоматически.
                    </Text>

                    <Button asChild colorPalette="blue" size="lg" w="full">
                      <a href={telegramUrl ?? '#'} target="_blank" rel="noopener noreferrer">
                        <FaTelegram />
                        Открыть Telegram
                      </a>
                    </Button>

                    <Box
                      as="code"
                      fontSize="xs"
                      color="fg.subtle"
                      bg="bg.muted"
                      px={2}
                      py={1}
                      borderRadius="md"
                      wordBreak="break-all"
                      textAlign="center"
                    >
                      {telegramUrl}
                    </Box>

                    <Stack direction="row" align="center" gap={2} color="fg.muted" fontSize="sm">
                      <Spinner size="sm" />
                      <Text>Ожидаем подтверждения… {formatCountdown(remainingMs)}</Text>
                    </Stack>
                  </>
                )}

                {status === 'expired' && (
                  <>
                    <Text color="fg.error" textAlign="center" fontSize="sm">
                      Ссылка истекла. Запросите новую.
                    </Text>
                    <Button onClick={handleClose} variant="outline" w="full">
                      Попробовать снова
                    </Button>
                  </>
                )}

                {status === 'error' && (
                  <>
                    <Text color="fg.error" textAlign="center" fontSize="sm">
                      {errorMsg ?? 'Произошла ошибка'}
                    </Text>
                    <Button onClick={handleClose} variant="outline" w="full">
                      Закрыть
                    </Button>
                  </>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  )
}
