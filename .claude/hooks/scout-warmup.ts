// SessionStart (startup): прогрев локального скаута. Сам хук занимает десятки миллисекунд —
// индекс, прогрев эмбеддера и досчёт векторов делает отсоединённый `scripts/scout/warmup.ts`.
// Fail-open: любая ошибка — тихий выход с кодом 0. Разбор — .claude/docs/local-scout.md
try {
  const { requestVectorRefresh } = await import('../../scripts/scout/hook-core')
  const { findRepoRoot } = await import('../../scripts/scout/index-store')
  const { scoutHome } = await import('../../scripts/scout/paths')
  const root = findRepoRoot(process.cwd())
  if (root) {
    // Прогрев эмбеддера нужен на каждом старте сессии — маркер «не чаще раза в 10 минут» не учитываем
    requestVectorRefresh(root, scoutHome(), { force: true })
  }
} catch {
  // fail-open
}
process.exit(0)
