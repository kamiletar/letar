'use client'

import { downloadPatchJson } from '@/lib/patch/publish'
import type { Patch } from '@/lib/patch/schema'
import { deletePatch, listPatches, savePatch, slugify } from '@/lib/storage/patches-db'
import { Box, HStack, Text } from '@chakra-ui/react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'

interface PatchLibraryProps {
  /** Тип текущего движка — библиотека показывает только патчи этого типа */
  type: Patch['type']
  /** Текущий патч (для сохранения) */
  currentPatch: Patch
  /** Загрузка выбранного патча в текущий движок */
  onLoad: (patch: Patch) => void
}

const btnStyle = (accent = false): React.CSSProperties => ({
  background: 'transparent',
  border: '1px solid',
  borderColor: accent ? '#D4AF37' : '#5a3a10',
  borderRadius: '3px',
  color: accent ? '#EEC835' : '#D4AF37',
  cursor: 'pointer',
  fontSize: '10px',
  padding: '2px 8px',
  fontFamily: 'monospace',
  lineHeight: 1.4,
})

const inputStyle: React.CSSProperties = {
  background: '#0E0A00',
  border: '1px solid #5a3a10',
  borderRadius: '3px',
  color: '#EEC835',
  fontSize: '10px',
  fontFamily: 'monospace',
  padding: '3px 6px',
  outline: 'none',
  minWidth: '140px',
}

export function PatchLibrary({ type, currentPatch, onLoad }: PatchLibraryProps) {
  const [patches, setPatches] = useState<Patch[]>([])
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  const refresh = useCallback(() => {
    void listPatches(type).then(setPatches)
  }, [type])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleSave = useCallback(() => {
    const patchName = name.trim() || currentPatch.name
    const id = `${slugify(patchName)}-${Date.now().toString(36)}`
    const toSave: Patch = { ...currentPatch, id, name: patchName, createdAt: new Date().toISOString() }
    void savePatch(toSave)
      .then(() => {
        setStatus('saved')
        setName('')
        refresh()
        setTimeout(() => setStatus('idle'), 1500)
      })
      .catch(() => {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 1500)
      })
  }, [name, currentPatch, refresh])

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation()
      void deletePatch(id).then(refresh)
    },
    [refresh]
  )

  const handlePublish = useCallback((patch: Patch, e: React.MouseEvent) => {
    e.stopPropagation()
    downloadPatchJson(patch)
  }, [])

  return (
    <Box
      display="flex"
      flexDir="column"
      gap={2}
      px={3}
      py={2}
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.subtle"
    >
      <HStack gap={2} flexWrap="wrap">
        <Text fontSize="9px" color="fg.subtle" letterSpacing="0.06em" flexShrink={0}>
          Мои патчи ({type}):
        </Text>
        <input
          style={inputStyle}
          placeholder={currentPatch.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave()
            }
          }}
        />
        <button style={btnStyle(true)} onClick={handleSave}>
          Сохранить текущий
        </button>
        {status === 'saved' && (
          <Text fontSize="9px" color="green.400">
            ✓ сохранено
          </Text>
        )}
        {status === 'error' && (
          <Text fontSize="9px" color="red.400">
            ✗ не удалось сохранить
          </Text>
        )}
      </HStack>

      {patches.length > 0 && (
        <HStack gap={2} flexWrap="wrap">
          {patches.map((p) => (
            <HStack
              key={p.id}
              gap={1}
              px={2}
              py="2px"
              borderRadius="3px"
              border="1px solid #2A2018"
              cursor="pointer"
              onClick={() => onLoad(p)}
              _hover={{ borderColor: '#5a3a10' }}
            >
              <Text fontSize="9px" color="fg.muted" fontFamily="mono">
                {p.name}
              </Text>
              <button
                style={{ ...btnStyle(false), padding: '0 4px', fontSize: '9px', border: 'none' }}
                onClick={(e) => handlePublish(p, e)}
                title="Опубликовать (скачать JSON для patches/)"
              >
                ⇧
              </button>
              <button
                style={{ ...btnStyle(false), padding: '0 4px', fontSize: '9px', border: 'none' }}
                onClick={(e) => handleDelete(p.id, e)}
                title="Удалить"
              >
                ✕
              </button>
            </HStack>
          ))}
        </HStack>
      )}
    </Box>
  )
}
