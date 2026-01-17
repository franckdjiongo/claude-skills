#!/usr/bin/env python3
"""
Skills Registry Manager

A CLI tool to manage and search the multi-repository skills registry.

Usage:
    python scripts/registry-manager.py list              # List all skills
    python scripts/registry-manager.py search <query>    # Search skills
    python scripts/registry-manager.py categories        # List categories
    python scripts/registry-manager.py repos             # List repositories
    python scripts/registry-manager.py info <skill>      # Get skill details
    python scripts/registry-manager.py scan              # Scan local repo and update registry
    python scripts/registry-manager.py add-repo <url>    # Add a new external repository

Examples:
    python scripts/registry-manager.py search tdd
    python scripts/registry-manager.py search "power automate"
    python scripts/registry-manager.py info test-driven-development
    python scripts/registry-manager.py list --repo superpowers
    python scripts/registry-manager.py list --category development
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Optional

try:
    import yaml
except ImportError:
    print("PyYAML not installed. Install with: pip install pyyaml")
    print("Falling back to basic parsing...")
    yaml = None


SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
REGISTRY_FILE = REPO_ROOT / "skills-registry.yaml"


def load_registry() -> dict:
    """Load the skills registry from YAML file."""
    if not REGISTRY_FILE.exists():
        print(f"Error: Registry file not found at {REGISTRY_FILE}")
        sys.exit(1)

    with open(REGISTRY_FILE, 'r', encoding='utf-8') as f:
        if yaml:
            return yaml.safe_load(f)
        else:
            # Basic fallback - just return raw content for display
            return {"_raw": f.read()}


def save_registry(data: dict) -> None:
    """Save the registry to YAML file."""
    if not yaml:
        print("Error: PyYAML required for saving. Install with: pip install pyyaml")
        sys.exit(1)

    with open(REGISTRY_FILE, 'w', encoding='utf-8') as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)


def get_all_skills(registry: dict) -> list:
    """Extract all skills from the registry."""
    skills = []
    categories = registry.get('categories', {})

    for cat_id, cat_data in categories.items():
        cat_name = cat_data.get('name', cat_id)
        for skill in cat_data.get('skills', []):
            skill['category_id'] = cat_id
            skill['category_name'] = cat_name
            skills.append(skill)

    return skills


def cmd_list(args, registry: dict) -> None:
    """List all skills, optionally filtered by repo or category."""
    skills = get_all_skills(registry)

    # Apply filters
    if args.repo:
        skills = [s for s in skills if s.get('repository') == args.repo]
    if args.category:
        skills = [s for s in skills if s.get('category_id') == args.category]

    if not skills:
        print("No skills found matching the criteria.")
        return

    # Group by category for display
    by_category = {}
    for skill in skills:
        cat = skill['category_name']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(skill)

    for cat_name, cat_skills in by_category.items():
        print(f"\n{'='*60}")
        print(f"  {cat_name}")
        print(f"{'='*60}")
        for skill in cat_skills:
            repo = skill.get('repository', 'unknown')
            is_external = repo != 'claude-skills'
            marker = " [EXT]" if is_external else ""
            print(f"  - {skill['name']}{marker}")
            print(f"    {skill.get('description', 'No description')}")
            if is_external and skill.get('external_url'):
                print(f"    URL: {skill['external_url']}")

    print(f"\nTotal: {len(skills)} skills")


def cmd_search(args, registry: dict) -> None:
    """Search skills by name, description, or tags."""
    query = args.query.lower()
    skills = get_all_skills(registry)

    results = []
    for skill in skills:
        # Search in name, description, and tags
        name = skill.get('name', '').lower()
        desc = skill.get('description', '').lower()
        tags = ' '.join(skill.get('tags', [])).lower()

        if query in name or query in desc or query in tags:
            results.append(skill)

    if not results:
        print(f"No skills found matching '{args.query}'")
        return

    print(f"\nFound {len(results)} skill(s) matching '{args.query}':\n")
    for skill in results:
        repo = skill.get('repository', 'unknown')
        is_external = repo != 'claude-skills'
        marker = " [EXTERNAL]" if is_external else " [LOCAL]"

        print(f"  {skill['name']}{marker}")
        print(f"    Repository: {repo}")
        print(f"    Category: {skill.get('category_name', 'Unknown')}")
        print(f"    Description: {skill.get('description', 'No description')}")
        if skill.get('tags'):
            print(f"    Tags: {', '.join(skill['tags'])}")
        if is_external and skill.get('external_url'):
            print(f"    URL: {skill['external_url']}")
        print()


def cmd_categories(args, registry: dict) -> None:
    """List all categories."""
    categories = registry.get('categories', {})

    print("\nSkill Categories:\n")
    for cat_id, cat_data in categories.items():
        skill_count = len(cat_data.get('skills', []))
        print(f"  {cat_id}")
        print(f"    Name: {cat_data.get('name', cat_id)}")
        print(f"    Skills: {skill_count}")
        print()


def cmd_repos(args, registry: dict) -> None:
    """List all repositories."""
    repos = registry.get('repositories', {})

    print("\nRegistered Repositories:\n")
    for repo_id, repo_data in repos.items():
        is_local = repo_data.get('is_local', False)
        status = "LOCAL" if is_local else "EXTERNAL"

        print(f"  {repo_id} [{status}]")
        print(f"    URL: {repo_data.get('url', 'N/A')}")
        print(f"    Description: {repo_data.get('description', 'No description')}")
        if repo_data.get('local_path'):
            print(f"    Local Path: {repo_data['local_path']}")
        print()


def cmd_info(args, registry: dict) -> None:
    """Get detailed info about a specific skill."""
    skill_name = args.skill_name.lower()
    skills = get_all_skills(registry)

    skill = None
    for s in skills:
        if s.get('name', '').lower() == skill_name:
            skill = s
            break

    if not skill:
        print(f"Skill '{args.skill_name}' not found.")
        print("\nDid you mean one of these?")
        # Suggest similar skills
        suggestions = [s['name'] for s in skills if skill_name in s.get('name', '').lower()][:5]
        for sug in suggestions:
            print(f"  - {sug}")
        return

    repo = skill.get('repository', 'unknown')
    is_external = repo != 'claude-skills'

    print(f"\n{'='*60}")
    print(f"  Skill: {skill['name']}")
    print(f"{'='*60}")
    print(f"  Repository:  {repo} ({'EXTERNAL' if is_external else 'LOCAL'})")
    print(f"  Category:    {skill.get('category_name', 'Unknown')}")
    print(f"  Path:        {skill.get('path', 'N/A')}")
    print(f"  Description: {skill.get('description', 'No description')}")

    if skill.get('tags'):
        print(f"  Tags:        {', '.join(skill['tags'])}")

    if is_external:
        if skill.get('external_url'):
            print(f"\n  GitHub URL: {skill['external_url']}")
        print(f"\n  To use this skill, visit the repository or clone it locally.")
    else:
        skill_path = REPO_ROOT / skill.get('path', '')
        if skill_path.exists():
            print(f"\n  Local file: {skill_path}")
        print(f"\n  To use: Reference the skill in your Claude Code session.")
    print()


def cmd_scan(args, registry: dict) -> None:
    """Scan local repo for SKILL.md files and update registry."""
    print("Scanning local repository for skills...")

    skill_files = list(REPO_ROOT.glob("*/SKILL.md"))
    print(f"Found {len(skill_files)} SKILL.md files")

    existing_skills = set()
    for cat_data in registry.get('categories', {}).values():
        for skill in cat_data.get('skills', []):
            if skill.get('repository') == 'claude-skills':
                existing_skills.add(skill['name'])

    new_skills = []
    for skill_file in skill_files:
        skill_name = skill_file.parent.name
        if skill_name not in existing_skills:
            new_skills.append(skill_name)

    if new_skills:
        print(f"\nNew skills found (not in registry):")
        for name in sorted(new_skills):
            print(f"  - {name}")
        print("\nTo add these, manually edit skills-registry.yaml")
    else:
        print("\nRegistry is up to date with local skills.")


def cmd_add_repo(args, registry: dict) -> None:
    """Add a new external repository to the registry."""
    url = args.url

    # Extract repo name from URL
    match = re.search(r'github\.com[/:]([^/]+)/([^/\.]+)', url)
    if not match:
        print(f"Error: Could not parse GitHub URL: {url}")
        return

    owner, repo_name = match.groups()
    repo_id = repo_name.lower()

    if repo_id in registry.get('repositories', {}):
        print(f"Repository '{repo_id}' already exists in the registry.")
        return

    print(f"\nAdding repository: {owner}/{repo_name}")
    print(f"Repository ID: {repo_id}")
    print(f"\nTo complete the setup:")
    print(f"1. Manually edit skills-registry.yaml")
    print(f"2. Add the repository under 'repositories:'")
    print(f"3. Add skills from that repo under 'categories:'")
    print(f"\nExample entry:")
    print(f"""
  {repo_id}:
    url: {url}
    local_path: null
    description: [Add description]
    is_local: false
    skills_path: skills/  # Adjust based on repo structure
