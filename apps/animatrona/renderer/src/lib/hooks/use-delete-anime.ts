/**
 * Хук для удаления аниме из библиотеки вместе с контентом из IPFS
 *
 * Новая IPFS-first архитектура: контент хранится в IPFS, а не на диске.
 * При удалении аниме удаляются блоки из IPFS blockstore.
 */

import { useState } from 'react'

import { useDeleteAnime as useDeleteAnimeMutation } from '@/lib/hooks'

interface DeleteAnimeOptions {
  /** ID аниме */
  animeId: string
  /** Удалять контент из IPFS (по умолчанию true) */
  deleteFromIpfs?: boolean
}

interface DeleteAnimeResult {
  success: boolean
  /** Количество удалённых CID из IPFS */
  deletedCids: number
  errors: string[]
}

/**
 * Удаляет аниме из БД и контент из IPFS
 */
export function useDeleteAnimeWithFiles() {
  const deleteMutation = useDeleteAnimeMutation()
  const [isBusy, setIsBusy] = useState(false)

  const deleteAnime = async (options: DeleteAnimeOptions): Promise<DeleteAnimeResult> => {
    setIsBusy(true)
    const { animeId, deleteFromIpfs = true } = options
    const errors: string[] = []
    let deletedCids = 0

    console.warn('[DeleteAnime] Начало удаления', { animeId, deleteFromIpfs })

    const api = window.electronAPI
    if (!api) {
      console.error('[DeleteAnime] Electron API недоступен!')
      return { success: false, deletedCids: 0, errors: ['Electron API недоступен'] }
    }

    // 1. Удаляем контент из IPFS (ПЕРЕД удалением из БД, т.к. нужны CID)
    if (deleteFromIpfs) {
      try {
        const ipfsResult = await api.ipfs?.publisherDeleteAnimeContent(animeId)
        if (ipfsResult?.success && ipfsResult.data) {
          deletedCids = ipfsResult.data.deletedCids
        } else if (ipfsResult?.error) {
          console.warn('[DeleteAnime] Ошибка удаления из IPFS:', ipfsResult.error)
          // Не блокируем — продолжаем удаление из БД
        }
      } catch (e) {
        console.warn('[DeleteAnime] Exception при удалении из IPFS:', e)
        // Не блокируем — продолжаем удаление из БД
      }
    }

    // 2. Удаляем из базы данных
    try {
      await deleteMutation.mutateAsync({ where: { id: animeId } })
    } catch (e) {
      // P2025 = запись не найдена — это нормально если данные неконсистентны
      const prismaError = e as { code?: string }
      if (prismaError.code === 'P2025') {
        console.warn('[DeleteAnime] Запись уже удалена (P2025) — считаем успехом')
      } else {
        console.error('[DeleteAnime] Ошибка удаления из БД:', e)
        errors.push(`Ошибка при удалении из БД: ${e}`)
        setIsBusy(false)
        return { success: false, deletedCids, errors }
      }
    }

    console.warn('[DeleteAnime] Завершено', { success: errors.length === 0, deletedCids })

    setIsBusy(false)
    return {
      success: errors.length === 0,
      deletedCids,
      errors,
    }
  }

  return {
    deleteAnime,
    isDeleting: isBusy || deleteMutation.isPending,
  }
}
