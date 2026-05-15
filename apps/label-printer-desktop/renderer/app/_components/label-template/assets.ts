/**
 * Статичные ассеты для этикеток (браузерная версия)
 * Соответствуют оригинальному PNG шаблону РОССТИЛЬ
 */

// === ЛОГОТИП РОССТИЛЬ (лавровый венок с галстуком) ===
const ROSSTIL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" fill="none" stroke="#000" stroke-width="1.5">
  <!-- Галстук с узлом -->
  <polygon points="60,2 55,8 57,8 54,10 52,8 48,15 60,12 72,15 68,8 66,10 63,8 65,8" fill="#000" stroke="none"/>
  <path d="M52,15 L48,55 L60,62 L72,55 L68,15 Z" fill="#000" stroke="none"/>

  <!-- Левая ветвь лаврового венка -->
  <g fill="none" stroke="#000" stroke-width="1.2">
    <path d="M48,18 Q30,20 22,35"/>
    <ellipse cx="35" cy="22" rx="8" ry="4" transform="rotate(-30 35 22)"/>
    <ellipse cx="28" cy="30" rx="8" ry="4" transform="rotate(-45 28 30)"/>
    <ellipse cx="22" cy="40" rx="8" ry="4" transform="rotate(-60 22 40)"/>
    <ellipse cx="20" cy="52" rx="8" ry="4" transform="rotate(-75 20 52)"/>
    <ellipse cx="22" cy="64" rx="8" ry="4" transform="rotate(-85 22 64)"/>
    <ellipse cx="28" cy="75" rx="8" ry="4" transform="rotate(75 28 75)"/>
    <ellipse cx="38" cy="82" rx="8" ry="4" transform="rotate(55 38 82)"/>
  </g>

  <!-- Правая ветвь лаврового венка -->
  <g fill="none" stroke="#000" stroke-width="1.2">
    <path d="M72,18 Q90,20 98,35"/>
    <ellipse cx="85" cy="22" rx="8" ry="4" transform="rotate(30 85 22)"/>
    <ellipse cx="92" cy="30" rx="8" ry="4" transform="rotate(45 92 30)"/>
    <ellipse cx="98" cy="40" rx="8" ry="4" transform="rotate(60 98 40)"/>
    <ellipse cx="100" cy="52" rx="8" ry="4" transform="rotate(75 100 52)"/>
    <ellipse cx="98" cy="64" rx="8" ry="4" transform="rotate(85 98 64)"/>
    <ellipse cx="92" cy="75" rx="8" ry="4" transform="rotate(-75 92 75)"/>
    <ellipse cx="82" cy="82" rx="8" ry="4" transform="rotate(-55 82 82)"/>
  </g>

  <!-- Надпись ROSSTIL -->
  <text x="60" y="72" text-anchor="middle" font-family="Arial Black, Arial" font-size="14" font-weight="900" fill="#000" stroke="none">ROSSTIL</text>

  <!-- Лента с 2000 -->
  <path d="M30,88 Q45,82 60,88 Q75,82 90,88 L88,95 Q75,90 60,95 Q45,90 32,95 Z" fill="none" stroke="#000" stroke-width="1.5"/>
  <text x="60" y="93" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold" fill="#000" stroke="none">2000</text>
</svg>`

export const logoRosstilBase64 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(ROSSTIL_LOGO_SVG)))}`

