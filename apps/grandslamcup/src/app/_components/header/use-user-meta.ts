'use client'

/**
 * Хук для загрузки isCoach/isPoet/isOrganizer/isScorer/isPresenter из /api/auth/me после логина.
 */

import { useEffect, useState } from 'react'

interface UserMeta {
  isCoach: boolean
  isPoet: boolean
  isOrganizer: boolean
  isScorer: boolean
  isPresenter: boolean
}

const EMPTY_META: UserMeta = {
  isCoach: false,
  isPoet: false,
  isOrganizer: false,
  isScorer: false,
  isPresenter: false,
}

export function useUserMeta(userId: string | undefined) {
  const [meta, setMeta] = useState<UserMeta>(EMPTY_META)
  useEffect(() => {
    if (!userId) {
      setMeta(EMPTY_META)
      return
    }
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setMeta({
            isCoach: !!data.isCoach,
            isPoet: !!data.isPoet,
            isOrganizer: !!data.isOrganizer,
            isScorer: !!data.isScorer,
            isPresenter: !!data.isPresenter,
          })
        }
      })
      .catch(() => {
        /* игнорируем ошибку загрузки мета */
      })
  }, [userId])
  return meta
}
