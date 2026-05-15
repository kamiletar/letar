/**
 * Вычисляет возраст по дате рождения
 * Учитывает точную дату (месяц и день)
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1
  }
  return age
}

/**
 * Вычисляет стаж в годах с точностью до десятых
 * Учитывает високосные годы (365.25 дней в году)
 */
export function calculateYearsOfExperience(startDate: Date): number {
  const today = new Date()
  const years = (today.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return Math.round(years * 10) / 10
}
