#!/usr/bin/env python3
"""
Agent Definition Validator

Validates Claude Code sub-agent definitions against best practices
and common anti-patterns from the comprehensive reference guide.
"""

import sys
import yaml
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

class AgentValidator:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.issues = []
        self.warnings = []
        self.suggestions = []
        
    def validate(self) -> Tuple[List[str], List[str], List[str]]:
        """Run all validation checks."""
        content = self.filepath.read_text()
        
        # Split frontmatter and body
        if not content.startswith('---'):
            self.issues.append("Missing YAML frontmatter (must start with ---)")
            return self.issues, self.warnings, self.suggestions
        
        parts = content.split('---', 2)
        if len(parts) < 3:
            self.issues.append("Invalid YAML frontmatter format")
            return self.issues, self.warnings, self.suggestions
        
        try:
            frontmatter = yaml.safe_load(parts[1])
        except yaml.YAMLError as e:
            self.issues.append(f"YAML parsing error: {e}")
            return self.issues, self.warnings, self.suggestions
        
        body = parts[2].strip()
        
        # Run validation checks
        self._validate_required_fields(frontmatter)
        self._validate_name(frontmatter)
        self._validate_description(frontmatter)
        self._validate_mode(frontmatter)
        self._validate_tools(frontmatter)
        self._validate_permissions(frontmatter)
        self._validate_model(frontmatter)
        self._validate_body(body)
        
        return self.issues, self.warnings, self.suggestions
    
    def _validate_required_fields(self, fm: Dict):
        """Check required YAML fields."""
        required = ['name', 'description', 'mode']
        for field in required:
            if field not in fm:
                self.issues.append(f"Missing required field: {field}")
    
    def _validate_name(self, fm: Dict):
        """Validate agent name follows conventions."""
        if 'name' not in fm:
            return
        
        name = fm['name']
        if not isinstance(name, str):
            self.issues.append("'name' must be a string")
            return
        
        if not all(c.islower() or c in "-_" or c.isdigit() for c in name):
            self.issues.append("'name' must be lowercase with hyphens/underscores only")
        
        if len(name) < 3:
            self.warnings.append("'name' is very short - consider a more descriptive name")
        
        # Check for common collision names
        common_names = ['code-reviewer', 'debugger', 'test-runner', 'analyzer']
        if name in common_names:
            self.warnings.append(
                f"Name '{name}' is common and may collide with existing agents. "
                "Consider a more specific name (e.g., 'python-code-reviewer')"
            )
    
    def _validate_description(self, fm: Dict):
        """Validate description completeness and quality."""
        if 'description' not in fm:
            return
        
        desc = fm['description']
        if not isinstance(desc, str):
            self.issues.append("'description' must be a string")
            return
        
        if len(desc) < 50:
            self.warnings.append(
                "'description' is very short. Include: purpose, capabilities, "
                "and when to use (trigger phrases for automatic delegation)"
            )
        
        # Check for proactive trigger phrases
        triggers = [
            'use proactively', 'use after', 'use when', 'use for',
            'must be used', 'automatically', 'trigger'
        ]
        has_trigger = any(phrase in desc.lower() for phrase in triggers)
        if not has_trigger:
            self.suggestions.append(
                "Consider adding proactive trigger phrases to description "
                "(e.g., 'Use proactively after code changes') to enable automatic delegation"
            )
    
    def _validate_mode(self, fm: Dict):
        """Validate mode field."""
        if 'mode' not in fm:
            return
        
        if fm['mode'] != 'subagent':
            self.issues.append("'mode' must be 'subagent'")
    
    def _validate_tools(self, fm: Dict):
        """Validate tools configuration."""
        if 'tools' not in fm:
            self.suggestions.append(
                "No tools specified - explicitly list required tools for better security. "
                "Omitting tools inherits from orchestrator (less secure)"
            )
            return
        
        tools = fm['tools']
        if not isinstance(tools, (list, dict)):
            self.issues.append("'tools' must be a list or dict")
            return
        
        valid_tools = [
            'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 
            'TodoWrite', 'Git', 'Search'
        ]
        
        tool_list = tools if isinstance(tools, list) else tools.keys()
        
        # Check for unknown tools
        for tool in tool_list:
            if tool not in valid_tools:
                self.warnings.append(f"Unknown tool: {tool} (may be MCP or custom tool)")
        
        # Security checks
        dangerous_tools = {'Edit', 'Write', 'Bash'}
        has_dangerous = any(tool in dangerous_tools for tool in tool_list)
        
        if has_dangerous and 'permissions' not in fm:
            self.warnings.append(
                f"Agent has destructive tools ({', '.join(dangerous_tools & set(tool_list))}) "
                "but no permissions block - consider adding explicit permissions (ask/deny defaults)"
            )
    
    def _validate_permissions(self, fm: Dict):
        """Validate permissions configuration."""
        if 'permissions' not in fm:
            return
        
        perms = fm['permissions']
        if not isinstance(perms, dict):
            self.issues.append("'permissions' must be a dict")
            return
        
        valid_values = {'ask', 'allow', 'deny'}
        
        for key, value in perms.items():
            if isinstance(value, dict):
                # Bash allow-list pattern
                for subkey, subval in value.items():
                    if subval not in valid_values:
                        self.warnings.append(
                            f"permissions.{key}.{subkey} has value '{subval}' "
                            f"(expected: {', '.join(valid_values)})"
                        )
            elif value not in valid_values:
                self.warnings.append(
                    f"permissions.{key} has value '{value}' "
                    f"(expected: {', '.join(valid_values)})"
                )
        
        # Check for overly permissive settings
        if perms.get('bash') == 'allow':
            self.warnings.append(
                "permissions.bash is 'allow' - this is dangerous. "
                "Consider allow-listing specific commands instead"
            )
        
        if perms.get('edit') == 'allow' or perms.get('write') == 'allow':
            self.suggestions.append(
                "Destructive operations (edit/write) are set to 'allow'. "
                "Consider 'ask' for human-in-the-loop confirmation"
            )
    
    def _validate_model(self, fm: Dict):
        """Validate model selection."""
        if 'model' not in fm:
            return
        
        valid_models = ['inherit', 'sonnet', 'haiku', 'opus']
        model = fm['model']
        
        if model not in valid_models and not model.startswith('anthropic/'):
            self.warnings.append(
                f"model '{model}' may be invalid. "
                f"Valid values: {', '.join(valid_models)} or anthropic/... IDs"
            )
    
    def _validate_body(self, body: str):
        """Validate system prompt body."""
        if len(body) < 100:
            self.warnings.append("System prompt is very short - provide detailed instructions")
        
        if len(body.split('\n')) > 500:
            self.warnings.append(
                "System prompt is very long (>500 lines). "
                "Consider factoring reusable content into Agent Skills"
            )
        
        # Check for step-by-step instructions
        if not any(marker in body.lower() for marker in ['when invoked:', 'steps:', '1.', '2.']):
            self.suggestions.append(
                "Consider adding explicit step-by-step instructions "
                "(e.g., 'When invoked: 1. ... 2. ... 3. ...')"
            )
        
        # Check for output format specification
        if not any(marker in body.lower() for marker in ['output:', 'format:', 'report:', 'provide:']):
            self.suggestions.append(
                "Consider specifying expected output format or reporting structure"
            )

