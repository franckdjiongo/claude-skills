#!/usr/bin/env python3
"""Safely export, plan, apply, and clean up Power Platform solution syncs."""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tempfile
from typing import Any, Iterable
import xml.etree.ElementTree as ET
import zipfile


CONFIG_NAME = ".pp-solution-sync.json"
PLAN_NAME = "plan.json"
SENTINEL_NAME = ".pp-solution-sync-stage"
SCHEMA_VERSION = 1


class SyncError(RuntimeError):
    pass


def fail(message: str) -> None:
    raise SyncError(message)


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def sha256_file(path: Path) -> str | None:
    if not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_relative_path(raw_path: str) -> PurePosixPath:
    normalized = raw_path.replace("\\", "/").lstrip("./")
    path = PurePosixPath(normalized)
    if not normalized or path.is_absolute() or ".." in path.parts:
        fail(f"Chemin non sécuritaire dans l'artefact: {raw_path}")
    return path


def safe_target(project_root: Path, relative: str) -> Path:
    if relative in ("", "."):
        return project_root.resolve()
    rel_path = safe_relative_path(relative)
    target = (project_root / Path(*rel_path.parts)).resolve()
    try:
        target.relative_to(project_root.resolve())
    except ValueError:
        fail(f"Cible hors du projet: {relative}")
    return target


class Artifact:
    def names(self) -> list[str]:
        raise NotImplementedError

    def read(self, name: str) -> bytes:
        raise NotImplementedError


class DirectoryArtifact(Artifact):
    def __init__(self, root: Path):
        self.root = root.resolve()
        if not self.root.is_dir():
            fail(f"Dossier d'artefact introuvable: {root}")

    def names(self) -> list[str]:
        names: list[str] = []
        for path in self.root.rglob("*"):
            if path.is_symlink():
                fail(f"Lien symbolique interdit dans l'artefact: {path}")
            if path.is_file():
                names.append(path.relative_to(self.root).as_posix())
        return sorted(names)

    def read(self, name: str) -> bytes:
        rel = safe_relative_path(name)
        path = (self.root / Path(*rel.parts)).resolve()
        try:
            path.relative_to(self.root)
        except ValueError:
            fail(f"Lecture hors artefact: {name}")
        return path.read_bytes()


class ZipArtifact(Artifact):
    def __init__(self, path: Path):
        self.path = path.resolve()
        if not self.path.is_file():
            fail(f"ZIP d'artefact introuvable: {path}")
        try:
            with zipfile.ZipFile(self.path) as archive:
                for info in archive.infolist():
                    if info.is_dir():
                        continue
                    safe_relative_path(info.filename)
                    mode = info.external_attr >> 16
                    if stat.S_ISLNK(mode):
                        fail(f"Lien symbolique interdit dans le ZIP: {info.filename}")
        except zipfile.BadZipFile as error:
            fail(f"ZIP invalide: {error}")

    def names(self) -> list[str]:
        with zipfile.ZipFile(self.path) as archive:
            return sorted(
                safe_relative_path(info.filename).as_posix()
                for info in archive.infolist()
                if not info.is_dir()
            )

    def read(self, name: str) -> bytes:
        with zipfile.ZipFile(self.path) as archive:
            return archive.read(name)


def load_config(project_root: Path) -> dict[str, Any]:
    config_path = project_root / CONFIG_NAME
    if not config_path.is_file():
        fail(f"Manifeste absent: {config_path}")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Manifeste invalide: {error}")
    if config.get("version") != SCHEMA_VERSION:
        fail(f"Version de manifeste non prise en charge: {config.get('version')}")
    return config


def solution_config(config: dict[str, Any], solution_name: str) -> dict[str, Any]:
    solution = config.get("solutions", {}).get(solution_name)
    if not isinstance(solution, dict):
        fail(f"Solution absente du manifeste: {solution_name}")
    if solution.get("packageType") != "Unmanaged":
        fail("Seules les solutions Unmanaged sont autorisées")
    if not isinstance(solution.get("mappings"), list) or not solution["mappings"]:
        fail(f"Aucun mapping déclaré pour {solution_name}")
    return solution


