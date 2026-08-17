# -*- coding: utf-8 -*-
"""Сверка планов приложения со schema.zmodel.

    python scripts/audit-plans.py <app-name> [output.md]

Зачем: планы живут дольше схемы. Модель переименовали — в планах осталось старое имя,
и исполнитель идёт искать то, чего нет. Скрипт ловит именно это.

Общий скрипт для любого приложения монорепо, у которого есть `apps/<app>/schema.zmodel`
(на 2026-08-18 таких 19 — `ls apps/*/schema.zmodel`). Изначально написан для domwellbes
(реальный найденный баг: планы ссылались на StockMovement, которую заменили на
StockDocument/StockDocumentLine), обобщён на весь монорепо.

Что проверяет:
  1. `Модель.поле` в планах, где модель есть, а поля нет и оно нигде не объявлено новым;
  2. модели, которых нет ни в схеме, ни в объявлениях планов;
  3. одну модель, объявленную в двух планах по-разному.

Список планов для сверки собирается автоматически: все `apps/<app>/PLAN*.md` и
`apps/<app>/ROADMAP*.md`, кроме архивов — `PLAN_COMPLETED*.md` и `CHANGELOG*.md` сознательно
не проверяются, там историчные записи, старое имя модели там стоит по праву.

⚠️ Ложные срабатывания — норма, скрипт грубый. Он не отличает:
  - компоненты Chakra (`Table.Root`, `Drawer.Root`) от моделей;
  - имена файлов (`ROADMAP.md`) от моделей;
  - типы чужих API (`TBankReceiptItem.Tax`);
  - будущие модели из ROADMAP, описанные текстом без zmodel-блока;
  - исторические записи `[x]`, где старое имя стоит по праву.

Поэтому читать вывод глазами, а не чинить всё подряд. Первый прогон на domwellbes (18.08) дал
22 находки, из них реальных — 3.
"""
import io
import os
import re
import sys
from collections import defaultdict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ARCHIVE_PREFIXES = ('PLAN_COMPLETED', 'CHANGELOG')


def discover_plans(app_dir):
    """Все PLAN*.md / ROADMAP*.md приложения, кроме архивов."""
    names = []
    for fname in sorted(os.listdir(app_dir)):
        if not fname.endswith('.md'):
            continue
        if not (fname.startswith('PLAN') or fname.startswith('ROADMAP')):
            continue
        if fname.startswith(ARCHIVE_PREFIXES):
            continue
        names.append(fname)
    return names


def read(app_dir, p):
    return io.open(os.path.join(app_dir, p), encoding='utf-8').read()


