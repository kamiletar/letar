---
id: TV-001
title: "Тест на Android TV: поднять эмулятор или получить устройство"
status: blocked
size: M
area: acceptance
priority: 3
blocked_by:
  - "kami: выбор: эмулятор (1,5 ГБ) или устройство"
owner: ""
stage: ""
source: PLAN.md, открытый вопрос про тестирование на Android TV
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

После миграции на RN 0.87 (2026-08-20) и смены Android toolchain (2026-08-25) приложение на реальном Android TV не проверялось, только собирался APK. AVD `Television_1080p` есть, но пакет `emulator` и system-image `android-36;android-tv;x86` из `C:/Android/Sdk` пропали (доустановка через `sdkmanager`, около 1,5 ГБ). Решить: поднять эмулятор заново или дождаться устройства. Детали — `PLAN_TESTING.md`.

## Приёмка

- [ ] Решение принято
- [ ] Приложение запущено на ТВ или эмуляторе, навигация пультом работает

## План

## Журнал

## Итог