def main():
    parser = argparse.ArgumentParser(
        description="Validate Claude Code sub-agent definitions"
    )
    parser.add_argument("filepath", type=Path, help="Path to agent .md file")
    parser.add_argument(
        "--strict", "-s",
        action="store_true",
        help="Treat warnings as errors"
    )
    
    args = parser.parse_args()
    
    if not args.filepath.exists():
        print(f"❌ Error: File not found: {args.filepath}")
        sys.exit(1)
    
    validator = AgentValidator(args.filepath)
    issues, warnings, suggestions = validator.validate()
    
    # Print results
    print(f"\n{'='*60}")
    print(f"Validation Results: {args.filepath.name}")
    print(f"{'='*60}\n")
    
    if issues:
        print("❌ CRITICAL ISSUES (must fix):")
        for issue in issues:
            print(f"  - {issue}")
        print()
    
    if warnings:
        print("⚠️  WARNINGS (should address):")
        for warning in warnings:
            print(f"  - {warning}")
        print()
    
    if suggestions:
        print("💡 SUGGESTIONS (consider):")
        for suggestion in suggestions:
            print(f"  - {suggestion}")
        print()
    
    # Exit status
    if issues:
        print("❌ Validation failed - fix critical issues before deployment")
        sys.exit(1)
    elif warnings and args.strict:
        print("❌ Validation failed - warnings present (strict mode)")
        sys.exit(1)
    elif warnings:
        print("⚠️  Validation passed with warnings - review before deployment")
        sys.exit(0)
    else:
        print("✅ Validation passed - agent definition looks good!")
        sys.exit(0)

if __name__ == "__main__":
    main()