def run_audit(app_name):
    app_dir = os.path.join(REPO_ROOT, 'apps', app_name)
    schema_path = os.path.join(app_dir, 'schema.zmodel')
    if not os.path.isfile(schema_path):
        print('Нет schema.zmodel: %s' % schema_path, file=sys.stderr)
        sys.exit(1)

    plans = discover_plans(app_dir)

    # ---------- 1. схема ----------
    schema = io.open(schema_path, encoding='utf-8').read()
    schema_models = {}   # имя -> set(полей)
    schema_enums = set()

    for m in re.finditer(r'^(model|type|view)\s+(\w+)\s*\{', schema, re.M):
        name = m.group(2)
        start = m.end()
        depth = 1
        i = start
        while i < len(schema) and depth:
            if schema[i] == '{':
                depth += 1
            elif schema[i] == '}':
                depth -= 1
            i += 1
        body = schema[start:i]
        fields = set()
        for line in body.split('\n'):
            line = line.strip()
            if not line or line.startswith('//') or line.startswith('///') or line.startswith('@@'):
                continue
            fm = re.match(r'(\w+)\s+\S', line)
            if fm:
                fields.add(fm.group(1))
        schema_models[name] = fields

    for m in re.finditer(r'^enum\s+(\w+)\s*\{', schema, re.M):
        schema_enums.add(m.group(1))

    # ---------- 2. объявления в планах ----------
    declared_models = defaultdict(dict)   # модель -> {план: set(полей)}
    declared_enums = defaultdict(set)     # enum -> set(планов)
    plan_text = {}

    for p in plans:
        try:
            t = read(app_dir, p)
        except FileNotFoundError:
            continue
        plan_text[p] = t
        for m in re.finditer(r'^\s*model\s+(\w+)\s*\{', t, re.M):
            name = m.group(1)
            start = m.end()
            depth = 1
            i = start
            while i < len(t) and depth:
                if t[i] == '{':
                    depth += 1
                elif t[i] == '}':
                    depth -= 1
                i += 1
            body = t[start:i]
            fields = set()
            for line in body.split('\n'):
                line = line.strip()
                if not line or line.startswith('//') or line.startswith('@@'):
                    continue
                fm = re.match(r'(\w+)\s+\S', line)
                if fm:
                    fields.add(fm.group(1))
            declared_models[name][p] = fields
        for m in re.finditer(r'^\s*enum\s+(\w+)\s*\{', t, re.M):
            declared_enums[m.group(1)].add(p)

    # все поля, которые где-либо в планах названы новыми
    known_new_fields = set()
    for p, t in plan_text.items():
        for m in re.finditer(r'\+\s*`?(\w+)\s+\w', t):
            known_new_fields.add(m.group(1))
        for m in re.finditer(r'`\+\s*(\w+)', t):
            known_new_fields.add(m.group(1))
    for name, per_plan in declared_models.items():
        for fields in per_plan.values():
            known_new_fields |= fields

    all_models = dict(schema_models)
    for name, per_plan in declared_models.items():
        merged = set()
        for f in per_plan.values():
            merged |= f
        all_models.setdefault(name, set())
        all_models[name] |= merged

    # ---------- 3. упоминания Model.field ----------
    problems_field = []
    problems_model = []
    KNOWN_NON_MODELS = {
        'process', 'window', 'console', 'z', 'auth', 'this', 'ctx', 'req', 'res',
        'React', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Date',
        'Intl', 'Prisma', 'Decimal', 'Zod', 'Chakra', 'Next', 'Playwright',
    }

    for p, t in plan_text.items():
        for m in re.finditer(r'`([A-Z]\w+)\.(\w+)`', t):
            model, field = m.group(1), m.group(2)
            if model in KNOWN_NON_MODELS:
                continue
            line_no = t[:m.start()].count('\n') + 1
            if model not in all_models:
                if model not in schema_enums and model not in declared_enums:
                    problems_model.append((p, line_no, model, field))
                continue
            if field in all_models[model]:
                continue
            if field in known_new_fields:
                continue
            problems_field.append((p, line_no, model, field))

    # ---------- 4. расхождения объявлений между планами ----------
    conflicts = []
    for name, per_plan in declared_models.items():
        if len(per_plan) > 1:
            plans_with_name = list(per_plan)
            base = per_plan[plans_with_name[0]]
            for other in plans_with_name[1:]:
                diff = base ^ per_plan[other]
                if diff:
                    conflicts.append((name, plans_with_name[0], other, sorted(diff)))

    out = []
    out.append('# Сверка планов %s со schema.zmodel\n' % app_name)
    out.append('Планов сверено: %d (%s)' % (len(plan_text), ', '.join(sorted(plan_text)) or '—'))
    out.append('Моделей в схеме: %d, enum: %d' % (len(schema_models), len(schema_enums)))
    out.append('Новых моделей объявлено в планах: %d' % len(declared_models))
    out.append('')

    out.append('## 1. Поле упомянуто, но его нет ни в схеме, ни в объявлениях планов (%d)' % len(problems_field))
    seen = set()
    for p, ln, model, field in sorted(problems_field):
        key = (model, field)
        if key in seen:
            continue
        seen.add(key)
        out.append('- `%s.%s` — %s:%d' % (model, field, p, ln))

    out.append('')
    out.append('## 2. Модель упомянута, но её нет нигде (%d)' % len(problems_model))
    seen = set()
    for p, ln, model, field in sorted(problems_model):
        if model in seen:
            continue
        seen.add(model)
        out.append('- `%s` (в `%s.%s`) — %s:%d' % (model, model, field, p, ln))

    out.append('')
    out.append('## 3. Одна модель объявлена в разных планах по-разному (%d)' % len(conflicts))
    for name, a, b, diff in conflicts:
        out.append('- `%s`: %s vs %s — расходятся поля: %s' % (name, a, b, ', '.join(diff)))

    return '\n'.join(out)


def main():
    if len(sys.argv) < 2:
        print('Использование: python scripts/audit-plans.py <app-name> [output.md]', file=sys.stderr)
        sys.exit(1)

    app_name = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) > 2 else 'audit-%s.md' % app_name

    res = run_audit(app_name)
    io.open(out_path, 'w', encoding='utf-8').write(res)
    print(res[:6000])


if __name__ == '__main__':
    main()
