#!/usr/bin/env python3

import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "sync_solution.py"


def solution_xml(name: str, version: str = "1.0.0.2") -> str:
    return f"""<ImportExportXml><SolutionManifest><UniqueName>{name}</UniqueName><Version>{version}</Version><Managed>0</Managed></SolutionManifest></ImportExportXml>"""


class SyncSolutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        self.artifact = self.root / "artifact"
        self.stage_root = self.root / "stages"
        (self.project / "LocalSolution" / "flows").mkdir(parents=True)
        (self.artifact / "Workflows").mkdir(parents=True)
        (self.artifact / "Connector").mkdir(parents=True)
        (self.project / "LocalSolution" / "solution.xml").write_text(
            solution_xml("Sample", "1.0.0.1"), encoding="utf-8"
        )
        (self.project / "LocalSolution" / "customizations.xml").write_text(
            "old", encoding="utf-8"
        )
        (self.project / "LocalSolution" / "flows" / "obsolete.json").write_text(
            "{}", encoding="utf-8"
        )
        (self.project / "LocalSolution" / "old_openapidefinition.json").write_text(
            "{}", encoding="utf-8"
        )
        (self.artifact / "solution.xml").write_text(
            solution_xml("Sample"), encoding="utf-8"
        )
        (self.artifact / "customizations.xml").write_text("new", encoding="utf-8")
        (self.artifact / "Workflows" / "current.json").write_text(
            '{"ok":true}', encoding="utf-8"
        )
        (self.artifact / "Connector" / "new_openapidefinition.json").write_text(
            '{"openapi":"3.0.0"}', encoding="utf-8"
        )
        config = {
            "version": 1,
            "solutions": {
                "Sample": {
                    "target": "LocalSolution",
                    "expectedEnvironmentUrl": "https://example.invalid/",
                    "packageType": "Unmanaged",
                    "mappings": [
                        {"type": "file", "source": "solution.xml", "target": "solution.xml"},
                        {"type": "file", "source": "customizations.xml", "target": "customizations.xml"},
                        {"type": "directory", "source": "Workflows", "target": "flows"},
                        {
                            "type": "flatten",
                            "source": "Connector",
                            "target": ".",
                            "patterns": ["*_openapidefinition.json"],
                        },
                    ],
                }
            },
            "postSync": [],
            "validation": [],
        }
        (self.project / ".pp-solution-sync.json").write_text(
            json.dumps(config), encoding="utf-8"
        )
        subprocess.run(["git", "init", "-q"], cwd=self.project, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=self.project, check=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=self.project, check=True)
        subprocess.run(["git", "add", "."], cwd=self.project, check=True)
        subprocess.run(["git", "commit", "-qm", "fixture"], cwd=self.project, check=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def run_script(self, *args: str, expected: int = 0) -> subprocess.CompletedProcess[str]:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(expected, result.returncode, result.stderr or result.stdout)
        return result

    def prepare(self, *extra: str) -> dict:
        result = self.run_script(
            "prepare",
            "--project-root",
            str(self.project),
            "--solution",
            "Sample",
            "--artifact",
            str(self.artifact),
            "--stage-root",
            str(self.stage_root),
            *extra,
        )
        return json.loads(result.stdout)

    def test_plan_apply_idempotence_and_cleanup(self) -> None:
        plan = self.prepare()
        self.assertEqual(
            {"add": 2, "modify": 2, "delete": 2, "unchanged": 0, "ignored": 0},
            plan["summary"],
        )
        self.run_script("apply", "--plan", plan["plan"])
        solution_root = self.project / "LocalSolution"
        self.assertFalse((solution_root / "flows" / "obsolete.json").exists())
        self.assertFalse((solution_root / "old_openapidefinition.json").exists())
        self.assertEqual("new", (solution_root / "customizations.xml").read_text())
        self.assertTrue((solution_root / "flows" / "current.json").is_file())

        second_plan = self.prepare("--allow-dirty")
        self.assertEqual(0, sum(second_plan["summary"][key] for key in ("add", "modify", "delete")))
        second_stage = Path(second_plan["stage"])
        self.run_script("cleanup", "--plan", second_plan["plan"])
        self.assertFalse(second_stage.exists())

        first_stage = Path(plan["stage"])
        self.run_script("cleanup", "--plan", plan["plan"])
        self.assertFalse(first_stage.exists())

    def test_refuses_dirty_worktree_without_override(self) -> None:
        (self.project / "unrelated.txt").write_text("dirty", encoding="utf-8")
        result = self.run_script(
            "prepare",
            "--project-root",
            str(self.project),
            "--solution",
            "Sample",
            "--artifact",
            str(self.artifact),
            expected=2,
        )
        self.assertIn("Worktree sale", result.stderr)

    def test_refuses_wrong_solution(self) -> None:
        (self.artifact / "solution.xml").write_text(
            solution_xml("Other"), encoding="utf-8"
        )
        result = self.run_script(
            "prepare",
            "--project-root",
            str(self.project),
            "--solution",
            "Sample",
            "--artifact",
            str(self.artifact),
            "--stage-root",
            str(self.stage_root),
            expected=2,
        )
        self.assertIn("Nom unique inattendu", result.stderr)


if __name__ == "__main__":
    unittest.main()
