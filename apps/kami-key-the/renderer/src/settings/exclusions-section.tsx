/**
 * Секция исключений — управление списком процессов,
 * для которых хоткеи KamiKeyThe отключены.
 */

import { chakra, Flex, IconButton, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuCrosshair, LuX } from 'react-icons/lu'
import { SettingsCard } from './settings-card'

export function ExclusionsSection() {
  const [processes, setProcesses] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Загрузка списка при маунте
  useEffect(() => {
    window.electronAPI.exclusions.getList().then(setProcesses)
  }, [])

  // Сохранение списка
  const saveList = useCallback(async (updated: string[]) => {
    setProcesses(updated)
    await window.electronAPI.exclusions.saveList(updated)
  }, [])

  // Добавить процесс вручную
  const addManual = useCallback(() => {
    let name = inputValue.trim().toLowerCase()
    if (!name) {
      return
    }
    // Автоматически добавить .exe если не указано
    if (!name.includes('.')) {
      name += '.exe'
    }
    if (processes.includes(name)) {
      setInputValue('')
      return
    }
    saveList([...processes, name])
    setInputValue('')
  }, [inputValue, processes, saveList])

  // Удалить процесс из списка
  const remove = useCallback(
    (index: number) => {
      const updated = processes.filter((_, i) => i !== index)
      saveList(updated)
    },
    [processes, saveList],
  )

  // Определить текущее foreground-приложение с countdown
  const detectForeground = useCallback(() => {
    setCountdown(3)
    let remaining = 3

    countdownRef.current = setInterval(() => {
      remaining--
      if (remaining > 0) {
        setCountdown(remaining)
        return
      }

      // Таймер истёк — определяем процесс
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setCountdown(0)

      window.electronAPI.exclusions.getForegroundProcess().then((name) => {
        if (!name) {
          return
        }
        if (processes.includes(name)) {
          return
        }
        saveList([...processes, name])
      })
    }, 1000)
  }, [processes, saveList])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  return (
    <SettingsCard
      title="Исключения"
      description="Процессы, для которых хоткеи отключены. AltGr-комбинации не будут перехватываться в этих приложениях."
    >
      <Stack gap="2" mb="3">
        {processes.length === 0 && (
          <Text fontSize="sm" color="fg.subtle" fontStyle="italic">
            Нет исключений — хоткеи работают везде
          </Text>
        )}
        {processes.map((name, i) => (
          <Flex key={name} align="center" gap="2" bg="bg.muted" p="2" rounded="l2">
            <Text flex="1" fontSize="sm" fontFamily="mono" color="fg">
              {name}
            </Text>
            <IconButton
              aria-label={`Удалить ${name}`}
              size="xs"
              variant="ghost"
              color="fg.muted"
              _hover={{ color: 'fg.error', bg: 'bg.error' }}
              onClick={() => remove(i)}
            >
              <LuX size={14} />
            </IconButton>
          </Flex>
        ))}
      </Stack>

      <Flex gap="2" mb="2">
        <Input
          size="sm"
          placeholder="имя_процесса.exe"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addManual()}
          fontFamily="mono"
          flex="1"
        />
        <chakra.button
          type="button"
          px="3"
          rounded="l2"
          fontSize="sm"
          borderWidth="1px"
          borderColor="brand.border"
          color="brand.fg"
          _hover={{ bg: 'brand.subtle' }}
          _disabled={{ opacity: 0.4, cursor: 'default' }}
          disabled={!inputValue.trim()}
          onClick={addManual}
        >
          Добавить
        </chakra.button>
      </Flex>

      <chakra.button
        type="button"
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="2"
        w="full"
        py="2"
        rounded="l2"
        fontSize="sm"
        borderWidth="1px"
        borderColor="border"
        color="fg.muted"
        _hover={{ color: 'brand.fg', borderColor: 'brand.border' }}
        _disabled={{ opacity: 0.6, cursor: 'default' }}
        disabled={countdown > 0}
        onClick={detectForeground}
      >
        <LuCrosshair size={14} />
        {countdown > 0 ? `Переключитесь на нужное приложение... ${countdown}` : 'Добавить текущее приложение'}
      </chakra.button>
    </SettingsCard>
  )
}
