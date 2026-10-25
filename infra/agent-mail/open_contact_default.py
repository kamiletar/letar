"""Локальный патч Agent Mail: default open и явная миграция auto одного проекта."""

import argparse
import ast
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


def patch_model(path: Path) -> bool:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source)
    agent = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "Agent")
    field = next(
        node for node in agent.body
        if isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name) and node.target.id == "contact_policy"
    )
    if not isinstance(field.value, ast.Call):
        raise ValueError("Неизвестное объявление Agent.contact_policy; проверь апстрим")
    default = next(item.value for item in field.value.keywords if item.arg == "default")
    if not isinstance(default, ast.Constant) or default.value not in ("auto", "open"):
        raise ValueError("Неизвестный default Agent.contact_policy; проверь апстрим")
    if default.value == "open":
        return False
    lines = source.splitlines(keepends=True)
    if default.lineno != default.end_lineno:
        raise ValueError("Многострочный default требует ручной проверки")
    index = default.lineno - 1
    line = lines[index].encode("utf-8")
    lines[index] = (line[:default.col_offset] + b'"open"' + line[default.end_col_offset:]).decode("utf-8")
    updated = "".join(lines)
    ast.parse(updated)
    path.with_suffix(path.suffix + ".before-open").write_text(source, encoding="utf-8")
    path.write_text(updated, encoding="utf-8")
    return True


def migrate_auto(database: Path, project: str) -> int:
    if not database.is_file():
        raise ValueError("БД не найдена; пустую БД создавать нельзя")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backups = database.parent / "backups"
    backups.mkdir(exist_ok=True)
    with closing(sqlite3.connect(database, timeout=30)) as connection:
        project_row = connection.execute("SELECT id FROM projects WHERE slug = ?", (project,)).fetchone()
        if not project_row:
            raise ValueError("Проект не найден")
        count = connection.execute(
            "SELECT count(*) FROM agents WHERE project_id = ? AND contact_policy = 'auto'",
            (project_row[0],),
        ).fetchone()[0]
        if not count:
            return 0
        backup = backups / f"before-contact-open-{stamp}.sqlite3"
        with closing(sqlite3.connect(backup)) as snapshot:
            connection.backup(snapshot)
        with connection:
            cursor = connection.execute(
                "UPDATE agents SET contact_policy = 'open' WHERE project_id = ? AND contact_policy = 'auto'",
                (project_row[0],),
            )
        print(f"Резервная копия: {backup}")
        return cursor.rowcount


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", type=Path, default=Path("/app/src/mcp_agent_mail/models.py"))
    parser.add_argument("--migrate-auto", action="store_true")
    parser.add_argument("--database", type=Path, default=Path("/data/storage.sqlite3"))
    parser.add_argument("--project", default="c-web-letar")
    args = parser.parse_args()
    changed = patch_model(args.models)
    print("Default open: " + ("патч применён" if changed else "уже установлен"))
    if args.migrate_auto:
        print(f"auto → open в {args.project}: {migrate_auto(args.database, args.project)}")


if __name__ == "__main__":
    main()
