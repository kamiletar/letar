#!/usr/bin/env python3
"""
Ищет символы вне базовой латиницы/кириллицы в исходниках приложения — чтобы не
подставлять их системным шрифтом после перехода на локальный субсет.

Пропускает уже покрытые unicode-диапазоном latin/cyrillic (см. LATIN/CYRILLIC
в subset-google-font.py) и печатает остальное с частотой и примером файла.

Использование:
    python scripts/fonts/scan-extra-glyphs.py apps/<app>/src
"""

import sys
import unicodedata
from collections import Counter
from pathlib import Path

LATIN = set(range(0x00, 0x100)) | {0x131, 0x152, 0x153} | set(range(0x2BB, 0x2BD)) | {
    0x2C6, 0x2DA, 0x2DC, 0x304, 0x308, 0x329
} | set(range(0x2000, 0x2070)) | {0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD}
CYRILLIC = {0x301} | set(range(0x400, 0x460)) | {0x490, 0x491, 0x4B0, 0x4B1, 0x2116}
SKIP = LATIN | CYRILLIC

EXTS = {'.ts', '.tsx', '.mdx'}
SKIP_DIRS = {'node_modules', '.next', 'dist', 'generated', '.git'}


def main() -> None:
    root = Path(sys.argv[1])
    counter: Counter[str] = Counter()
    examples: dict[str, str] = {}

    for path in root.rglob('*'):
        if path.is_dir() or path.suffix not in EXTS:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        try:
            text = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        for ch in text:
            cp = ord(ch)
            if cp in SKIP or cp < 0x7F:
                continue
            counter[ch] += 1
            examples.setdefault(ch, str(path))

    if not counter:
        print('Символов вне latin+cyrillic не найдено.')
        return

    print(f'{len(counter)} уникальных символов вне latin+cyrillic:\n')
    for ch, count in counter.most_common():
        name = unicodedata.name(ch, '?')
        print(f'  U+{ord(ch):04X} {ch!r:>4}  {name:<40} x{count:<5} напр. {examples[ch]}')


if __name__ == '__main__':
    main()
