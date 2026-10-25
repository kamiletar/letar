"""Проверки патча на изолированных файлах, без рабочего Agent Mail."""

from pathlib import Path
from contextlib import closing
import sqlite3
import tempfile
import unittest

from open_contact_default import migrate_auto, patch_model


class ContactDefaultTests(unittest.TestCase):
    def test_default_changes_only_contact_policy_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            model = Path(folder) / "models.py"
            model.write_text('class Agent:\n    attachments_policy: str = Field(default="auto")\n    contact_policy: str = Field(default="auto")\n', encoding="utf-8")
            self.assertTrue(patch_model(model))
            self.assertFalse(patch_model(model))
            source = model.read_text(encoding="utf-8")
            self.assertIn('attachments_policy: str = Field(default="auto")', source)
            self.assertIn('contact_policy: str = Field(default="open")', source)

    def test_unknown_upstream_default_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            model = Path(folder) / "models.py"
            source = 'class Agent:\n    contact_policy: str = Field(default="contacts_only")\n'
            model.write_text(source, encoding="utf-8")
            with self.assertRaises(ValueError):
                patch_model(model)
            self.assertEqual(model.read_text(encoding="utf-8"), source)

    def test_migration_preserves_other_projects_and_explicit_policies(self):
        with tempfile.TemporaryDirectory() as folder:
            database = Path(folder) / "storage.sqlite3"
            with closing(sqlite3.connect(database)) as db:
                db.executescript("CREATE TABLE projects(id INTEGER, slug TEXT); CREATE TABLE agents(id INTEGER, project_id INTEGER, contact_policy TEXT); INSERT INTO projects VALUES(1, 'c-web-letar'), (2, 'other'); INSERT INTO agents VALUES(1,1,'auto'), (2,1,'open'), (3,1,'block_all'), (4,1,'contacts_only'), (5,2,'auto');")
            self.assertEqual(migrate_auto(database, "c-web-letar"), 1)
            self.assertEqual(migrate_auto(database, "c-web-letar"), 0)
            with closing(sqlite3.connect(database)) as db:
                self.assertEqual(db.execute("SELECT contact_policy FROM agents ORDER BY id").fetchall(), [("open",), ("open",), ("block_all",), ("contacts_only",), ("auto",)])
            backup = next((database.parent / "backups").glob("*.sqlite3"))
            with closing(sqlite3.connect(backup)) as db:
                self.assertEqual(db.execute("SELECT contact_policy FROM agents WHERE id=1").fetchone()[0], "auto")


if __name__ == "__main__":
    unittest.main()
