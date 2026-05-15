/**
 * Статичные ассеты для TSX шаблонов этикеток
 * Все изображения в формате data URI (SVG или PNG base64)
 */

// === ЛОГОТИП РОССТИЛЬ (упрощённый, без анимаций) ===
// Золотой цвет: #CA9E67
const ROSSTIL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" fill="#CA9E67">
  <!-- Звёзды -->
  <polygon points="100,5 105,20 121,20 108,30 113,45 100,35 87,45 92,30 79,20 95,20"/>
  <polygon points="70,15 74,25 85,25 76,32 79,42 70,35 61,42 64,32 55,25 66,25"/>
  <polygon points="130,15 134,25 145,25 136,32 139,42 130,35 121,42 124,32 115,25 126,25"/>
  <polygon points="50,30 53,38 62,38 55,43 57,51 50,46 43,51 45,43 38,38 47,38"/>
  <polygon points="150,30 153,38 162,38 155,43 157,51 150,46 143,51 145,43 138,38 147,38"/>

  <!-- Бриллиант -->
  <polygon points="100,85 75,55 60,55"/>
  <polygon points="100,75 88,55 78,55"/>
  <polygon points="100,85 125,55 140,55"/>
  <polygon points="100,75 112,55 122,55"/>
  <polygon points="100,80 85,55 115,55"/>
  <polygon points="97,50 100,40 103,50"/>
  <polygon points="85,50 88,38 91,50"/>
  <polygon points="99,35 92,50 87,50 82,35"/>
  <polygon points="80,35 58,50 75,50"/>
  <polygon points="115,50 112,38 109,50"/>
  <polygon points="101,35 108,50 113,50 118,35"/>
  <polygon points="120,35 142,50 125,50"/>

  <!-- Текст РОССТИЛЬ -->
  <text x="100" y="125" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" letter-spacing="3">РОССТИЛЬ</text>
  <text x="100" y="142" text-anchor="middle" font-family="Arial" font-size="10">Сделано в России</text>
</svg>`

export const logoRosstilBase64 = `data:image/svg+xml;base64,${Buffer.from(ROSSTIL_LOGO_SVG).toString('base64')}`

// === ЗНАК EAC (Евразийское соответствие) ===
const EAC_SIGN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" fill="none" stroke="#000" stroke-width="1.5">
  <!-- E -->
  <path d="M5,5 L5,35 M5,5 L18,5 M5,20 L15,20 M5,35 L18,35"/>
  <!-- A -->
  <path d="M25,35 L32.5,5 L40,35 M28,25 L37,25"/>
  <!-- C -->
  <path d="M55,10 C45,5 43,15 43,20 C43,25 45,35 55,30"/>
</svg>`

export const eacSignBase64 = `data:image/svg+xml;base64,${Buffer.from(EAC_SIGN_SVG).toString('base64')}`

// === ИКОНКИ УХОДА ЗА ОДЕЖДОЙ (ISO 3758) ===

// Стирка 40°C
const CARE_WASH_40_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M2,8 Q12,12 22,8 L22,20 Q12,24 2,20 Z"/>
  <text x="12" y="16" text-anchor="middle" font-family="Arial" font-size="7" fill="#000" stroke="none">40</text>
</svg>`

export const careWash40Base64 = `data:image/svg+xml;base64,${Buffer.from(CARE_WASH_40_SVG).toString('base64')}`

// Стирка 30°C
const CARE_WASH_30_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M2,8 Q12,12 22,8 L22,20 Q12,24 2,20 Z"/>
  <text x="12" y="16" text-anchor="middle" font-family="Arial" font-size="7" fill="#000" stroke="none">30</text>
</svg>`

export const careWash30Base64 = `data:image/svg+xml;base64,${Buffer.from(CARE_WASH_30_SVG).toString('base64')}`

// Отбеливание запрещено (перечёркнутый треугольник)
const CARE_NO_BLEACH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <polygon points="12,4 2,22 22,22"/>
  <line x1="4" y1="4" x2="20" y2="20"/>
</svg>`

export const careNoBleachBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_NO_BLEACH_SVG).toString('base64')}`

// Глажка средняя температура (2 точки)
const CARE_IRON_MEDIUM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M2,18 L2,10 L22,6 L22,18 Z"/>
  <circle cx="9" cy="13" r="1.5" fill="#000" stroke="none"/>
  <circle cx="15" cy="13" r="1.5" fill="#000" stroke="none"/>
