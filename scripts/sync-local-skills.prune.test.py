"""Run: python3 scripts/sync-local-skills.prune.test.py  (R12: stale catalog lines are removed)."""
import importlib.util
import os
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("sync_local_skills", os.path.join(HERE, "sync-local-skills.py"))
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

CATALOG = """# Repo

## Skill Categories

**One**
- `alive` - still here
- `gone` - removed from the repo
- `container` - plugin container

## Other
- `gone` - a bullet outside the catalog section stays
"""


class PruneTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        sync.REPO = self.tmp
        os.makedirs(os.path.join(self.tmp, "alive"))
        open(os.path.join(self.tmp, "alive", "SKILL.md"), "w").write("x")
        os.makedirs(os.path.join(self.tmp, "container", "skills", "inner"))
        open(os.path.join(self.tmp, "container", "skills", "inner", "SKILL.md"), "w").write("x")

    def test_removes_only_missing_bullets_inside_the_section(self):
        out, removed = sync.doc_prune_missing(CATALOG)
        self.assertEqual(removed, ["gone"])
        self.assertNotIn("- `gone` - removed from the repo", out)
        self.assertIn("- `alive` - still here", out)
        self.assertIn("- `container` - plugin container", out)
        self.assertIn("- `gone` - a bullet outside the catalog section stays", out)

    def test_idempotent(self):
        once, _ = sync.doc_prune_missing(CATALOG)
        twice, removed = sync.doc_prune_missing(once)
        self.assertEqual(once, twice)
        self.assertEqual(removed, [])

    def test_repo_has_skill(self):
        self.assertTrue(sync.repo_has_skill("alive"))
        self.assertTrue(sync.repo_has_skill("container"))
        self.assertFalse(sync.repo_has_skill("gone"))


if __name__ == "__main__":
    unittest.main()
