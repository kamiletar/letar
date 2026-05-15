/**
 * PiPButton — кнопка Picture-in-Picture
 */

import { IconButton } from '@chakra-ui/react'
import { LuPictureInPicture, LuPictureInPicture2 } from 'react-icons/lu'

interface PiPButtonProps {
  /** PiP активен */
  isActive: boolean
  /** Обработчик клика */
  onClick: () => void
}

export function PiPButton({ isActive, onClick }: PiPButtonProps) {
  return (
    <IconButton
      aria-label={isActive ? 'Выйти из PiP' : 'Картинка в картинке'}
      variant="ghost"
      color="white"
      minW="44px"
      minH="44px"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {isActive ? <LuPictureInPicture2 size={22} /> : <LuPictureInPicture size={22} />}
    </IconButton>
  )
}
