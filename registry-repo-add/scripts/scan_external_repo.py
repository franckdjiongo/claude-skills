#!/usr/bin/env python3
"""
Scan External Repository for Skills

Generates a YAML snippet for adding an external repository to the skills registry.
Requires the repository to be cloned locally for scanning.

Usage:
    python scan_external_repo.py <local-path> <github-url> [--skills-path PATH]

Examples:
    python scan_external_repo.py ~/repos/superpowers https://github.com/obra/superpowers --skills-path skills/
    python scan_external_repo.py ~/repos/ai-skills https://github.com/example/ai-skills

Output:
    Prints YAML snippets to add to skills-registry.yaml
"""

import argparse
import os
import re
import sys
from pathlib import Path


def extract_skill_info(skill_path: Path) -> dict:
    """Extract name and description from SKILL.md frontmatter."""
    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        return None

    content = skill_md.read_text(encoding='utf-8')

    # Extract YAML frontmatter
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not frontmatter_match:
        return {"name": skill_path.name, "description": "No description available"}

    frontmatter = frontmatter_match.group(1)

    # Extract name
    name_match = re.search(r'^name:\s*(.+)$', frontmatter, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else skill_path.name

    # Extract description (handle multi-line)
    desc_match = re.search(r'^description:\s*>-?\s*\n((?:\s+.+\n?)+)', frontmatter, re.MULTILINE)
    if desc_match:
        description = ' '.join(line.strip() for line in desc_match.group(1).strip().split('\n'))
    else:
        desc_match = re.search(r'^description:\s*(.+)$', frontmatter, re.MULTILINE)
        description = desc_match.group(1).strip().strip('"\'') if desc_match else "No description"

    # Truncate long descriptions
    if len(description) > 100:
        description = description[:97] + "..."

    return {"name": name, "description": description}


def scan_repository(local_path: Path, github_url: str, skills_path: str = "") -> dict:
    """Scan a local repository for skills."""

    # Parse GitHub URL
    match = re.search(r'github\.com[/:]([^/]+)/([^/\.]+)', github_url)
    if not match:
        print(f"Error: Could not parse GitHub URL: {github_url}", file=sys.stderr)
        sys.exit(1)

    owner, repo_name = match.groups()
    repo_id = repo_name.lower().replace('-', '_').replace(' ', '_')

    # Find skills directory
    if skills_path:
        skills_dir = local_path / skills_path.strip('/')
    else:
        # Try common locations
        for candidate in ['skills', 'src/skills', '.']:
            if (local_path / candidate).exists():
                skills_dir = local_path / candidate
                skills_path = candidate + '/' if candidate != '.' else ''
                break
        else:
            skills_dir = local_path
            skills_path = ''

    if not skills_dir.exists():
        print(f"Error: Skills directory not found: {skills_dir}", file=sys.stderr)
        sys.exit(1)

    # Scan for SKILL.md files
    skills = []
    for item in sorted(skills_dir.iterdir()):
        if item.is_dir() and (item / "SKILL.md").exists():
            info = extract_skill_info(item)
            if info:
                info['dir_name'] = item.name
                skills.append(info)

    return {
        'owner': owner,
        'repo_name': repo_name,
        'repo_id': repo_id,
        'github_url': github_url,
        'skills_path': skills_path,
        'skills': skills
    }


def generate_yaml_snippets(data: dict) -> str:
    """Generate YAML snippets for the registry."""
    output = []

    # Repository entry
    output.append("# === ADD TO repositories: ===\n")
    output.append(f"  {data['repo_id']}:")
    output.append(f"    url: {data['github_url']}")
    output.append(f"    local_path: null")
    output.append(f"    description: Skills from {data['owner']}/{data['repo_name']}")
    output.append(f"    is_local: false")
    if data['skills_path']:
        output.append(f"    skills_path: {data['skills_path']}")
    output.append("")

    # Category entry
    output.append("\n# === ADD TO categories: ===\n")
    output.append(f"  {data['repo_id']}-skills:")
    output.append(f"    name: \"{data['repo_name'].title()}: Skills\"")
    output.append(f"    skills:")

    for skill in data['skills']:
        path = f"{data['skills_path']}{skill['dir_name']}/SKILL.md" if data['skills_path'] else f"{skill['dir_name']}/SKILL.md"
        url = f"{data['github_url']}/tree/main/{data['skills_path']}{skill['dir_name']}" if data['skills_path'] else f"{data['github_url']}/tree/main/{skill['dir_name']}"

        output.append(f"      - name: {skill['name']}")
        output.append(f"        repository: {data['repo_id']}")
        output.append(f"        path: {path}")
        output.append(f"        description: {skill['description']}")
        output.append(f"        tags: []  # TODO: Add relevant tags")
        output.append(f"        external_url: {url}")
        output.append("")

    # Index entries
    output.append("\n# === ADD TO skill_index: ===\n")
    output.append(f"  # External skills ({data['repo_id']})")
    for skill in data['skills']:
        output.append(f"  {skill['name']}: {{ repo: {data['repo_id']}, category: {data['repo_id']}-skills }}")

    return '\n'.join(output)


def main():
    parser = argparse.ArgumentParser(
        description="Scan external repository for skills and generate registry YAML"
    )
    parser.add_argument('local_path', help='Local path to the cloned repository')
    parser.add_argument('github_url', help='GitHub URL of the repository')
    parser.add_argument('--skills-path', default='', help='Path to skills directory within repo (e.g., "skills/")')

    args = parser.parse_args()

    local_path = Path(args.local_path).expanduser().resolve()
    if not local_path.exists():
        print(f"Error: Path does not exist: {local_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning repository: {local_path}")
    print(f"GitHub URL: {args.github_url}")
    print(f"Skills path: {args.skills_path or '(auto-detect)'}")
    print("-" * 60)

    data = scan_repository(local_path, args.github_url, args.skills_path)

    print(f"\nFound {len(data['skills'])} skills:")
    for skill in data['skills']:
        print(f"  - {skill['name']}: {skill['description'][:50]}...")

    print("\n" + "=" * 60)
    print("YAML SNIPPETS FOR skills-registry.yaml")
    print("=" * 60 + "\n")

    print(generate_yaml_snippets(data))


if __name__ == '__main__':
    main()