""")


def main():
    parser = argparse.ArgumentParser(
        description="Skills Registry Manager - Manage multi-repository skills index",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    subparsers = parser.add_subparsers(dest='command', help='Commands')

    # list command
    list_parser = subparsers.add_parser('list', help='List all skills')
    list_parser.add_argument('--repo', '-r', help='Filter by repository')
    list_parser.add_argument('--category', '-c', help='Filter by category')

    # search command
    search_parser = subparsers.add_parser('search', help='Search skills')
    search_parser.add_argument('query', help='Search query')

    # categories command
    subparsers.add_parser('categories', help='List all categories')

    # repos command
    subparsers.add_parser('repos', help='List all repositories')

    # info command
    info_parser = subparsers.add_parser('info', help='Get skill details')
    info_parser.add_argument('skill_name', help='Skill name')

    # scan command
    subparsers.add_parser('scan', help='Scan local repo for new skills')

    # add-repo command
    add_repo_parser = subparsers.add_parser('add-repo', help='Add external repository')
    add_repo_parser.add_argument('url', help='GitHub repository URL')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    registry = load_registry()

    if '_raw' in registry:
        print("Warning: PyYAML not available. Limited functionality.")
        print(registry['_raw'][:500] + "...")
        sys.exit(1)

    commands = {
        'list': cmd_list,
        'search': cmd_search,
        'categories': cmd_categories,
        'repos': cmd_repos,
        'info': cmd_info,
        'scan': cmd_scan,
        'add-repo': cmd_add_repo,
    }

    commands[args.command](args, registry)


if __name__ == '__main__':
    main()
