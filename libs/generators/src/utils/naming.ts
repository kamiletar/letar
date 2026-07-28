/**
 * Имена проектов в монорепо — kebab-case (`my-cool-app`). Здесь общие преобразования из него
 * в то, что подставляется в шаблоны генераторов.
 */

/** `my-cool-app` → `My Cool App` — дефолтный displayName, когда его не передали флагом */
export function toDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** `my-cool-app` → `myCoolApp` — для идентификаторов в сгенерированном коде */
export function toCamelCase(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
}