// === ЗНАК EAC (Евразийское соответствие) ===
const EAC_SIGN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510.2 510.2">
<polygon fill="#000" points="56.7,113.4 56.7,56.7 113.4,56.7 113.4,0 56.7,0 0,0 0,56.7 0,113.4 0,170.1 0,226.8 0,283.5 0,340.2 0,396.9 0,453.5 0,510.2 56.7,510.2 113.4,510.2 113.4,453.5 56.7,453.5 56.7,396.9 56.7,340.2 56.7,283.5 113.4,283.5 113.4,226.8 56.7,226.8 56.7,170.1"/>
<polygon fill="#000" points="453.5,340.2 453.5,283.5 453.5,226.8 453.5,170.1 453.5,113.4 453.5,56.7 510.2,56.7 510.2,0 453.5,0 396.9,0 396.9,56.7 396.9,113.4 396.9,170.1 396.9,226.8 396.9,283.5 396.9,340.2 396.9,396.9 396.9,453.5 396.9,510.2 453.5,510.2 510.2,510.2 510.2,453.5 453.5,453.5 453.5,396.9"/>
<path fill="#000" d="M283.5,0h-56.7h-56.7v56.7v56.7v56.7v56.7v56.7v56.7v56.7v56.7v56.7h56.7v-56.7v-56.7v-56.7v-56.7h56.7v56.7v56.7v56.7v56.7h56.7v-56.7v-56.7v-56.7v-56.7v-56.7v-56.7v-56.7V56.7V0H283.5z M283.5,113.4v56.7v56.7h-56.7v-56.7v-56.7V56.7h56.7V113.4z"/>
</svg>`

export const eacSignBase64 = `data:image/svg+xml;base64,${btoa(EAC_SIGN_SVG)}`

// === ИКОНКИ УХОДА ЗА ОДЕЖДОЙ (как в оригинале) ===

// Стирка 40°C (таз с водой и волнами)
const CARE_WASH_40_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M4,10 Q16,14 28,10 L28,26 Q16,30 4,26 Z"/>
  <path d="M8,17 Q10,15 12,17 Q14,19 16,17 Q18,15 20,17 Q22,19 24,17" fill="none" stroke="#000" stroke-width="1.2"/>
  <text x="16" y="25" text-anchor="middle" font-family="Arial" font-size="9" font-weight="bold" fill="#000" stroke="none">40</text>
</svg>`
export const careWash40Base64 = `data:image/svg+xml;base64,${btoa(CARE_WASH_40_SVG)}`

// Не отбеливать (перечёркнутый треугольник)
const CARE_NO_BLEACH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="1.5">
  <polygon points="16,4 3,28 29,28"/>
  <line x1="6" y1="6" x2="26" y2="26"/>
</svg>`
export const careNoBleachBase64 = `data:image/svg+xml;base64,${btoa(CARE_NO_BLEACH_SVG)}`

// Глажка (утюг с 2 точками — средний режим)
const CARE_IRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="1.5">
  <path d="M4,24 L4,14 L28,8 L28,24 Z"/>
  <circle cx="13" cy="17" r="1.5" fill="#000" stroke="none"/>
  <circle cx="19" cy="17" r="1.5" fill="#000" stroke="none"/>
</svg>`
export const careIronBase64 = `data:image/svg+xml;base64,${btoa(CARE_IRON_SVG)}`

// Химчистка P (круг с буквой P)
const CARE_DRY_CLEAN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="1.5">
  <circle cx="16" cy="16" r="13"/>
  <text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="#000" stroke="none">P</text>
</svg>`
export const careDryCleanBase64 = `data:image/svg+xml;base64,${btoa(CARE_DRY_CLEAN_SVG)}`

// Сушка в барабане запрещена (квадрат с кругом и крестом)
const CARE_NO_TUMBLE_DRY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="1.5">
  <rect x="3" y="3" width="26" height="26"/>
  <circle cx="16" cy="16" r="8"/>
  <line x1="6" y1="6" x2="26" y2="26"/>
</svg>`
export const careNoTumbleDryBase64 = `data:image/svg+xml;base64,${btoa(CARE_NO_TUMBLE_DRY_SVG)}`

/** Стандартный набор иконок ухода (как в оригинале) */
export const careSetDefault = [
  careWash40Base64,
  careNoBleachBase64,
  careIronBase64,
  careDryCleanBase64,
  careNoTumbleDryBase64,
]

/** Выбор иконок ухода по составу */
export function getCareIconsByComposition(_composition: string): string[] {
  return careSetDefault
}
