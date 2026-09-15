# Живая проверка нативного (не-браузерного) UI — симуляция клавиши + скриншот экрана

**Проблема.** Browser pane (`mcp__Claude_Browser__*`) видит только то, что рендерится внутри
самого браузера. Нативные Win32-окна (например GDI-оверлей `kami-key-the` — `src/overlay.ts`,
показывается при удержании `AltGr` через `RegisterHotKey`/`GetAsyncKeyState`) вообще не
существуют для этих инструментов: нет DOM, нет `getComputedStyle`, нет `read_page`. Обычная
верификация («открыть в браузере, сделать скриншот, прочитать текст») здесь неприменима в
принципе — не потому что что-то настроено неправильно, а потому что рендерится не браузером.

**Решение.** PowerShell P/Invoke двумя вызовами:

1. `user32.dll keybd_event` — симулирует **физическое** нажатие/отпускание клавиши (не просто
   отправку сообщения окну — это важно для функциональности, завязанной на
   `GetAsyncKeyState`/глобальные хоткеи, которые не видят синтетические `SendMessage`).
2. `System.Drawing.Graphics.CopyFromScreen` — снимок всего экрана в PNG, сохранённый в
   `.claude/artifacts/` (см. `.claude/rules/artifacts.md`), затем читается инструментом `Read`
   как изображение.

```powershell
Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name 'KeyboardSim' -Namespace 'Win32'
$VK_RMENU = 0xA5
[Win32.KeyboardSim]::keybd_event($VK_RMENU, 0, 0, [UIntPtr]::Zero)      # keydown
Start-Sleep -Milliseconds 800                                            # дать приложению время среагировать (debounce/hold-delay)

Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save("C:\web\letar\.claude\artifacts\<имя>.png", [System.Drawing.Imaging.ImageFormat]::Png)

[Win32.KeyboardSim]::keybd_event($VK_RMENU, 0, 0x0002, [UIntPtr]::Zero) # keyup (KEYEVENTF_KEYUP)
```

## Ловушка: чужая работающая копия приложения даёт ложное впечатление бага

Если на машине уже установлена и запущена **production**-версия того же Electron-приложения
(здесь — `C:\Users\Kami\AppData\Local\Programs\KamiKeyThe\KamiKeyThe.exe`), она реагирует на
тот же физический `AltGr` независимо от dev-инстанса, запущенного для проверки (`nx dev
<app>`) — обе используют `GetAsyncKeyState`, не эксклюзивный hook. Результат — на скриншоте
видно двоение/наложение двух почти одинаковых оверлеев (старая и новая версия друг на друге),
что на первый взгляд читается как «баг рендеринга дублирует контент». Это не баг — это две
независимые копии одного приложения, обе честно показывающие свою подсказку.

Различать по командной строке процесса (`Get-CimInstance Win32_Process` →
`CommandLine`/`ExecutablePath`): dev-инстанс работает из
`node_modules\.bun\electron@<version>\...\electron.exe` с `--app-path=<репо>/apps/<app>`,
прод-инстанс — из `AppData\Local\Programs\<App>\<App>.exe`. Останавливать (`taskkill /F /T
/PID`) **только** dev-инстанс — прод-версия принадлежит пользователю и не должна прерываться
случайно.

## Когда применять

Любая функциональность, которая рисуется вне браузерного рантайма и вне обычного окна
Electron-рендерера: GDI/Win32-оверлеи, системный трей, глобальные хоткеи с визуальным откликом,
нативные диалоги. Обычный Electron BrowserWindow (даже без адресной строки) всё ещё можно
инспектировать через DevTools/Browser pane — эта техника нужна именно там, где содержимого в
DOM попросту нет.

## Файлы

- `apps/kami-key-the/src/overlay.ts` — приложение, где техника применялась (минимум дважды:
  проверка фикса репейнта при смене раскладки и проверка размера/палитры оверлея).
- `.claude/rules/artifacts.md` — куда сохранять скриншоты.
