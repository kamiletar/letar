import { generateBranchingElements } from './algorithms/branching'
import { generateGeometryElements } from './algorithms/geometry'
import { generateWavesElements } from './algorithms/waves'
import { parsePatternConfig, type PatternConfigV1 } from './config'
import { createPatternSvg } from './svg'

/** Элементы узора выбранного стиля для уже проверенных настроек. */
export function generatePatternElements(config: PatternConfigV1): string[] {
  switch (config.style) {
    case 'geometry':
      return generateGeometryElements(config)
    case 'waves':
      return generateWavesElements(config)
    case 'branching':
      return generateBranchingElements(config)
  }
}

/**
 * Полный путь: проверка настроек → алгоритм стиля → готовый SVG.
 * Одинаковые настройки всегда дают побайтно одинаковый результат.
 */
export function generatePatternSvg(input: unknown): string {
  const config = parsePatternConfig(input)
  return createPatternSvg(config, generatePatternElements(config))
}
