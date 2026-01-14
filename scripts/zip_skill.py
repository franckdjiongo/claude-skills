#!/usr/bin/env python3
"""
Zip Skill - Creates a downloadable .zip file of a skill folder

Usage:
    python scripts/zip_skill.py <skill-name> [output-directory]

Example:
    python scripts/zip_skill.py power-automate-expert
    python scripts/zip_skill.py power-automate-expert ./dist
"""

import sys
import zipfile
from pathlib import Path


def zip_skill(skill_name: str, output_dir: str = None, base_path: Path = None) -> Path:
    """
    Zip a skill folder for easy download.

    Args:
        skill_name: Name of the skill folder (not full path)
        output_dir: Optional output directory for the .zip file
        base_path: Base path to look for skills (defaults to script's parent's parent)

    Returns:
        Path to the created .zip file, or None if error
    """
    # Determine base path (repository root)
    if base_path is None:
        base_path = Path(__file__).resolve().parent.parent

    skill_path = base_path / skill_name

    # Validate skill folder exists
    if not skill_path.exists():
        print(f"Error: Skill folder not found: {skill_path}")
        print(f"\nAvailable skills:")
        for d in sorted(base_path.iterdir()):
            if d.is_dir() and (d / "SKILL.md").exists():
                print(f"  - {d.name}")
        return None

    if not skill_path.is_dir():
        print(f"Error: Path is not a directory: {skill_path}")
        return None

    # Validate SKILL.md exists
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        print(f"Error: SKILL.md not found in {skill_path}")
        print("This doesn't appear to be a valid skill folder.")
        return None

    # Determine output location
    if output_dir:
        output_path = Path(output_dir).resolve()
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path = base_path / "dist"
        output_path.mkdir(parents=True, exist_ok=True)

    zip_filename = output_path / f"{skill_name}.zip"

    # Files/directories to exclude
    exclude_patterns = {'.git', '__pycache__', '.DS_Store', '*.pyc', '.env'}

    def should_exclude(path: Path) -> bool:
        """Check if a file should be excluded from the zip."""
        name = path.name
        for pattern in exclude_patterns:
            if pattern.startswith('*'):
                if name.endswith(pattern[1:]):
                    return True
            elif name == pattern:
                return True
        return False

    # Create the .zip file
    try:
        file_count = 0
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in skill_path.rglob('*'):
                if file_path.is_file() and not should_exclude(file_path):
                    # Store with skill folder as root
                    arcname = Path(skill_name) / file_path.relative_to(skill_path)
                    zipf.write(file_path, arcname)
                    print(f"  + {arcname}")
                    file_count += 1

        print(f"\nSuccessfully created: {zip_filename}")
        print(f"Files included: {file_count}")
        print(f"Size: {zip_filename.stat().st_size / 1024:.1f} KB")
        return zip_filename

    except Exception as e:
        print(f"Error creating zip file: {e}")
        return None


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/zip_skill.py <skill-name> [output-directory]")
        print("\nExample:")
        print("  python scripts/zip_skill.py power-automate-expert")
        print("  python scripts/zip_skill.py design-elevation ./my-downloads")
        sys.exit(1)

    skill_name = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Zipping skill: {skill_name}\n")

    result = zip_skill(skill_name, output_dir)

    if result:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
