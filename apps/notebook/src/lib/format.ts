/** Дата и время по Москве: «6 окт. 2026 г., 18:30» — одинаково на сервере и в клиенте */
export const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Moscow',
})
