'use client'

import { resumeContext } from '@/lib/audio/context'
import { SubtractiveEngine } from '@/lib/audio/subtractive'
import { REESE_BASS } from '@/lib/patch/defaults'
import type { SubtractivePatch } from '@/lib/patch/schema'
import { Box, Button, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Keyboard } from './keyboard'
import { ParamPanel } from './param-panel'

export function StudioClient() {
  const [started, setStarted] = useState(false)
  const [patch, setPatch] = useState<SubtractivePatch>(REESE_BASS)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())

  const engineRef = useRef<SubtractiveEngine | null>(null)
  // Храним актуальный патч в ref чтобы аудио-коллбэки не устаревали
  const patchRef = useRef(patch)
  patchRef.current = patch

  const handleStart = useCallback(async () => {
    const ctx = await resumeContext()
    engineRef.current = new SubtractiveEngine(ctx, ctx.destination)
    setStarted(true)
  }, [])

  const handleNoteOn = useCallback((midiNote: number, velocity: number) => {
    engineRef.current?.noteOn(midiNote, patchRef.current.engine, velocity)
    setActiveNotes((prev) => new Set([...prev, midiNote]))
  }, [])

  const handleNoteOff = useCallback((midiNote: number) => {
    engineRef.current?.noteOff(midiNote, patchRef.current.engine.amp.adsr.release)
    setActiveNotes((prev) => {
      const next = new Set(prev)
      next.delete(midiNote)
      return next
    })
  }, [])

  const handleEngineChange = useCallback(
    (engine: SubtractivePatch['engine']) => {
      // Живое обновление: все звучащие ноты перезапустить с новыми параметрами
      if (engineRef.current && activeNotes.size > 0) {
        engineRef.current.allNotesOff(0.05)
        setActiveNotes(new Set())
      }
      setPatch((p) => ({ ...p, engine }))
    },
    [activeNotes],
  )

  // Снять все ноты при размонтировании
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
    }
  }, [])

  return (
    <Box minH="100dvh" bg="bg.DEFAULT" display="flex" flexDir="column">
      {/* Шапка */}
      <Box
        px={6}
        py={3}
        borderBottom="1px solid"
        borderColor="border.subtle"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexShrink={0}
      >
        <Box display="flex" alignItems="center" gap={3}>
          <Text fontSize="sm" color="accent.DEFAULT" fontWeight="100" letterSpacing="0.2em">
            ✦
          </Text>
          <Text fontSize="xs" color="fg.muted" letterSpacing="0.15em" textTransform="uppercase">
            {patch.name}
          </Text>
        </Box>

        {!started && (
          <Button
            size="sm"
            variant="outline"
            borderColor="accent.DEFAULT"
            color="accent.emphasized"
            _hover={{ bg: 'accent.muted' }}
            onClick={handleStart}
            letterSpacing="0.1em"
            fontSize="xs"
          >
            ▶ Запустить звук
          </Button>
        )}

        {started && (
          <Text fontSize="9px" color="fg.subtle" letterSpacing="0.08em">
            ● активен · клавиши A–; · мышь
          </Text>
        )}
      </Box>

      {/* Основное содержимое */}
      <Box flex={1} overflow="auto" p={4} display="flex" flexDir="column" gap={4}>
        {/* Панель параметров */}
        <ParamPanel engine={patch.engine} onChange={handleEngineChange} />

        {/* Подсказка по клавиатуре */}
        <Text fontSize="9px" color="fg.subtle" letterSpacing="0.06em" textAlign="center">
          Клавиши: A W S E D F T G Y H U J K O L P ; — или кликай по клавишам ниже
        </Text>

        {/* Клавиатура — прилипает к низу */}
        <Box
          mt="auto"
          pb={4}
          display="flex"
          justifyContent="center"
          overflow="auto"
        >
          <Keyboard
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            activeNotes={activeNotes}
          />
        </Box>
      </Box>

      {/* Оверлей «нажми чтобы начать» */}
      {!started && (
        <Box
          position="fixed"
          inset={0}
          bg="bg.overlay"
          display="flex"
          flexDir="column"
          alignItems="center"
          justifyContent="center"
          gap={6}
          zIndex={10}
          onClick={handleStart}
          cursor="pointer"
        >
          <Text fontSize="4xl" color="accent.DEFAULT" fontWeight="100">
            ✦
          </Text>
          <Text fontSize="lg" color="fg.DEFAULT" fontWeight="200" letterSpacing="0.2em">
            Нажми чтобы услышать
          </Text>
          <Text fontSize="xs" color="fg.subtle" letterSpacing="0.08em">
            Web Audio требует жест пользователя
          </Text>
        </Box>
      )}
    </Box>
  )
}
