'use client'

import { Button, HStack, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { LuRotateCcw } from 'react-icons/lu'

import { DISCLAIMER_CONSENT_KEY } from '../_data/disclaimer'
import { EXPRESS_RESULT_KEY, PENDING_QUIZ_KEY } from '../_lib/storage-keys'

/**
 * Kiosk-режим (этап 5.7): кнопка «Новый посетитель» на демо-планшете стенда.
 * Активируется query-параметром `?kiosk=1` на /express.
 *
 * Сброс: гостевой результат, отложенные ответы и согласие (152-ФЗ: согласие
 * персонально — следующий посетитель даёт своё) + полная перезагрузка страницы,
 * чтобы React-стейт гарантированно обнулился, а выборка вопросов обновилась
 * (онлайн — свежая, офлайн — из SW-кэша).
 *
 * Двухтапное подтверждение: случайное нажатие посетителем посреди теста
 * не должно убить его ответы; окно подтверждения закрывается через 4 секунды.
 */
export function KioskResetButton() {
  const t = useTranslations('express')
  const [isKiosk, setIsKiosk] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // kiosk=1 читаем после маунта — параметр не влияет на SSR-рендер
  useEffect(() => {
    try {
      setIsKiosk(new URLSearchParams(window.location.search).get('kiosk') === '1')
    } catch {
      /* window недоступен — не киоск */
    }
    return () => {
      if (confirmTimer.current) {
        clearTimeout(confirmTimer.current)
      }
    }
  }, [])

  if (!isKiosk) {
    return null
  }

  const handleClick = () => {
    if (!confirming) {
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000)
      return
    }
    // Подтверждено: чистим следы посетителя и перезагружаем страницу
    try {
      localStorage.removeItem(EXPRESS_RESULT_KEY)
      localStorage.removeItem(DISCLAIMER_CONSENT_KEY)
      sessionStorage.removeItem(PENDING_QUIZ_KEY)
    } catch {
      /* хранилище недоступно — перезагрузка всё равно сбросит состояние */
    }
    window.location.replace(window.location.pathname + '?kiosk=1')
  }

  return (
    <HStack position="fixed" top={2} right={2} zIndex="overlay">
      {confirming && (
        <Text fontSize="xs" color="fg.muted">
          {t('kiosk.confirmHint')}
        </Text>
      )}
      <Button
        size="xs"
        variant={confirming ? 'solid' : 'outline'}
        colorPalette={confirming ? 'red' : 'gray'}
        onClick={handleClick}
      >
        <LuRotateCcw />
        {confirming ? t('kiosk.confirm') : t('kiosk.reset')}
      </Button>
    </HStack>
  )
}
