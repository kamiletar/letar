/**
 * Ранний инлайн-скрипт `<head>` (KM-030, KM-018): до первой отрисовки решает, какую версию входа играть,
 * и ставит на `<html>` атрибут `data-kami-entry="full|short"`. По нему CSS прячет слои церемонии,
 * чтобы финальная разметка из HTML не мигала перед началом. Без JS и при reduced-motion
 * атрибута нет — страница сразу в финальном кадре.
 *
 * Правило повтора (решение владельца, 2026-10-26): первый заход — `full`, следующие заходы и reload —
 * `short`, возврат кнопкой «Назад»/«Вперёд» (`back_forward`) — атрибута нет (`none`). «Первый» — это
 * отсутствие `localStorage['kami.entry.seen']`; флаг пишется сразу, поэтому пропуск и уход посреди
 * входа тоже считаются показом. Если `localStorage` недоступен — `full` без записи.
 * Скрипт выполняется только при настоящей загрузке документа: клиентские переходы и восстановление
 * из bfcache его не запускают (bfcache обрабатывает `pageshow` в `matrix-rain.tsx`).
 * Главная — «/», «/en» с необязательным слэшем, как в `main-matrix.tsx`.
 */
export const ENTRY_SEEN_KEY = 'kami.entry.seen'

export const ENTRY_BOOT_SCRIPT = String.raw`(function(){try{
var d=document.documentElement;
if(!/^\/(en)?\/?$/.test(location.pathname))return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var n=performance.getEntriesByType('navigation')[0];
if(n&&n.type==='back_forward')return;
var m='full';
try{
if(localStorage.getItem('${ENTRY_SEEN_KEY}'))m='short';
else localStorage.setItem('${ENTRY_SEEN_KEY}','1');
}catch(e){}
d.setAttribute('data-kami-entry',m);
}catch(e){}})();`
