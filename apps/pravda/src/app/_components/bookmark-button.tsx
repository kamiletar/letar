'use client'

import { IconButton } from '@chakra-ui/react'
import { memo, useCallback } from 'react'
import { LuBookmark, LuBookmarkCheck } from 'react-icons/lu'

import { type Bookmark, useBookmarks } from '@/hooks/use-bookmarks'

interface BookmarkButtonProps {
  /** Данные для закладки (без addedAt) */
  bookmark: Omit<Bookmark, 'addedAt'>
  /** Размер кнопки */
  size?: 'xs' | 'sm' | 'md'
}

/**
 * Кнопка добавления/удаления закладки.
 * Скрывается при печати.
 * Мемоизирована для оптимизации ререндеров.
 */
export const BookmarkButton = memo(function BookmarkButton({ bookmark, size = 'xs' }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const bookmarked = isBookmarked(bookmark.id)

  const handleClick = useCallback(() => {
    toggleBookmark(bookmark)
  }, [toggleBookmark, bookmark])

  return (
    <IconButton
      aria-label={bookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
      title={bookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
      variant="ghost"
      size={size}
      onClick={handleClick}
      color={bookmarked ? 'brand.500' : 'fg.muted'}
      data-print-hide
    >
      {bookmarked ? <LuBookmarkCheck /> : <LuBookmark />}
    </IconButton>
  )
})