</svg>`

export const careIronMediumBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_IRON_MEDIUM_SVG).toString('base64')}`

// Глажка низкая температура (1 точка)
const CARE_IRON_LOW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M2,18 L2,10 L22,6 L22,18 Z"/>
  <circle cx="12" cy="13" r="1.5" fill="#000" stroke="none"/>
</svg>`

export const careIronLowBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_IRON_LOW_SVG).toString('base64')}`

// Химчистка P (профессиональная)
const CARE_DRY_CLEAN_P_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <circle cx="12" cy="12" r="10"/>
  <text x="12" y="16" text-anchor="middle" font-family="Arial" font-size="10" fill="#000" stroke="none">P</text>
</svg>`

export const careDryCleanPBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_DRY_CLEAN_P_SVG).toString('base64')}`

// Химчистка запрещена
const CARE_NO_DRY_CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <circle cx="12" cy="12" r="10"/>
  <line x1="4" y1="4" x2="20" y2="20"/>
</svg>`

export const careNoDryCleanBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_NO_DRY_CLEAN_SVG).toString('base64')}`

// Сушка в барабане разрешена (низкая температура)
const CARE_TUMBLE_DRY_LOW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <rect x="2" y="2" width="20" height="20" rx="2"/>
  <circle cx="12" cy="12" r="6"/>
  <circle cx="12" cy="12" r="1.5" fill="#000" stroke="none"/>
</svg>`

export const careTumbleDryLowBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_TUMBLE_DRY_LOW_SVG).toString(
  'base64'
)}`

// Сушка в барабане запрещена
const CARE_NO_TUMBLE_DRY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <rect x="2" y="2" width="20" height="20" rx="2"/>
  <circle cx="12" cy="12" r="6"/>
  <line x1="4" y1="4" x2="20" y2="20"/>
</svg>`

export const careNoTumbleDryBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_NO_TUMBLE_DRY_SVG).toString(
  'base64'
)}`

// Естественная сушка (вертикальная линия в квадрате)
const CARE_LINE_DRY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.5">
  <rect x="2" y="2" width="20" height="20" rx="2"/>
  <line x1="12" y1="6" x2="12" y2="18"/>
</svg>`

export const careLineDryBase64 = `data:image/svg+xml;base64,${Buffer.from(CARE_LINE_DRY_SVG).toString('base64')}`

// === НАБОРЫ ИКОНОК УХОДА ===

/**
 * Стандартный набор для синтетики (полиэстер)
 * - Стирка 40°C
 * - Не отбеливать
 * - Глажка средняя
 * - Химчистка P
 * - Сушка в барабане низкая
 */
export const careSetPolyester = [
  careWash40Base64,
  careNoBleachBase64,
  careIronMediumBase64,
  careDryCleanPBase64,
  careTumbleDryLowBase64,
]

/**
 * Деликатный набор (шерсть, шёлк)
 * - Стирка 30°C
 * - Не отбеливать
 * - Глажка низкая
 * - Химчистка P
 * - Естественная сушка
 */
export const careSetDelicate = [
  careWash30Base64,
  careNoBleachBase64,
  careIronLowBase64,
  careDryCleanPBase64,
  careLineDryBase64,
]

/**
 * Набор "только химчистка"
 * - Химчистка P
 * - Не стирать (заменяем на wash30 как деликатную альтернативу)
 * - Не отбеливать
 * - Глажка низкая
 * - Естественная сушка
 */
export const careSetDryCleanOnly = [
  careDryCleanPBase64,
  careNoBleachBase64,
  careIronLowBase64,
  careNoTumbleDryBase64,
  careLineDryBase64,
]

// === ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ===

export type CareIconSet = typeof careSetPolyester

/**
 * Выбор набора иконок ухода по составу ткани
 */
export function getCareIconsByComposition(composition: string): string[] {
  const lowerComp = composition.toLowerCase()

  // Деликатные ткани
  if (
    lowerComp.includes('шерст') ||
    lowerComp.includes('шёлк') ||
    lowerComp.includes('шелк') ||
    lowerComp.includes('кашемир') ||
    lowerComp.includes('wool') ||
    lowerComp.includes('silk') ||
    lowerComp.includes('cashmere')
  ) {
    return careSetDelicate
  }

  // Только химчистка
  if (lowerComp.includes('кожа') || lowerComp.includes('замша') || lowerComp.includes('leather')) {
    return careSetDryCleanOnly
  }

  // По умолчанию — синтетика/хлопок
  return careSetPolyester
}