def ensure_git_state(project_root: Path, allow_dirty: bool) -> list[str]:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=project_root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        fail(f"Impossible de lire l'état Git: {result.stderr.strip()}")
    dirty = [line for line in result.stdout.splitlines() if line.strip()]
    if dirty and not allow_dirty:
        fail("Worktree sale. Valider les changements existants ou utiliser --allow-dirty après autorisation explicite.")
    return dirty


def active_environment_matches(expected_url: str) -> None:
    result = subprocess.run(
        ["pac", "auth", "list"], text=True, capture_output=True, check=False
    )
    if result.returncode != 0:
        fail(f"PAC auth list a échoué: {result.stderr.strip()}")
    normalized = expected_url.rstrip("/").lower()
    active_lines = [line for line in result.stdout.splitlines() if "*" in line]
    if not any(normalized in line.rstrip("/").lower() for line in active_lines):
        fail(f"Le profil PAC actif ne correspond pas à l'environnement attendu: {expected_url}")


def export_solution(stage: Path, solution_name: str, expected_url: str) -> Path:
    if not expected_url:
        fail("expectedEnvironmentUrl est obligatoire en mode PAC direct")
    active_environment_matches(expected_url)
    zip_path = stage / f"{solution_name}.zip"
    command = [
        "pac",
        "solution",
        "export",
        "--environment",
        expected_url,
        "--name",
        solution_name,
        "--path",
        str(zip_path),
        "--overwrite",
    ]
    result = subprocess.run(command, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        fail(f"Export PAC échoué: {detail}")
    if not zip_path.is_file():
        fail(f"PAC n'a pas produit le ZIP attendu: {zip_path}")
    return zip_path


def parse_solution_manifest(content: bytes) -> tuple[str, str, str]:
    try:
        root = ET.fromstring(content)
    except ET.ParseError as error:
        fail(f"solution.xml invalide: {error}")
    manifest = root.find("./SolutionManifest")
    if manifest is None:
        fail("SolutionManifest absent de solution.xml")
    unique_name = manifest.findtext("UniqueName", default="").strip()
    version = manifest.findtext("Version", default="").strip()
    managed = manifest.findtext("Managed", default="").strip()
    if not unique_name or not version:
        fail("Nom unique ou version absent de solution.xml")
    return unique_name, version, managed


def local_solution_version(project_root: Path, target_dir: str) -> str | None:
    solution_xml = safe_target(project_root, f"{target_dir}/solution.xml")
    if not solution_xml.is_file():
        return None
    _, version, _ = parse_solution_manifest(solution_xml.read_bytes())
    return version


def mapping_files(
    artifact_names: list[str], mapping: dict[str, Any]
) -> tuple[dict[str, str], set[str]]:
    mapping_type = mapping.get("type")
    source = safe_relative_path(str(mapping.get("source", ""))).as_posix()
    target = str(mapping.get("target", ""))
    selected: dict[str, str] = {}
    managed_targets: set[str] = set()

    if mapping_type == "file":
        if source not in artifact_names:
            fail(f"Fichier obligatoire absent de l'artefact: {source}")
        selected[target] = source
        managed_targets.add(target)
        return selected, managed_targets

    prefix = source.rstrip("/") + "/"
    source_files = [name for name in artifact_names if name.startswith(prefix)]

    if mapping_type == "directory":
        for name in source_files:
            relative = name[len(prefix) :]
            if relative and Path(relative).name != ".DS_Store":
                destination = PurePosixPath(target, relative).as_posix()
                selected[destination] = name
        return selected, managed_targets

    if mapping_type == "flatten":
        patterns = mapping.get("patterns")
        if not isinstance(patterns, list) or not patterns:
            fail(f"Patterns absents du mapping flatten: {source}")
        for name in source_files:
            basename = PurePosixPath(name).name
            if any(fnmatch.fnmatch(basename, pattern) for pattern in patterns):
                destination = PurePosixPath(target, basename).as_posix()
                if destination in selected:
                    fail(f"Collision de fichiers aplatis: {destination}")
                selected[destination] = name
        return selected, managed_targets

    fail(f"Type de mapping inconnu: {mapping_type}")


def existing_managed_files(project_root: Path, mapping: dict[str, Any]) -> set[str]:
    mapping_type = mapping["type"]
    target = str(mapping["target"])
    if mapping_type == "file":
        return {target} if safe_target(project_root, target).is_file() else set()

    target_root = safe_target(project_root, target)
    if not target_root.exists():
        return set()

    if mapping_type == "directory":
        return {
            path.relative_to(project_root).as_posix()
            for path in target_root.rglob("*")
            if path.is_file() and path.name != ".DS_Store"
        }

    patterns = mapping["patterns"]
    return {
        path.relative_to(project_root).as_posix()
        for path in target_root.iterdir()
        if path.is_file() and any(fnmatch.fnmatch(path.name, pattern) for pattern in patterns)
    }


def create_plan(
    project_root: Path,
    solution_name: str,
    solution: dict[str, Any],
    artifact: Artifact,
    stage: Path,
    dirty_before: list[str],
) -> Path:
    artifact_names = artifact.names()
    if "solution.xml" not in artifact_names:
        fail("solution.xml absent de l'artefact")
    unique_name, exported_version, managed = parse_solution_manifest(artifact.read("solution.xml"))
    if unique_name != solution_name:
        fail(f"Nom unique inattendu: {unique_name}; attendu: {solution_name}")
    if managed not in ("", "0"):
        fail(f"L'artefact {solution_name} est managed")

    target_dir = str(solution["target"])
    payload_root = stage / "payload"
    payload_root.mkdir()
    selected_sources: set[str] = set()
    desired: dict[str, str] = {}
    managed_existing: set[str] = set()

    for mapping in solution["mappings"]:
        selected, _ = mapping_files(artifact_names, mapping)
        for destination, source in selected.items():
            full_destination = PurePosixPath(target_dir, destination).as_posix()
            if full_destination in desired:
                fail(f"Cible déclarée deux fois: {full_destination}")
            desired[full_destination] = source
            selected_sources.add(source)
        for existing in existing_managed_files(
            safe_target(project_root, target_dir), mapping
        ):
            managed_existing.add(PurePosixPath(target_dir, existing).as_posix())

    changes: list[dict[str, Any]] = []
    for destination, source in sorted(desired.items()):
        content = artifact.read(source)
        payload_path = payload_root / Path(*safe_relative_path(destination).parts)
        payload_path.parent.mkdir(parents=True, exist_ok=True)
        payload_path.write_bytes(content)
        current_hash = sha256_file(safe_target(project_root, destination))
        desired_hash = sha256_bytes(content)
        if current_hash == desired_hash:
            continue
        changes.append(
            {
                "operation": "add" if current_hash is None else "modify",
                "path": destination,
                "baselineHash": current_hash,
                "desiredHash": desired_hash,
            }
        )

    for destination in sorted(managed_existing - set(desired)):
        target_path = safe_target(project_root, destination)
        changes.append(
            {
                "operation": "delete",
                "path": destination,
                "baselineHash": sha256_file(target_path),
                "desiredHash": None,
            }
        )

    ignored = sorted(set(artifact_names) - selected_sources)
    summary = {
        "add": sum(change["operation"] == "add" for change in changes),
        "modify": sum(change["operation"] == "modify" for change in changes),
        "delete": sum(change["operation"] == "delete" for change in changes),
        "unchanged": len(desired) - sum(change["operation"] in ("add", "modify") for change in changes),
        "ignored": len(ignored),
    }
    plan = {
        "schemaVersion": SCHEMA_VERSION,
        "projectRoot": str(project_root),
        "stage": str(stage),
        "solution": solution_name,
        "environmentUrl": solution.get("expectedEnvironmentUrl"),
        "localVersion": local_solution_version(project_root, target_dir),
        "exportedVersion": exported_version,
        "dirtyBefore": dirty_before,
        "changes": changes,
        "ignoredSample": ignored[:50],
        "summary": summary,
    }
    plan_path = stage / PLAN_NAME
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return plan_path


def load_plan(plan_path: Path) -> dict[str, Any]:
    try:
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"Plan invalide: {error}")
    if plan.get("schemaVersion") != SCHEMA_VERSION:
        fail("Version de plan non prise en charge")
    stage = Path(plan["stage"]).resolve()
    if not (stage / SENTINEL_NAME).is_file() or plan_path.resolve().parent != stage:
        fail("Dossier temporaire non reconnu")
    return plan


