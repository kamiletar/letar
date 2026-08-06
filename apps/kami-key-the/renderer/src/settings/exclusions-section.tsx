/**
 * Секция исключений — управление списком процессов,
 * для которых хоткеи KamiKeyThe отключены.
 */

import { Box, Button, Flex, Heading, IconButton, Input, Stack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

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
    <Box bg="#222244" borderRadius="8px" p="4" border="1px solid #3a3a5a">
      <Heading as="h3" size="md" mb="3" color="#e0e0e0">
        Исключения
      </Heading>
      <Text fontSize="sm" color="#888" mb="3">
        Процессы, для которых хоткеи отключены. AltGr-комбинации не будут перехватываться в этих приложениях.
      </Text>

      {/* Список исключённых процессов */}
      <Stack gap="2" mb="3">
        {processes.length === 0 && (
          <Text fontSize="sm" color="#666" fontStyle="italic">
            Нет исключений — хоткеи работают везде
          </Text>
        )}
        {processes.map((name, i) => (
          <Flex key={name} align="center" gap="2" bg="#1a1a2e" p="2" borderRadius="6px">
            <Text flex="1" fontSize="sm" fontFamily="'Consolas', monospace" color="#c0c0c0">
              {name}
            </Text>
            <IconButton
              aria-label={`Удалить ${name}`}
              size="xs"
              variant="ghost"
              color="#888"
              _hover={{ color: '#ff6b6b', bg: '#3a1a2e' }}
              onClick={() => remove(i)}
            >
              ✕
            </IconButton>
          </Flex>
        ))}
      </Stack>

      {/* Добавление вручную */}
      <Flex gap="2" mb="2">
        <Input
          size="sm"
          placeholder="имя_процесса.exe"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addManual()}
          bg="#1a1a2e"
          border="1px solid #3a3a5a"
          color="#e0e0e0"
          _placeholder={{ color: '#666' }}
          fontFamily="'Consolas', monospace"
          flex="1"
        />
        <Button
          size="sm"
          variant="outline"
          color="#6c7ae0"
          borderColor="#6c7ae0"
          _hover={{ bg: '#6c7ae020' }}
          onClick={addManual}
          disabled={!inputValue.trim()}
        >
          Добавить
        </Button>
      </Flex>

      {/* Добавить текущее приложение */}
      <Button
        size="sm"
        variant="outline"
        color="#888"
        borderColor="#3a3a5a"
        _hover={{ color: '#6c7ae0', borderColor: '#6c7ae0' }}
        onClick={detectForeground}
        disabled={countdown > 0}
        w="full"
      >
        {countdown > 0 ? `Переключитесь на нужное приложение... ${countdown}` : '🎯 Добавить текущее приложение'}
      </Button>
    </Box>
  )
}
