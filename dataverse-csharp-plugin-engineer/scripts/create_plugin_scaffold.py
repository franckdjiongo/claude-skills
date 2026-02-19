#!/usr/bin/env python3
"""Create Dataverse plugin starter files from skill templates."""

from __future__ import annotations

import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
TEMPLATES_DIR = SKILL_ROOT / "assets" / "templates"


def render_template(template_path: Path, replacements: dict[str, str]) -> str:
    text = template_path.read_text(encoding="utf-8")
    for key, value in replacements.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, help="Folder where scaffold files will be created.")
    parser.add_argument("--namespace", required=True, help="C# namespace for generated classes.")
    parser.add_argument("--plugin-name", required=True, help="Main plugin class name.")
    parser.add_argument(
        "--custom-api-plugin-name",
        default="CustomApiHandlerPlugin",
        help="Custom API plugin class name.",
    )
    parser.add_argument(
        "--skip-pipelines",
        action="store_true",
        help="Skip CI/CD templates.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out = Path(args.output_dir).resolve()
    replacements = {
        "NAMESPACE": args.namespace,
        "PLUGIN_NAME": args.plugin_name,
        "CUSTOM_API_PLUGIN_NAME": args.custom_api_plugin_name,
    }

    plugin_cs = render_template(TEMPLATES_DIR / "canonical-plugin.cs.tpl", replacements)
    custom_api_cs = render_template(TEMPLATES_DIR / "custom-api-plugin.cs.tpl", replacements)
    test_cs = render_template(TEMPLATES_DIR / "fake-xrmeasy-tests.cs.tpl", replacements)

    write_file(out / "src" / f"{args.plugin_name}.cs", plugin_cs)
    write_file(out / "src" / f"{args.custom_api_plugin_name}.cs", custom_api_cs)
    write_file(out / "tests" / f"{args.plugin_name}Tests.cs", test_cs)

    if not args.skip_pipelines:
        github_actions = render_template(TEMPLATES_DIR / "github-actions-plugin.yml.tpl", replacements)
        azure_devops = render_template(TEMPLATES_DIR / "azure-devops-plugin.yml.tpl", replacements)
        write_file(out / ".github" / "workflows" / "plugin-ci.yml", github_actions)
        write_file(out / "pipelines" / "azure-devops-plugin.yml", azure_devops)

    print(f"Plugin scaffold written to: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
