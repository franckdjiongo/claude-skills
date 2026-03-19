# Prettier and EditorConfig

## Table of contents

- Formatting strategy
- Minimal Prettier config
- `.prettierignore`
- `.editorconfig`
- Optional Biome note

## Formatting strategy

Keep formatting separate from linting.

Use:
- Prettier for formatting
- `eslint-config-prettier` to turn off conflicting ESLint formatting rules

Do not duplicate style enforcement in ESLint unless the team explicitly wants that.

## Minimal Prettier config

Prefer a small config over a giant taste-driven one.

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all"
}
```

If the repo already has a clear style convention, preserve it.

## `.prettierignore`

```text
dist
coverage
node_modules
*.min.js
```

Do not over-ignore. Keep it focused on generated output and vendor directories.

## `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

This is enough for most repos.

## Optional Biome note

If the user explicitly wants a single-tool formatter/linter path, mention Biome as an alternative. Do not silently replace ESLint + Prettier with Biome during a normal Vite/React audit.