def apply_plan(plan_path: Path) -> dict[str, Any]:
    plan = load_plan(plan_path)
    project_root = Path(plan["projectRoot"]).resolve()
    stage = Path(plan["stage"]).resolve()

    for change in plan["changes"]:
        current_hash = sha256_file(safe_target(project_root, change["path"]))
        if current_hash != change["baselineHash"]:
            fail(f"La cible a changé depuis le plan: {change['path']}")

    for change in plan["changes"]:
        target = safe_target(project_root, change["path"])
        if change["operation"] == "delete":
            target.unlink()
            continue
        payload = stage / "payload" / Path(*safe_relative_path(change["path"]).parts)
        if sha256_file(payload) != change["desiredHash"]:
            fail(f"Payload altéré: {change['path']}")
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(f".{target.name}.pp-sync-tmp")
        shutil.copy2(payload, temporary)
        os.replace(temporary, target)

    return {"applied": len(plan["changes"]), "summary": plan["summary"]}


def cleanup_plan(plan_path: Path) -> dict[str, Any]:
    plan = load_plan(plan_path)
    stage = Path(plan["stage"]).resolve()
    shutil.rmtree(stage)
    return {"cleaned": str(stage)}


def prepare(args: argparse.Namespace) -> dict[str, Any]:
    project_root = Path(args.project_root).resolve()
    if not project_root.is_dir():
        fail(f"Projet introuvable: {project_root}")
    config = load_config(project_root)
    solution = solution_config(config, args.solution)
    dirty_before = ensure_git_state(project_root, args.allow_dirty)
    stage_parent = Path(args.stage_root).resolve() if args.stage_root else None
    if stage_parent:
        stage_parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix="pp-solution-sync-", dir=stage_parent))
    (stage / SENTINEL_NAME).write_text("created-by=pp-solution-sync\n", encoding="utf-8")
    try:
        artifact_path = Path(args.artifact).expanduser().resolve() if args.artifact else None
        if artifact_path is None:
            artifact_path = export_solution(
                stage, args.solution, str(solution.get("expectedEnvironmentUrl", ""))
            )
        artifact: Artifact = (
            DirectoryArtifact(artifact_path)
            if artifact_path.is_dir()
            else ZipArtifact(artifact_path)
        )
        plan_path = create_plan(
            project_root, args.solution, solution, artifact, stage, dirty_before
        )
        plan = load_plan(plan_path)
        return {"plan": str(plan_path), **plan}
    except Exception:
        # Preserve PAC exports for diagnosis, but discard empty staging failures.
        if not any(stage.iterdir()):
            shutil.rmtree(stage, ignore_errors=True)
        raise


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare_parser = subparsers.add_parser("prepare")
    prepare_parser.add_argument("--project-root", required=True)
    prepare_parser.add_argument("--solution", required=True)
    prepare_parser.add_argument("--artifact")
    prepare_parser.add_argument("--allow-dirty", action="store_true")
    prepare_parser.add_argument("--stage-root")

    apply_parser = subparsers.add_parser("apply")
    apply_parser.add_argument("--plan", required=True)

    cleanup_parser = subparsers.add_parser("cleanup")
    cleanup_parser.add_argument("--plan", required=True)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "prepare":
            result = prepare(args)
        elif args.command == "apply":
            result = apply_plan(Path(args.plan).resolve())
        else:
            result = cleanup_plan(Path(args.plan).resolve())
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except SyncError as error:
        print(f"ERREUR: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
