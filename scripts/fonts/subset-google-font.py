#!/usr/bin/env python3
"""
Субсеттинг variable-шрифта из google/fonts под next/font/local.

Скачивает variable TTF и OFL.txt из зеркала google/fonts на GitHub, вырезает
unicode-подмножество, ограничивает ось wght реально используемым диапазоном
(без сплющивания в статику — остальные оси, если есть, остаются как есть) и
сохраняет woff2 + лицензию рядом с layout.tsx приложения.

Требует: pip install fonttools brotli

Пример:
    python scripts/fonts/subset-google-font.py \
        --slug jetbrainsmono --family "JetBrains Mono" \
        --weights 400 700 \
        --unicodes "0000-00FF,0131,0152-0153,02BB-02BC,02C6,02DA,02DC,0304,0308,0329,2000-206F,20AC,2122,2191,2193,2212,2215,FEFF,FFFD" "0301,0400-045F,0490-0491,04B0-04B1,2116" \
        --out apps/kami-key-the-landing/src/app/fonts/JetBrainsMono-cyrillic-latin.woff2

Порядок шагов важен: subset ДО instancer — обратный порядок роняет часть
шрифтов с KeyError на глифах, которые инстансинг уже вычистил из gvar.
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

GITHUB_API = 'https://api.github.com/repos/google/fonts/contents/ofl/{slug}'
RAW_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/{name}'


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': 'letar-font-subset-script'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def find_variable_ttf(slug: str, family_camel: str) -> str:
    listing = json.loads(fetch(GITHUB_API.format(slug=slug)))
    names = [f['name'] for f in listing if f['name'].endswith('.ttf')]
    pattern = re.compile(rf'^{re.escape(family_camel)}\[[A-Za-z,]+\]\.ttf$')
    candidates = [n for n in names if pattern.match(n)]
    if not candidates:
        raise SystemExit(
            f'Не нашёл variable TTF для {family_camel!r} в ofl/{slug}. '
            f'Файлы в каталоге: {names}. Проверь --family-camel вручную.'
        )
    return candidates[0]


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--slug', required=True, help='Папка в google/fonts/ofl/, напр. "jetbrainsmono"')
    p.add_argument('--family-camel', help='Имя файла без [axes].ttf, напр. "JetBrainsMono". По умолчанию = --slug с большой буквы по словам')
    p.add_argument('--weights', nargs=2, type=int, metavar=('LO', 'HI'), help='Диапазон оси wght для variable-шрифта, напр. 400 700')
    p.add_argument('--static-file', help='Имя статического .ttf в ofl/<slug>/ (шрифт без variable-файла, напр. "FiraSansCondensed-Black.ttf") — вместо --weights/--family-camel')
    p.add_argument('--unicodes', nargs='+', required=True, help='Один или несколько unicode range списков (latin, cyrillic, extra...)')
    p.add_argument('--out', required=True, help='Путь для .woff2 (лицензия рядом как OFL-<Family>.txt)')
    args = p.parse_args()

    from fontTools import subset
    from fontTools.ttLib import TTFont

    if args.static_file:
        ttf_name = args.static_file
        family_camel = args.family_camel or ttf_name.rsplit('.', 1)[0]
        print(f'Статический TTF: ofl/{args.slug}/{ttf_name}')
    else:
        if not args.weights:
            raise SystemExit('--weights обязателен для variable-шрифта (или используй --static-file)')
        family_camel = args.family_camel or ''.join(w.capitalize() for w in args.slug.replace('-', ' ').split())
        ttf_name = find_variable_ttf(args.slug, family_camel)
        print(f'Найден variable TTF: ofl/{args.slug}/{ttf_name}')

    ttf_bytes = fetch(RAW_BASE.format(slug=args.slug, name=ttf_name))
    ofl_bytes = fetch(RAW_BASE.format(slug=args.slug, name='OFL.txt'))

    tmp_ttf = Path(args.out).with_suffix('.src.ttf')
    tmp_ttf.parent.mkdir(parents=True, exist_ok=True)
    tmp_ttf.write_bytes(ttf_bytes)

    font = TTFont(str(tmp_ttf))

    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    s = subset.Subsetter(options=options)
    unicode_str = ','.join(args.unicodes)
    s.populate(unicodes=subset.parse_unicodes(unicode_str))
    s.subset(font)

    if not args.static_file:
        from fontTools.varLib import instancer

        lo, hi = args.weights
        font = instancer.instantiateVariableFont(font, {'wght': (lo, hi)})
    font.flavor = 'woff2'

    out_path = Path(args.out)
    font.save(str(out_path))
    tmp_ttf.unlink()

    ofl_path = out_path.parent / f'OFL-{args.family_camel or family_camel.split("-")[0]}.txt'
    ofl_path.write_bytes(ofl_bytes)

    size_kb = out_path.stat().st_size / 1024
    print(f'Сохранено: {out_path} ({size_kb:.1f} КБ), лицензия: {ofl_path}')


if __name__ == '__main__':
    main()
