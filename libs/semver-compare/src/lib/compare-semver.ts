/**
 * Сравнивает два semver вида `X.Y.Z` (без диапазонов и суффиксов пререлиза). Возвращает > 0,
 * если `a` новее `b`, < 0 если старее, 0 если равны.
 *
 * Нужна там, где GitHub Releases API отдаёт список не в порядке убывания версии (см.
 * `@letar/github-releases` и `@letar/electron-monorepo-updater`) и приходится выбирать
 * максимальную версию среди совпадений по тегу вручную, а не полагаться на порядок ответа.
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) {
      return diff
    }
  }
  return 0
}
