// Барабанный реэкспорт для обратной совместимости — новые импорты предпочитают подпути
// './utility', './browser', './query' (см. README библиотеки), чтобы не тянуть в граф
// модулей платформенно-несовместимый код (Metro в React Native не делает tree-shaking
// статических импортов — см. .claude/docs/lib-consumer-missing-lib-dom.md).
export * from './browser'
export * from './query'
export * from './utility'
