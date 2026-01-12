#!/usr/bin/env python3
"""
Create multiple git worktrees for parallel Power Automate flow development.

This script automates the creation of isolated worktrees, each with its own branch,
for parallel development with multiple Claude Code instances.
"""

import argparse
import subprocess
import sys
from pathlib import Path
from typing import List, Tuple


def run_command(cmd: List[str], cwd: Path = None) -> Tuple[int, str, str]:
    """Execute a shell command and return status, stdout, stderr."""
    result = subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True
    )
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def get_current_branch() -> str:
    """Get the current git branch name."""
    returncode, stdout, stderr = run_command(['git', 'branch', '--show-current'])
    if returncode != 0:
        print(f"Error getting current branch: {stderr}")
        sys.exit(1)
    return stdout


def validate_git_repo() -> Path:
    """Validate we're in a git repository and return repo root."""
    returncode, stdout, _ = run_command(['git', 'rev-parse', '--show-toplevel'])
    if returncode != 0:
        print("Error: Not in a git repository")
        sys.exit(1)
    return Path(stdout)


def create_worktree(
    repo_root: Path,
    flow_name: str,
    base_branch: str,
    prefix: str = "flow"
) -> Tuple[bool, str]:
    """
    Create a worktree for a Power Automate flow.
    
    Args:
        repo_root: Root directory of the git repository
        flow_name: Name/identifier for the flow
        base_branch: Branch to base the new worktree on
        prefix: Prefix for branch names (default: "flow")
    
    Returns:
        Tuple of (success: bool, message: str)
    """
    # Sanitize flow name for branch/directory naming
    safe_name = flow_name.lower().replace(' ', '-').replace('_', '-')
    
    # Create branch name
    branch_name = f"{prefix}/{safe_name}"
    
    # Create worktree directory path (sibling to main repo)
    worktree_path = repo_root.parent / f"{repo_root.name}-{safe_name}"
    
    # Check if worktree already exists
    if worktree_path.exists():
        return False, f"Worktree directory already exists: {worktree_path}"
    
    # Create the worktree
    cmd = ['git', 'worktree', 'add', str(worktree_path), '-b', branch_name, base_branch]
    returncode, stdout, stderr = run_command(cmd, cwd=repo_root)
    
    if returncode != 0:
        return False, f"Failed to create worktree: {stderr}"
    
    return True, str(worktree_path)


def copy_env_files(repo_root: Path, worktree_path: Path) -> None:
    """Copy environment files that aren't in version control."""
    env_files = ['.env', '.envrc', '.env.local']
    
    for env_file in env_files:
        source = repo_root / env_file
        if source.exists():
            dest = worktree_path / env_file
            try:
                import shutil
                shutil.copy2(source, dest)
                print(f"  ✓ Copied {env_file}")
            except Exception as e:
                print(f"  ! Warning: Could not copy {env_file}: {e}")


def create_todo_file(worktree_path: Path, flow_name: str, description: str = None) -> None:
    """Create a .llm/todo.md file for the worktree."""
    llm_dir = worktree_path / '.llm'
    llm_dir.mkdir(exist_ok=True)
    
    todo_content = f"# TODO: {flow_name}\n\n"
    if description:
        todo_content += f"{description}\n\n"
    todo_content += "## Tasks\n- [ ] Build Power Automate flow\n- [ ] Validate flow\n- [ ] Test flow\n"
    
    todo_file = llm_dir / 'todo.md'
    todo_file.write_text(todo_content)
    print(f"  ✓ Created .llm/todo.md")


def main():
    parser = argparse.ArgumentParser(
        description='Create multiple git worktrees for parallel Power Automate flow development'
    )
    parser.add_argument(
        'flows',
        nargs='+',
        help='Flow names/identifiers (e.g., "approval-flow" "data-sync" "notification")'
    )
    parser.add_argument(
        '--base',
        default=None,
        help='Base branch for worktrees (default: current branch)'
    )
    parser.add_argument(
        '--prefix',
        default='flow',
        help='Prefix for branch names (default: "flow")'
    )
    parser.add_argument(
        '--no-env',
        action='store_true',
        help='Skip copying environment files'
    )
    parser.add_argument(
        '--no-todo',
        action='store_true',
        help='Skip creating .llm/todo.md files'
    )
    
    args = parser.parse_args()
    
    # Validate we're in a git repository
    repo_root = validate_git_repo()
    print(f"📁 Repository: {repo_root}")
    
    # Get base branch
    base_branch = args.base if args.base else get_current_branch()
    print(f"🌿 Base branch: {base_branch}")
    print()
    
    # Create worktrees
    success_count = 0
    failed_count = 0
    
    for flow_name in args.flows:
        print(f"Creating worktree for: {flow_name}")
        
        success, result = create_worktree(repo_root, flow_name, base_branch, args.prefix)
        
        if success:
            worktree_path = Path(result)
            print(f"  ✓ Worktree created: {worktree_path}")
            
            # Copy environment files
            if not args.no_env:
                copy_env_files(repo_root, worktree_path)
            
            # Create todo file
            if not args.no_todo:
                create_todo_file(worktree_path, flow_name)
            
            success_count += 1
        else:
            print(f"  ✗ {result}")
            failed_count += 1
        
        print()
    
    # Summary
    print("=" * 60)
    print(f"✅ Successfully created: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print()
    
    if success_count > 0:
        print("Next steps:")
        print("1. Open a new terminal tab/window for each worktree")
        print("2. Navigate to the worktree directory")
        print("3. Run 'claude' to start Claude Code")
        print()
        print("Example:")
        first_flow = args.flows[0]
        safe_name = first_flow.lower().replace(' ', '-').replace('_', '-')
        print(f"  cd {repo_root.parent}/{repo_root.name}-{safe_name}")
        print("  claude")


if __name__ == '__main__':
    main()
