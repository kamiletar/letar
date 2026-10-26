/**
 * Ранний инлайн-скрипт `<head>` (KM-030): до первой отрисовки решает, играть ли церемонию входа,
 * и ставит на `<html>` атрибут `data-kami-entry="full|short"`. По нему CSS прячет слои церемонии,
 * чтобы финальная разметка из HTML не мигала перед началом. Без JS и при reduced-motion
 * атрибута нет — страница сразу в финальном кадре.
 *
 * Сейчас режим всегда `full`; правило повтора (`short`, `none` для Back) добавит KM-018 здесь же.
 * Главная — «/», «/en» с необязательным слэшем, как в `main-matrix.tsx`.
 */
export const ENTRY_BOOT_SCRIPT = String.raw`(function(){try{
var d=document.documentElement;
if(!/^\/(en)?\/?$/.test(location.pathname))return;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
d.setAttribute('data-kami-entry','full');
}catch(e){}})();`
