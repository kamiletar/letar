/**
 * Ранний инлайн-скрипт `<head>` (KM-030, KM-018, KM-039): до первой отрисовки решает, какую версию входа играть,
 * и ставит на `<html>` атрибут `data-kami-entry="full|short"`. По нему CSS прячет слои церемонии,
 * чтобы финальная разметка из HTML не мигала перед началом. Без JS и при reduced-motion
 * атрибута нет — страница сразу в финальном кадре.
 *
 * Правило повтора (решение владельца, 2026-10-26): первый заход — `full`, следующие заходы и reload —
 * `short`, возврат кнопкой «Назад»/«Вперёд» (`back_forward`) — атрибута нет (`none`). «Первый» — это
 * отсутствие `localStorage['kami.entry.seen']`; флаг пишется сразу, поэтому пропуск и уход посреди
 * входа тоже считаются показом. Если `localStorage` недоступен — `full` без записи.
 *
 * Экран языка (KM-039): `full` показывает его первым, для этого скрипт ставит `data-kami-entry-lang`.
 * Выбор другого языка — переход на адрес этой локали; перед ним пишется одноразовая метка
 * `sessionStorage['kami.entry.resume']`. Свежая (моложе 10 с) метка даёт `full` без экрана языка:
 * вход продолжается на новом адресе загрузкой, а не заново с выбора языка.
 *
 * Скрипт выполняется только при настоящей загрузке документа: клиентские переходы и восстановление
 * из bfcache его не запускают (bfcache обрабатывает `pageshow` в `matrix-rain.tsx`).
 * Главная — «/», «/en» с необязательным слэшем, как в `main-matrix.tsx`.
 */
export const ENTRY_SEEN_KEY = 'kami.entry.seen'
/** Метка «язык только что выбран на экране языка»: значение — `Date.now()`, живёт 10 с, читается один раз. */
export const ENTRY_RESUME_KEY = 'kami.entry.resume'

export const ENTRY_BOOT_SCRIPT = String.raw`(function(){try{
var d=document.documentElement;
if(!/^\/(en)?\/?$/.test(location.pathname))return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var n=performance.getEntriesByType('navigation')[0];
if(n&&n.type==='back_forward')return;
var f=false;
try{
var r=sessionStorage.getItem('${ENTRY_RESUME_KEY}');
if(r){sessionStorage.removeItem('${ENTRY_RESUME_KEY}');f=Date.now()-Number(r)<10000;}
}catch(e){}
var m='full';
try{
if(f)localStorage.setItem('${ENTRY_SEEN_KEY}','1');
else if(localStorage.getItem('${ENTRY_SEEN_KEY}'))m='short';
else localStorage.setItem('${ENTRY_SEEN_KEY}','1');
}catch(e){}
d.setAttribute('data-kami-entry',m);
if(m==='full'&&!f)d.setAttribute('data-kami-entry-lang','');
}catch(e){}})();`
