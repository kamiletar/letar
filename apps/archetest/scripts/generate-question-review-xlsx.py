# Генератор XLSX-таблицы для ревью вопросов психологом (этап 5.1 → ревью P1).
#
# Читает батчи prisma/question-batches/5.1/*.json (9 шкал × 15 вопросов) и собирает
# docs/question-review/question-review-5.1.xlsx: один лист со всеми 135 вопросами,
# автофильтр, дропдаун вердикта (ОК/Править/Удалить), колонка комментария.
#
# Запуск (из корня apps/archetest):
#   python scripts/generate-question-review-xlsx.py
#
# Требует: pip install openpyxl

import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

APP_DIR = Path(__file__).resolve().parent.parent
BATCH_DIR = APP_DIR / "prisma" / "question-batches" / "5.1"
OUT_DIR = APP_DIR / "docs" / "question-review"
OUT_FILE = OUT_DIR / "question-review-5.1.xlsx"

# Порядок и русские названия шкал (UI-названия, без клинических ярлыков)
SCALES = [
    ("MAC", "Макиавеллизм"),
    ("HUM", "Гуманизм"),
    ("KAN", "Кантианство"),
    ("FAI", "Вера в человечество"),
    ("SAD", "Садизм"),
    ("MAS", "Мазохизм (бета)"),
    ("ASD", "Систематизация и спектр"),
    ("DIR", "Прямота"),
    ("ALX", "Алекситимия"),
]

FONT = "Arial"
HEADER_FILL = PatternFill("solid", start_color="2F5496")
REVERSE_FILL = PatternFill("solid", start_color="FFF2CC")
THIN = Side(style="thin", color="D0D0D0")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def fmt_scoring(scoring: dict) -> str:
    return ", ".join(f"{code} {score}" for code, score in scoring.items())


def build_questions_sheet(ws, rows):
    headers = [
        "№",
        "Шкала",
        "Код",
        "Обр.",
        "Сценарий",
        "Вариант А",
        "Вариант Б",
        "Вариант В",
        "Вариант Г",
        "Вердикт",
        "Комментарий / правка",
    ]
    widths = [5, 16, 7, 6, 45, 38, 38, 38, 38, 12, 45]

    ws.append(headers)
    for col, width in enumerate(widths, start=1):
        letter = get_column_letter(col)
        ws.column_dimensions[letter].width = width
        cell = ws.cell(row=1, column=col)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF", size=10)
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for row in rows:
        ws.append(row)

    for row_cells in ws.iter_rows(min_row=2, max_row=ws.max_row):
        is_reverse = row_cells[3].value == "да"
        for cell in row_cells:
            cell.font = Font(name=FONT, size=10)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.border = BORDER
            if is_reverse:
                # Подсветка reverse-вопросов: их ключевой вариант «обратный» шкале
                if cell.column in (4,):
                    cell.fill = REVERSE_FILL

    # Дропдаун вердикта
    dv = DataValidation(type="list", formula1='"ОК,Править,Удалить"', allow_blank=True, showDropDown=False)
    dv.error = "Выберите: ОК, Править или Удалить"
    ws.add_data_validation(dv)
    dv.add(f"J2:J{ws.max_row}")

    ws.auto_filter.ref = f"A1:K{ws.max_row}"
    ws.freeze_panes = "F2"


def build_intro_sheet(ws):
    ws.column_dimensions["A"].width = 110
    lines = [
        ("Ревью вопросов Архетеста — 135 новых вопросов этапа 5.1 (9 шкал × 15)", True),
        ("", False),
        ("Полная инструкция — в файле INSTRUCTIONS.md рядом с этой таблицей (или спросите у Ками).", False),
        ("Коротко:", True),
        ("• Лист «Вопросы»: один вопрос = одна строка. Варианты А–Г — с баллами шкал в скобках.", False),
        ("• «Обр.» = да — reverse-вопрос: согласие с «прямым» вариантом даёт балл ДРУГИМ шкалам,", False),
        ("  а целевая шкала набирается через отказ/обратный выбор. Проверьте, что инверсия честная.", False),
        ("• Колонка «Вердикт»: ОК / Править / Удалить (дропдаун).", False),
        ("• «Комментарий / правка»: для «Править» — предложите свою формулировку прямо в ячейке.", False),
        ("", False),
        ("Что проверять (критерии — подробнее в INSTRUCTIONS.md):", True),
        ("1. Конструкт: измеряет ли вопрос целевую шкалу; правдоподобны ли побочные баллы других шкал.", False),
        ("2. Язык: естественность, однозначность, один смысловой фокус на вариант.", False),
        ("3. Социальная желательность: «тёмные» варианты не должны выглядеть очевидно «плохими».", False),
        ("4. Этика: без патологизирующих ярлыков; вопрос не триггерный без необходимости.", False),
        ("", False),
        ("Отдельная просьба (клиническая): вопрос-маркер суицидального риска — см. раздел в INSTRUCTIONS.md.", True),
    ]
    for i, (text, bold) in enumerate(lines, start=1):
        cell = ws.cell(row=i, column=1, value=text)
        cell.font = Font(name=FONT, size=11 if bold else 10, bold=bold)
        cell.alignment = Alignment(vertical="top", wrap_text=True)


def main():
    rows = []
    num = 0
    for code, label in SCALES:
        batch = json.loads((BATCH_DIR / f"{code}.json").read_text(encoding="utf-8"))
        for q in batch:
            num += 1
            options = q["options"]
            option_cells = [f"{opt['text']}\n[{fmt_scoring(opt['scoring'])}]" for opt in options]
            # Выравниваем до 4 колонок на случай нестандартного числа вариантов
            option_cells += [""] * (4 - len(option_cells))
            rows.append([
                num,
                label,
                code,
                "да" if q.get("_reverse") else "",
                q["scenario"],
                *option_cells[:4],
                "",
                "",
            ])

    wb = Workbook()
    intro = wb.active
    intro.title = "Инструкция"
    build_intro_sheet(intro)

    questions = wb.create_sheet("Вопросы")
    build_questions_sheet(questions, rows)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_FILE)
    print(f"OK: {OUT_FILE} — {num} вопросов")


if __name__ == "__main__":
    main()
