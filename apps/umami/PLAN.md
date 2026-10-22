# План разработки umami

> ⚠️ **С 2026-10-12 файл заморожен.** Очередь задач — в [`tasks/`](/apps/umami/tasks/README.md)
> (`bun scripts/tasks.mjs next umami` из корня монорепо). Новые задачи, журнал и итоги сюда
> не пишутся: хук не пропустит рост файла. Здесь остаётся справка. Формат —
> [tasks-per-file](/.claude/docs/tasks-per-file.md).

## Текущий статус: Self-hosted аналитика

Umami развёрнут на s1.letar.best. Обновления через Docker образ.

### Подключённые приложения

- premium-rosstil, imot, mandala, kami, pravda
- animatrona-landing, dashboard, driving-school

### Планируется

- [ ] Подключение новых приложений по мере деплоя
- [ ] Мониторинг и обновление версии Umami
