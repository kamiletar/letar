/** Маппинг ролей игроков → русские названия */
export const playerRoleLabels: Record<string, string> = {
  PLAYER: 'Игрок',
  COACH: 'Тренер',
  ASSISTANT_COACH: 'Зам. тренера',
}

/** Получить русское название роли с учётом флага isPlaying */
export function getRoleLabel(role: string, isPlaying?: boolean): string {
  if (role === 'COACH') {
    return isPlaying ? 'Играющий тренер' : 'Тренер'
  }
  if (role === 'ASSISTANT_COACH') {
    return isPlaying ? 'Играющий зам. тренера' : 'Зам. тренера'
  }
  return playerRoleLabels[role] ?? role
}

/** Цвет badge для роли */
export function getRoleColor(role: string): string {
  if (role === 'COACH' || role === 'ASSISTANT_COACH') {
    return 'teal'
  }
  return 'gray'
}
